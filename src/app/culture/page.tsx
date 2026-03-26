"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { getLanguage } from "@/lib/config/language-registry";

interface CultureCard {
  id: string;
  type: "do" | "dont";
  title: string;
  description: string;
  category: string;
  phrase: { text: string; english: string; pronunciation: string } | null;
}

const categoryInfo: Record<string, { label: string; icon: string }> = {
  dining: { label: "Dining", icon: "🍽️" },
  greetings: { label: "Greetings", icon: "👋" },
  transport: { label: "Transport", icon: "🚇" },
  tipping: { label: "Tipping", icon: "💰" },
  dress: { label: "Dress Code", icon: "👔" },
  social: { label: "Social", icon: "🗣️" },
  safety: { label: "Safety", icon: "🛡️" },
  festivals: { label: "Festivals", icon: "🎉" },
};

export default function CulturePage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  const [cards, setCards] = useState<CultureCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "do" | "dont">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !activeTrip) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/culture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: activeTrip.destinationCity,
            country: activeTrip.destinationCountry,
            language,
            languageName: langConfig.name,
            holidayDate: activeTrip.holidayDate,
          }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setCards(data.cards || []);
      } catch {
        setError("Failed to load cultural tips.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const speakPhrase = async (text: string, id: string) => {
    setPlayingId(id);
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
      audio.onended = () => setPlayingId(null);
      audio.play();
    } catch {
      setPlayingId(null);
    }
  };

  const filteredCards = cards.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    return true;
  });

  const categories = [...new Set(cards.map((c) => c.category))];

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
        <div>
          <h1 className="text-lg font-bold">
            {langConfig.flag} Cultural Guide
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Dos & Don&apos;ts for {activeTrip?.destinationCity}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-12 h-12 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="font-medium">Learning local customs...</p>
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

      {cards.length > 0 && (
        <>
          {/* Do/Don't filter */}
          <div className="px-4 pt-4 flex gap-2">
            {(["all", "do", "dont"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  filter === f
                    ? f === "do"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : f === "dont"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-surface-light)]"
                }`}
              >
                {f === "all" ? "All" : f === "do" ? "Do's" : "Don'ts"}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                  : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const info = categoryInfo[cat] || { label: cat, icon: "📌" };
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {info.icon} {info.label}
                </button>
              );
            })}
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {filteredCards.map((card) => {
              const catInfo = categoryInfo[card.category] || {
                label: card.category,
                icon: "📌",
              };
              return (
                <div
                  key={card.id}
                  className={`bg-[var(--color-surface)] rounded-xl p-4 border-l-4 border border-[var(--color-surface-light)] ${
                    card.type === "do"
                      ? "border-l-green-500"
                      : "border-l-red-500"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {card.type === "do" ? "✅" : "❌"}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-[var(--color-surface-light)] px-2 py-0.5 rounded-full">
                          {catInfo.icon} {catInfo.label}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            card.type === "do"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {card.type === "do" ? "DO" : "DON'T"}
                        </span>
                      </div>
                      <h3 className="font-semibold">{card.title}</h3>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {card.description}
                      </p>
                      {card.phrase && (
                        <div className="mt-3 bg-[var(--color-bg)] rounded-lg p-3">
                          <p className="text-sm font-medium text-[var(--color-primary)]">
                            {card.phrase.text}
                          </p>
                          <p className="text-xs mt-0.5">{card.phrase.english}</p>
                          <p className="text-xs text-[var(--color-accent)] italic">
                            {card.phrase.pronunciation}
                          </p>
                          <button
                            onClick={() =>
                              speakPhrase(card.phrase!.text, card.id)
                            }
                            disabled={playingId === card.id}
                            className="mt-2 flex items-center gap-1 text-xs text-[var(--color-primary)] cursor-pointer hover:underline disabled:opacity-50"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                            </svg>
                            {playingId === card.id ? "Playing..." : "Hear it"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredCards.length === 0 && (
              <p className="text-center text-[var(--color-text-muted)] py-8">
                No cards match this filter
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
