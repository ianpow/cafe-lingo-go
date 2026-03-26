"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { getLanguage } from "@/lib/config/language-registry";

interface PassportPhrase {
  id: string;
  phrase: string;
  english: string;
  pronunciation: string;
  category: string;
  importance: string;
  tips: string;
}

const categoryLabels: Record<string, { label: string; icon: string }> = {
  emergency: { label: "Emergency", icon: "🆘" },
  health: { label: "Health", icon: "🏥" },
  food: { label: "Food & Dietary", icon: "🍽️" },
  directions: { label: "Directions", icon: "🗺️" },
  essential: { label: "Essential", icon: "💬" },
};

export default function PassportPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  const [phrases, setPhrases] = useState<PassportPhrase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stamped, setStamped] = useState<Set<string>>(new Set());
  const [activePhraseId, setActivePhraseId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!profile || !activeTrip) return;

    // Load stamped state from localStorage
    const saved = localStorage.getItem(`passport-stamped-${activeTrip.id}`);
    if (saved) setStamped(new Set(JSON.parse(saved)));

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/passport", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: activeTrip.destinationCity,
            country: activeTrip.destinationCountry,
            language,
            languageName: langConfig.name,
            foodPreferences: activeTrip.foodPreferences || [],
          }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setPhrases(data.phrases || []);
      } catch {
        setError("Failed to generate pronunciation passport.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const saveStamped = useCallback(
    (newStamped: Set<string>) => {
      setStamped(newStamped);
      if (activeTrip) {
        localStorage.setItem(
          `passport-stamped-${activeTrip.id}`,
          JSON.stringify([...newStamped])
        );
      }
    },
    [activeTrip]
  );

  const speakPhrase = async (phrase: string, id: string) => {
    setPlayingId(id);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: phrase,
          language,
          gender: profile?.avatarGender || "female",
        }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
      audio.onended = () => setPlayingId(null);
      audio.play();
    } catch {
      setPlayingId(null);
    }
  };

  const startRecording = async (phraseId: string) => {
    setActivePhraseId(phraseId);
    setPronunciationScore(null);
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
  };

  const stopAndScore = async () => {
    const recorder = recorderRef.current;
    if (!recorder || !activePhraseId) return;
    setIsRecording(false);
    setIsProcessing(true);

    const phrase = phrases.find((p) => p.id === activePhraseId);
    if (!phrase) return;

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    try {
      // Use STT to transcribe what user said
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("language", language);

      const sttRes = await fetch("/api/stt", { method: "POST", body: formData });
      const sttData = await sttRes.json();
      const spoken = (sttData.text || "").toLowerCase().trim();
      const target = phrase.phrase.toLowerCase().trim();

      // Simple similarity score
      const score = calculateSimilarity(spoken, target);
      setPronunciationScore(score);

      // Stamp if score is good enough
      if (score >= 70) {
        const newStamped = new Set(stamped);
        newStamped.add(activePhraseId);
        saveStamped(newStamped);
      }
    } catch {
      setPronunciationScore(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const stampedCount = stamped.size;
  const totalCount = phrases.length;
  const progressPercent =
    totalCount > 0 ? Math.round((stampedCount / totalCount) * 100) : 0;

  // Group by category
  const grouped = phrases.reduce<Record<string, PassportPhrase[]>>((acc, p) => {
    const cat = p.category || "essential";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

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
        <div className="flex-1">
          <h1 className="text-lg font-bold">Pronunciation Passport</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Must-know phrases for {activeTrip?.destinationCity}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-12 h-12 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="font-medium">Generating your passport phrases...</p>
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--color-primary)] rounded-lg text-white cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {phrases.length > 0 && (
        <>
          {/* Progress bar */}
          <div className="px-4 pt-4">
            <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {stampedCount}/{totalCount} phrases stamped
                </span>
                <span className="text-sm font-bold text-[var(--color-primary)]">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-3 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {progressPercent === 100 && (
                <p className="text-sm text-[var(--color-primary)] font-medium mt-2 text-center">
                  Passport complete! You&apos;re ready for {activeTrip?.destinationCity}!
                </p>
              )}
            </div>
          </div>

          {/* Phrases grouped by category */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {Object.entries(grouped).map(([cat, catPhrases]) => {
              const info = categoryLabels[cat] || {
                label: cat,
                icon: "📌",
              };
              return (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                    {info.icon} {info.label}
                  </h3>
                  <div className="space-y-3">
                    {catPhrases.map((phrase) => {
                      const isStamped = stamped.has(phrase.id);
                      const isActive = activePhraseId === phrase.id;
                      return (
                        <div
                          key={phrase.id}
                          className={`bg-[var(--color-surface)] rounded-xl p-4 border transition-colors ${
                            isStamped
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                              : "border-[var(--color-surface-light)]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5 text-lg">
                              {isStamped ? "✅" : "⬜"}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-[var(--color-primary)]">
                                {phrase.phrase}
                              </p>
                              <p className="text-sm">{phrase.english}</p>
                              <p className="text-xs text-[var(--color-accent)] italic mt-1">
                                {phrase.pronunciation}
                              </p>
                              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                {phrase.importance}
                              </p>
                              {phrase.tips && (
                                <p className="text-xs text-[var(--color-secondary)] mt-1">
                                  Tip: {phrase.tips}
                                </p>
                              )}

                              {/* Score display */}
                              {isActive && pronunciationScore !== null && (
                                <div
                                  className={`mt-2 px-3 py-2 rounded-lg text-sm font-medium ${
                                    pronunciationScore >= 70
                                      ? "bg-green-500/10 text-green-400"
                                      : pronunciationScore >= 40
                                      ? "bg-yellow-500/10 text-yellow-400"
                                      : "bg-red-500/10 text-red-400"
                                  }`}
                                >
                                  {pronunciationScore >= 70
                                    ? `Great! ${pronunciationScore}% match — Stamped!`
                                    : pronunciationScore >= 40
                                    ? `Getting there! ${pronunciationScore}% — try again`
                                    : `Keep practising! ${pronunciationScore}% — listen and try again`}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => speakPhrase(phrase.phrase, phrase.id)}
                                  disabled={playingId === phrase.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg cursor-pointer hover:bg-[var(--color-primary)]/20 disabled:opacity-50"
                                >
                                  {playingId === phrase.id ? (
                                    <div className="w-3 h-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                                    </svg>
                                  )}
                                  Listen
                                </button>
                                {isRecording && isActive ? (
                                  <button
                                    onClick={stopAndScore}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg cursor-pointer animate-pulse"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <rect
                                        x="6"
                                        y="6"
                                        width="12"
                                        height="12"
                                        rx="2"
                                      />
                                    </svg>
                                    Stop
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => startRecording(phrase.id)}
                                    disabled={isProcessing || isRecording}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--color-surface-light)] text-[var(--color-text)] rounded-lg cursor-pointer hover:bg-[var(--color-primary)]/10 disabled:opacity-50"
                                  >
                                    {isProcessing && isActive ? (
                                      <div className="w-3 h-3 border-2 border-[var(--color-text)] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                      >
                                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                                      </svg>
                                    )}
                                    Say it
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Simple word-level similarity between two strings */
function calculateSimilarity(spoken: string, target: string): number {
  const normalize = (s: string) =>
    s
      .replace(/[¿¡.,!?;:'"]/g, "")
      .toLowerCase()
      .trim();
  const spokenWords = normalize(spoken).split(/\s+/);
  const targetWords = normalize(target).split(/\s+/);
  if (targetWords.length === 0) return 0;
  let matches = 0;
  for (const tw of targetWords) {
    if (spokenWords.some((sw) => sw === tw || levenshtein(sw, tw) <= 1)) {
      matches++;
    }
  }
  return Math.round((matches / targetWords.length) * 100);
}

function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
