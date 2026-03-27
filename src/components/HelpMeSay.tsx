"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { getLanguage } from "@/lib/config/language-registry";

// Pages where the floating button overlaps interactive controls
const HIDDEN_ON_PAGES = ["/lesson", "/review", "/drill"];

export function HelpMeSay() {
  const pathname = usePathname();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<{
    translation: string;
    pronunciation: string | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  // Don't show if no profile, no active trip, or on pages with bottom controls
  if (!profile || !activeTrip) return null;
  if (HIDDEN_ON_PAGES.some((p) => pathname?.startsWith(p))) return null;

  const handleOpen = () => {
    setIsOpen(true);
    setResult(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
    setInput("");
  };

  const handleTranslate = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.trim(),
          from: "en",
          to: language,
          fromName: "English",
          toName: langConfig.name,
        }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setResult({
        translation: data.translation,
        pronunciation: data.pronunciation,
      });
    } catch {
      setResult({ translation: "Translation failed. Try again.", pronunciation: null });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async (text: string) => {
    setIsPlaying(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language,
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

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-50"
          title="Help Me Say..."
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-surface-light)] shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-surface-light)]">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <h3 className="font-semibold">Help Me Say...</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Input */}
            <div className="p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                Type what you want to say in English → get {langConfig.name} instantly
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
                  placeholder="e.g. Where is the nearest pharmacy?"
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={handleTranslate}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-3 bg-[var(--color-primary)] rounded-lg text-white font-medium cursor-pointer disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Go"
                  )}
                </button>
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className="px-4 pb-4">
                <div className="bg-[var(--color-bg)] rounded-xl p-4 border border-[var(--color-primary)]/30">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">
                    {langConfig.flag} {langConfig.name}
                  </p>
                  <p className="text-xl font-semibold text-[var(--color-primary)]">
                    {result.translation}
                  </p>
                  {result.pronunciation && (
                    <p className="text-sm italic text-[var(--color-accent)] mt-1">
                      {result.pronunciation}
                    </p>
                  )}
                  <button
                    onClick={() => handleSpeak(result.translation)}
                    disabled={isPlaying}
                    className="mt-3 flex items-center gap-2 text-sm text-[var(--color-primary)] cursor-pointer hover:underline disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                    {isPlaying ? "Playing..." : "Hear it spoken"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
