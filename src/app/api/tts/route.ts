import { NextRequest, NextResponse } from "next/server";
import { getVoiceId } from "@/lib/config/language-registry";
import type { LanguageCode } from "@/lib/config/language-registry";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

interface TTSRequest {
  text: string;
  voiceId?: string;
  language?: string;
  gender?: "male" | "female";
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const lang = (body.language || "es") as LanguageCode;
    const gender = body.gender || "female";
    const voiceId = body.voiceId || getVoiceId(lang, gender);
    const { text } = body;

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    // Use the with-timestamps endpoint for lip sync data
    const response = await fetch(
      `${ELEVENLABS_API_URL}/${voiceId}/with-timestamps`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs error:", errorText);
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Parse character-level alignment into word-level timing for TalkingHead
    const wordTiming = parseAlignmentToWords(
      text,
      data.alignment
    );

    return NextResponse.json({
      audioBase64: data.audio_base64,
      alignment: data.alignment || null,
      // Word-level timing for TalkingHead's speakAudio()
      words: wordTiming.words,
      wtimes: wordTiming.wtimes,
      wdurations: wordTiming.wdurations,
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}

interface WordTiming {
  words: string[];
  wtimes: number[];      // start times in ms
  wdurations: number[];  // durations in ms
}

function parseAlignmentToWords(
  text: string,
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null
): WordTiming {
  if (!alignment?.characters) {
    // Fallback: single word with estimated timing
    return {
      words: [text],
      wtimes: [0],
      wdurations: [1000],
    };
  }

  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;

  const words: string[] = [];
  const wtimes: number[] = [];
  const wdurations: number[] = [];

  let currentWord = "";
  let wordStart = -1;
  let wordEnd = 0;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const startTime = character_start_times_seconds[i];
    const endTime = character_end_times_seconds[i];

    if (char === " " || char === "\n" || char === "\t") {
      // End of word
      if (currentWord.length > 0) {
        words.push(currentWord);
        wtimes.push(Math.round(wordStart * 1000));
        wdurations.push(Math.round((wordEnd - wordStart) * 1000));
        currentWord = "";
        wordStart = -1;
      }
    } else {
      // Part of a word
      if (wordStart < 0) {
        wordStart = startTime;
      }
      wordEnd = endTime;
      currentWord += char;
    }
  }

  // Don't forget the last word
  if (currentWord.length > 0) {
    words.push(currentWord);
    wtimes.push(Math.round(wordStart * 1000));
    wdurations.push(Math.round((wordEnd - wordStart) * 1000));
  }

  return { words, wtimes, wdurations };
}
