"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { getLanguage } from "@/lib/config/language-registry";

interface TranslationResult {
  original: string;
  translation: string;
  pronunciation: string | null;
  literal: string | null;
  direction: "outgoing" | "incoming";
}

export default function TranslatePage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  const [direction, setDirection] = useState<"outgoing" | "incoming">("outgoing");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fromLang = direction === "outgoing" ? "en" : language;
  const toLang = direction === "outgoing" ? language : "en";
  const fromName = direction === "outgoing" ? "English" : langConfig.name;
  const toName = direction === "outgoing" ? langConfig.name : "English";

  const translate = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsProcessing(true);

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim(), from: fromLang, to: toLang, fromName, toName }),
        });

        if (!res.ok) throw new Error("Translation failed");
        const data = await res.json();

        const result: TranslationResult = {
          original: text.trim(),
          translation: data.translation,
          pronunciation: data.pronunciation,
          literal: data.literal,
          direction,
        };

        setHistory((prev) => [result, ...prev]);

        // Auto-speak the translation if translating TO the target language
        if (direction === "outgoing") {
          speakTranslation(data.translation);
        }
      } catch (err) {
        console.error("Translation error:", err);
      } finally {
        setIsProcessing(false);
        setTextInput("");
      }
    },
    [fromLang, toLang, fromName, toName, direction]
  );

  const speakTranslation = async (text: string) => {
    setIsPlaying(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: direction === "outgoing" ? language : "en",
          gender: profile?.avatarGender || "female",
        }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
      audio.onended = () => setIsPlaying(false);
      audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  const stopAndTranslate = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setIsRecording(false);
    setIsProcessing(true);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("language", fromLang === "en" ? "en" : fromLang);

      const sttRes = await fetch("/api/stt", { method: "POST", body: formData });
      const sttData = await sttRes.json();
      const transcription = sttData.text || "";

      if (transcription) {
        await translate(transcription);
      } else {
        setIsProcessing(false);
      }
    } catch {
      setIsProcessing(false);
    }
  }, [fromLang, translate]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Instant Translate</h1>
      </div>

      {/* Direction toggle */}
      <div className="px-4 pt-4">
        <button
          onClick={() => setDirection((d) => (d === "outgoing" ? "incoming" : "outgoing"))}
          className="w-full flex items-center justify-center gap-3 py-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-surface-light)] cursor-pointer hover:border-[var(--color-primary)] transition-colors"
        >
          <span className="text-sm font-medium">
            {direction === "outgoing" ? "🇬🇧 English" : `${langConfig.flag} ${langConfig.name}`}
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-primary)">
            <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
          </svg>
          <span className="text-sm font-medium">
            {direction === "outgoing" ? `${langConfig.flag} ${langConfig.name}` : "🇬🇧 English"}
          </span>
        </button>
        <p className="text-xs text-[var(--color-text-muted)] text-center mt-2">
          {direction === "outgoing"
            ? `Speak English → hear ${langConfig.name}`
            : `Hand phone to local → they speak ${langConfig.name} → you read English`}
        </p>
      </div>

      {/* Text input */}
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && translate(textInput)}
            placeholder={`Type in ${fromName}...`}
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <button
            onClick={() => translate(textInput)}
            disabled={!textInput.trim() || isProcessing}
            className="px-4 py-3 bg-[var(--color-primary)] rounded-lg text-white font-medium cursor-pointer disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Go
          </button>
        </div>
      </div>

      {/* Voice record button */}
      <div className="flex flex-col items-center py-6 gap-2">
        <button
          onClick={isRecording ? stopAndTranslate : startRecording}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all disabled:opacity-50 ${
            isRecording
              ? "bg-red-500 animate-pulse scale-110"
              : "bg-[var(--color-primary)] hover:scale-105"
          }`}
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              {isRecording ? (
                <rect x="6" y="6" width="12" height="12" rx="2" />
              ) : (
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              )}
            </svg>
          )}
        </button>
        <p className="text-xs text-[var(--color-text-muted)]">
          {isRecording ? "Tap to stop" : isProcessing ? "Translating..." : `Tap to speak ${fromName}`}
        </p>
      </div>

      {/* Translation history */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-3">
        {history.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[var(--color-text-muted)] text-sm">
              Speak or type to translate
            </p>
          </div>
        )}
        {history.map((item, i) => (
          <div
            key={i}
            className={`bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] ${
              item.direction === "incoming" ? "border-l-4 border-l-[var(--color-accent)]" : "border-l-4 border-l-[var(--color-primary)]"
            }`}
          >
            <p className="text-xs text-[var(--color-text-muted)] mb-1">
              {item.direction === "outgoing" ? `🇬🇧 → ${langConfig.flag}` : `${langConfig.flag} → 🇬🇧`}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mb-1">{item.original}</p>
            <p className="text-lg font-semibold">{item.translation}</p>
            {item.pronunciation && (
              <p className="text-sm text-[var(--color-primary)] italic mt-1">{item.pronunciation}</p>
            )}
            {item.literal && item.literal !== item.translation && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Literal: {item.literal}
              </p>
            )}
            <button
              onClick={() => speakTranslation(item.translation)}
              disabled={isPlaying}
              className="mt-2 flex items-center gap-1 text-xs text-[var(--color-primary)] cursor-pointer hover:underline disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
              Play
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
