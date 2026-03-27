import { NextRequest, NextResponse } from "next/server";
import type { PronunciationResult, WordScore } from "@/lib/types/pronunciation";
import { getLanguage } from "@/lib/config/language-registry";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, statSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

interface PronunciationRequest {
  audioBase64: string;
  referenceText: string;
  audioMimeType?: string;
  language?: string;
}

/**
 * Convert encoded audio (webm/opus, mp4, etc.) to 16kHz 16-bit mono WAV.
 * Returns the path to the WAV file on disk.
 */
function convertToWavFile(inputBuffer: Buffer, mimeType?: string): string {
  const id = randomUUID();
  const ext = mimeType?.includes("mp4") ? "mp4" : "webm";
  const inputPath = join(tmpdir(), `pron-input-${id}.${ext}`);
  const outputPath = join(tmpdir(), `pron-output-${id}.wav`);

  writeFileSync(inputPath, inputBuffer);

  try {
    execSync(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -sample_fmt s16 -acodec pcm_s16le "${outputPath}"`,
      { timeout: 10000, stdio: "pipe" }
    );
    console.log("[Pronunciation] ffmpeg converted to WAV 16kHz s16le");
  } finally {
    try { unlinkSync(inputPath); } catch { /* ignore */ }
  }

  const size = statSync(outputPath).size;
  console.log("[Pronunciation] WAV file size:", size, "bytes, duration ~", ((size - 44) / (16000 * 2)).toFixed(1) + "s");

  return outputPath;
}

export async function POST(request: NextRequest) {
  let wavPath: string | null = null;

  try {
    const body: PronunciationRequest = await request.json();
    const { audioBase64, referenceText, audioMimeType, language = "es" } = body;
    const azureLang = getLanguage(language).azureLocale;

    if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      return NextResponse.json(createMockResult(referenceText));
    }

    const rawAudioBuffer = Buffer.from(audioBase64, "base64");
    console.log("[Pronunciation] Input audio:", rawAudioBuffer.length, "bytes, mime:", audioMimeType);

    // Convert to WAV
    wavPath = convertToWavFile(rawAudioBuffer, audioMimeType);
    const wavBuffer = readFileSync(wavPath);

    // Use Azure REST API for pronunciation assessment
    const region = process.env.AZURE_SPEECH_REGION;
    const apiKey = process.env.AZURE_SPEECH_KEY;

    // Build pronunciation assessment config as JSON, then base64 encode it
    const pronConfig = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: true,
    };
    const pronConfigBase64 = Buffer.from(JSON.stringify(pronConfig)).toString("base64");

    const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${azureLang}&format=detailed`;

    console.log("[Pronunciation] Calling Azure REST API:", url);
    console.log("[Pronunciation] Reference text:", referenceText);
    console.log("[Pronunciation] WAV size being sent:", wavBuffer.length, "bytes");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey!,
        "Pronunciation-Assessment": pronConfigBase64,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
      },
      body: wavBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Pronunciation] Azure REST error:", response.status, errorText);
      return NextResponse.json(
        { error: "Azure pronunciation assessment failed", details: errorText },
        { status: response.status }
      );
    }

    const azureResult = await response.json();
    console.log("[Pronunciation] Azure REST response:", JSON.stringify(azureResult, null, 2));

    // Parse Azure REST response into our format
    const result = parseAzureRestResult(azureResult);
    console.log("[Pronunciation] Scores — overall:", result.overallScore,
      "accuracy:", result.accuracyScore,
      "fluency:", result.fluencyScore,
      "completeness:", result.completenessScore);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Pronunciation API error:", error);
    return NextResponse.json(
      { error: "Failed to assess pronunciation" },
      { status: 500 }
    );
  } finally {
    if (wavPath) {
      try { unlinkSync(wavPath); } catch { /* ignore */ }
    }
  }
}

/**
 * Apply a scoring curve to make Azure's lenient scores more discriminating.
 * Azure tends to give 85-100 for anything remotely correct, making it
 * nearly impossible to score below 95%. This curve stretches the meaningful
 * range so learners get more actionable feedback.
 *
 * Mapping (approximate):
 *   Azure 100 → 100  (perfect is still perfect)
 *   Azure 95  → 88
 *   Azure 90  → 76
 *   Azure 85  → 64
 *   Azure 80  → 52
 *   Azure 70  → 28
 *   Azure 60  → 4
 *   Azure <50 → 0
 */
function applyScoringCurve(rawScore: number): number {
  if (rawScore >= 100) return 100;
  if (rawScore <= 50) return 0;

  // Piecewise linear curve that spreads 70-100 across most of the display range
  // while compressing the already-bad 50-70 range
  if (rawScore >= 90) {
    // 90-100 → 76-100 (gentle curve at top)
    return Math.round(76 + ((rawScore - 90) / 10) * 24);
  } else if (rawScore >= 80) {
    // 80-90 → 52-76
    return Math.round(52 + ((rawScore - 80) / 10) * 24);
  } else if (rawScore >= 70) {
    // 70-80 → 28-52
    return Math.round(28 + ((rawScore - 70) / 10) * 24);
  } else {
    // 50-70 → 0-28
    return Math.round(((rawScore - 50) / 20) * 28);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAzureRestResult(azureResult: any): PronunciationResult {
  // Log all top-level keys for debugging
  console.log("[Pronunciation] Response keys:", Object.keys(azureResult));
  console.log("[Pronunciation] RecognitionStatus:", azureResult.RecognitionStatus);
  console.log("[Pronunciation] DisplayText:", azureResult.DisplayText);

  const nBest = azureResult.NBest?.[0];

  if (nBest) {
    console.log("[Pronunciation] NBest[0] keys:", Object.keys(nBest));
    if (nBest.PronunciationAssessment) {
      console.log("[Pronunciation] PronunciationAssessment:", JSON.stringify(nBest.PronunciationAssessment));
    } else {
      console.warn("[Pronunciation] No PronunciationAssessment at NBest level!");
    }
  } else {
    console.warn("[Pronunciation] No NBest in response!");
  }

  // Parse words first (they might exist even without top-level assessment)
  const words: WordScore[] = [];
  if (nBest?.Words) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const word of nBest.Words) {
      // REST API may put scores directly on word OR under PronunciationAssessment
      const pa = word.PronunciationAssessment || {};
      const rawWordAccuracy = pa.AccuracyScore ?? word.AccuracyScore ?? 0;
      words.push({
        word: word.Word || "",
        accuracyScore: applyScoringCurve(rawWordAccuracy),
        errorType: pa.ErrorType ?? word.ErrorType ?? "None",
        phonemes: word.Phonemes?.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => ({
            phoneme: p.Phoneme || "",
            accuracyScore: applyScoringCurve(p.PronunciationAssessment?.AccuracyScore ?? p.AccuracyScore ?? 0),
          })
        ),
      });
    }
  }

  // Try to get scores from top-level PronunciationAssessment (or directly on nBest)
  const assessment = nBest?.PronunciationAssessment;

  if (assessment) {
    const rawOverall = assessment.PronScore ?? assessment.PronunciationScore ?? assessment.AccuracyScore ?? 0;
    const rawAccuracy = assessment.AccuracyScore ?? 0;
    const rawFluency = assessment.FluencyScore ?? 0;
    const rawCompleteness = assessment.CompletenessScore ?? 0;
    console.log("[Pronunciation] Raw Azure scores — overall:", rawOverall, "accuracy:", rawAccuracy, "fluency:", rawFluency, "completeness:", rawCompleteness);
    return {
      overallScore: applyScoringCurve(rawOverall),
      accuracyScore: applyScoringCurve(rawAccuracy),
      fluencyScore: applyScoringCurve(rawFluency),
      completenessScore: applyScoringCurve(rawCompleteness),
      words,
    };
  }

  // Some API versions put AccuracyScore directly on NBest
  if (nBest?.AccuracyScore !== undefined) {
    return {
      overallScore: applyScoringCurve(nBest.PronScore ?? nBest.AccuracyScore ?? 0),
      accuracyScore: applyScoringCurve(nBest.AccuracyScore ?? 0),
      fluencyScore: applyScoringCurve(nBest.FluencyScore ?? 0),
      completenessScore: applyScoringCurve(nBest.CompletenessScore ?? 0),
      words,
    };
  }

  // Fallback: calculate scores from word-level data
  if (words.length > 0) {
    const avgAccuracy = words.reduce((sum, w) => sum + w.accuracyScore, 0) / words.length;
    console.log("[Pronunciation] Calculating from word scores, avgAccuracy:", avgAccuracy);
    return {
      overallScore: applyScoringCurve(Math.round(avgAccuracy)),
      accuracyScore: applyScoringCurve(Math.round(avgAccuracy)),
      fluencyScore: applyScoringCurve(Math.round(avgAccuracy * 0.9)),
      completenessScore: applyScoringCurve(100),
      words,
    };
  }

  console.warn("[Pronunciation] No usable data in response");
  return {
    overallScore: 0,
    accuracyScore: 0,
    fluencyScore: 0,
    completenessScore: 0,
    words: [],
  };
}

function createMockResult(referenceText: string): PronunciationResult {
  const words = referenceText.split(/\s+/).filter(Boolean);
  return {
    overallScore: 75,
    accuracyScore: 78,
    fluencyScore: 72,
    completenessScore: 80,
    words: words.map((word) => ({
      word,
      accuracyScore: 70 + Math.floor(Math.random() * 25),
      errorType: "None" as const,
    })),
  };
}
