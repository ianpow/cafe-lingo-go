"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLessonStore } from "@/lib/store/lesson-store";
import { AudioRecorder } from "@/lib/audio/recorder";
import {
  blobToBase64,
  playAudioFromBase64,
  createFormDataWithAudio,
} from "@/lib/audio/audio-utils";
import type { TalkingHeadAvatarHandle, SpeakAudioData } from "@/components/avatar/TalkingHeadAvatar";

// Re-export for backward compat
export type { SpeakAudioData };

export interface AlignmentData {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface ConversationFlowOptions {
  avatarRef: React.RefObject<TalkingHeadAvatarHandle | null>;
  gender?: "male" | "female";
}

function b64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Decode MP3/encoded audio to PCM Int16 ArrayBuffer using Web Audio API.
 * TalkingHead expects PCM 16-bit little-endian audio.
 * Returns { pcm, sampleRate } so we can tell TalkingHead the correct rate.
 */
async function decodeToPCM(base64Audio: string): Promise<{ pcm: ArrayBuffer; sampleRate: number }> {
  // Don't force a sample rate — let the browser decode at the native rate
  const audioContext = new AudioContext();

  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const encodedBuffer = b64ToArrayBuffer(base64Audio);
  const audioBuffer = await audioContext.decodeAudioData(encodedBuffer);

  const nativeSampleRate = audioBuffer.sampleRate;
  console.log("[Audio] Decoded: sampleRate =", nativeSampleRate, ", duration =", audioBuffer.duration.toFixed(2) + "s");

  // Convert float samples to Int16 PCM
  const channelData = audioBuffer.getChannelData(0); // mono
  const pcmBuffer = new ArrayBuffer(channelData.length * 2); // 2 bytes per sample
  const pcmView = new Int16Array(pcmBuffer);

  for (let i = 0; i < channelData.length; i++) {
    // Clamp to [-1, 1] and convert to Int16 range
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcmView[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  audioContext.close();
  return { pcm: pcmBuffer, sampleRate: nativeSampleRate };
}

/**
 * Estimate pronunciation score by comparing Whisper transcription
 * against the expected phrase. Not as accurate as Azure, but functional.
 */
function estimatePronunciationScore(
  transcription: string,
  expected: string,
  acceptableVariations: string[]
): {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: { word: string; accuracyScore: number; errorType: string }[];
} {
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s]/g, "") // remove punctuation
      .trim();

  const normalizedTranscription = normalize(transcription);
  const normalizedExpected = normalize(expected);

  // Check if it matches the expected phrase or any acceptable variation
  const allAcceptable = [expected, ...acceptableVariations].map(normalize);
  const exactMatch = allAcceptable.some((v) => normalizedTranscription === v);

  if (exactMatch) {
    const words = normalizedExpected.split(/\s+/).map((w) => ({
      word: w,
      accuracyScore: 95 + Math.floor(Math.random() * 5),
      errorType: "None",
    }));
    return { overallScore: 95, accuracyScore: 95, fluencyScore: 92, completenessScore: 100, words };
  }

  // Calculate word overlap
  const expectedWords = normalizedExpected.split(/\s+/);
  const spokenWords = normalizedTranscription.split(/\s+/);

  let matchedWords = 0;
  const wordScores = expectedWords.map((ew) => {
    const found = spokenWords.some((sw) => sw === ew || levenshteinDistance(sw, ew) <= 1);
    if (found) matchedWords++;
    return {
      word: ew,
      accuracyScore: found ? 80 + Math.floor(Math.random() * 15) : 20 + Math.floor(Math.random() * 20),
      errorType: found ? "None" : "Mispronunciation",
    };
  });

  const completeness = expectedWords.length > 0 ? (matchedWords / expectedWords.length) * 100 : 0;
  const accuracy = wordScores.reduce((sum, w) => sum + w.accuracyScore, 0) / wordScores.length;
  const overall = Math.round(accuracy * 0.5 + completeness * 0.4 + 50 * 0.1); // weighted

  return {
    overallScore: Math.min(100, Math.max(0, overall)),
    accuracyScore: Math.round(accuracy),
    fluencyScore: Math.round(overall * 0.9),
    completenessScore: Math.round(completeness),
    words: wordScores,
  };
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Ensure AudioContext is unlocked on first user gesture
let audioContextUnlocked = false;
function ensureAudioContext() {
  if (audioContextUnlocked) return;
  const ctx = new AudioContext();
  if (ctx.state === "suspended") {
    const unlock = () => {
      ctx.resume().then(() => {
        audioContextUnlocked = true;
        ctx.close();
        document.removeEventListener("click", unlock);
        document.removeEventListener("touchstart", unlock);
      });
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
  } else {
    audioContextUnlocked = true;
    ctx.close();
  }
}

export function useConversationFlow({ avatarRef, gender = "female" }: ConversationFlowOptions) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const store = useLessonStore();

  // Try to unlock AudioContext early
  useEffect(() => {
    ensureAudioContext();
  }, []);

  // Get language from current scenario
  const language = store.scenario?.language || "es";

  const speakAsAvatar = useCallback(
    async (text: string, textEn: string) => {
      store.setAvatarSpeaking(true);

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language, gender }),
        });

        if (!response.ok) throw new Error("TTS failed");
        const data = await response.json();

        store.addMessage({
          role: "avatar",
          content: text,
          translation: textEn,
        });

        // Try TalkingHead avatar first
        if (avatarRef.current && data.words && data.words.length > 0) {
          // Decode MP3 to PCM Int16 for TalkingHead
          const { pcm, sampleRate } = await decodeToPCM(data.audioBase64);

          const audioData: SpeakAudioData = {
            audio: [pcm],
            words: data.words,
            wtimes: data.wtimes,
            wdurations: data.wdurations,
            sampleRate,
            language,
          };

          // Wait for speech to finish before resolving
          await new Promise<void>((resolve) => {
            avatarRef.current!.speakAudio(audioData);

            // Calculate speech duration from word timings
            let duration = 2000; // fallback
            if (audioData.wtimes.length > 0 && audioData.wdurations.length > 0) {
              const lastWordEnd =
                audioData.wtimes[audioData.wtimes.length - 1] +
                audioData.wdurations[audioData.wdurations.length - 1];
              duration = lastWordEnd + 500; // add small buffer
            }

            setTimeout(() => {
              store.setAvatarSpeaking(false);
              resolve();
            }, duration);
          });
        } else {
          // Fallback: just play audio without avatar
          await playAudioFromBase64(data.audioBase64);
          store.setAvatarSpeaking(false);
        }
      } catch (error) {
        console.error("Avatar speech error:", error);
        // Still add the message even if TTS fails
        if (!store.conversationHistory.some(m => m.content === text)) {
          store.addMessage({
            role: "avatar",
            content: text,
            translation: textEn,
          });
        }
        store.setAvatarSpeaking(false);
      }
    },
    [store, avatarRef, language, gender]
  );

  const startAvatarTurn = useCallback(async () => {
    const turn = store.getCurrentTurn();
    if (!turn) return;
    await speakAsAvatar(turn.avatarLine, turn.avatarLineEn);
  }, [store, speakAsAvatar]);

  const startRecording = useCallback(async () => {
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      store.setRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, [store]);

  const stopRecordingAndProcess = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    store.setRecording(false);
    store.setProcessing(true);

    try {
      const audioBlob = await recorder.stop();
      recorderRef.current = null;

      const turn = store.getCurrentTurn();
      if (!turn) return;

      // Get transcription from Whisper
      const sttFormData = createFormDataWithAudio(audioBlob);
      sttFormData.append("language", language);
      const sttResult = await fetch("/api/stt", {
        method: "POST",
        body: sttFormData,
      }).then((r) => r.json());

      const transcription = sttResult.text || "";
      console.log("[Conversation] User said:", transcription);
      console.log("[Conversation] Expected:", turn.expectedUserPhrase);

      // Get pronunciation score — use Azure if available, otherwise estimate from transcription
      let pronResult;
      if (process.env.NEXT_PUBLIC_HAS_AZURE === "true") {
        pronResult = await fetch("/api/pronunciation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: await blobToBase64(audioBlob),
            referenceText: turn.expectedUserPhrase,
            audioMimeType: audioBlob.type,
            language,
          }),
        }).then((r) => r.json());
      } else {
        // Estimate score by comparing transcription to expected phrase
        pronResult = estimatePronunciationScore(transcription, turn.expectedUserPhrase, turn.acceptableVariations);
      }

      const overallScore = pronResult.overallScore ?? 0;
      console.log("[Conversation] Pronunciation score:", overallScore);

      // Add user message
      store.addMessage({
        role: "user",
        content: transcription,
        pronunciationScore: overallScore,
      });
      store.addPronunciationResult(pronResult);

      // Get Claude response
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: transcription,
          conversationHistory: store.conversationHistory,
          currentTurn: turn,
          scenarioContext: store.scenario?.description || "",
          pronunciationScore: overallScore,
          language,
        }),
      }).then((r) => r.json());

      if (chatResponse.correction) {
        store.addMessage({
          role: "system",
          content: chatResponse.correction,
        });
      }
      if (chatResponse.encouragement) {
        store.addMessage({
          role: "system",
          content: chatResponse.encouragement,
        });
      }

      // Avatar responds
      await speakAsAvatar(chatResponse.response, chatResponse.responseEn);

      // Advance or repeat — trust Claude's judgment primarily
      if (chatResponse.shouldAdvance) {
        store.advanceTurn();
      } else {
        store.repeatTurn();
      }
    } catch (error) {
      console.error("Processing error:", error);
      store.addMessage({
        role: "system",
        content: "Something went wrong. Please try again.",
      });
    } finally {
      store.setProcessing(false);
    }
  }, [store, speakAsAvatar, language]);

  const listenToExpectedPhrase = useCallback(async () => {
    const turn = store.getCurrentTurn();
    if (!turn || !turn.expectedUserPhrase) return;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: turn.expectedUserPhrase, language, gender }),
      });
      if (!response.ok) return;
      const data = await response.json();

      // Use avatar for listen too if available
      if (avatarRef.current && data.words && data.words.length > 0) {
        const { pcm, sampleRate } = await decodeToPCM(data.audioBase64);
        const audioData: SpeakAudioData = {
          audio: [pcm],
          words: data.words,
          wtimes: data.wtimes,
          wdurations: data.wdurations,
          sampleRate,
          language,
        };
        avatarRef.current.speakAudio(audioData);
      } else {
        await playAudioFromBase64(data.audioBase64);
      }
    } catch (error) {
      console.error("Listen error:", error);
    }
  }, [store, avatarRef, language, gender]);

  return {
    startAvatarTurn,
    startRecording,
    stopRecordingAndProcess,
    listenToExpectedPhrase,
  };
}
