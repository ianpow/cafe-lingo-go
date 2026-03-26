"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { getLanguage } from "@/lib/config/language-registry";

interface Phrase {
  phrase: string;
  english: string;
  pronunciation: string;
  context: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  phrases: Phrase[];
}

interface PhrasebookData {
  categories: Category[];
}

export default function PhrasebookPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  const [phrasebook, setPhrasebook] = useState<PhrasebookData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingPhrase, setPlayingPhrase] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !activeTrip) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/phrasebook", {
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
        if (!res.ok) throw new Error("Failed to generate phrasebook");
        const data = await res.json();
        setPhrasebook(data);
        if (data.categories?.length > 0) {
          setActiveCategory(data.categories[0].id);
        }
      } catch {
        setError("Failed to load phrasebook. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const speakPhrase = async (text: string) => {
    setPlayingPhrase(text);
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
      audio.onended = () => setPlayingPhrase(null);
      audio.play();
    } catch {
      setPlayingPhrase(null);
    }
  };

  // Filter phrases by search
  const getFilteredPhrases = (): { category: Category; phrases: Phrase[] }[] => {
    if (!phrasebook) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      const cat = phrasebook.categories.find((c) => c.id === activeCategory);
      return cat ? [{ category: cat, phrases: cat.phrases }] : [];
    }
    return phrasebook.categories
      .map((cat) => ({
        category: cat,
        phrases: cat.phrases.filter(
          (p) =>
            p.phrase.toLowerCase().includes(q) ||
            p.english.toLowerCase().includes(q) ||
            p.context.toLowerCase().includes(q)
        ),
      }))
      .filter((r) => r.phrases.length > 0);
  };

  const filteredResults = getFilteredPhrases();

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
            {langConfig.flag} Phrasebook
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Essential phrases for {activeTrip?.destinationCity}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-12 h-12 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="font-medium">Building your phrasebook...</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Personalised for {activeTrip?.destinationCity}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
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

      {phrasebook && (
        <>
          {/* Search bar */}
          <div className="px-4 pt-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phrases..."
                className="w-full bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Category pills (hidden when searching) */}
          {!searchQuery && (
            <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
              {phrasebook.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-surface-light)]"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Phrases */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {filteredResults.map(({ category, phrases }) => (
              <div key={category.id}>
                {searchQuery && (
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                    {category.icon} {category.name}
                  </p>
                )}
                <div className="space-y-2">
                  {phrases.map((phrase, i) => (
                    <div
                      key={i}
                      className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-[var(--color-primary)]">
                            {phrase.phrase}
                          </p>
                          <p className="text-sm mt-0.5">{phrase.english}</p>
                          <p className="text-xs text-[var(--color-accent)] italic mt-1">
                            {phrase.pronunciation}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            {phrase.context}
                          </p>
                        </div>
                        <button
                          onClick={() => speakPhrase(phrase.phrase)}
                          disabled={playingPhrase === phrase.phrase}
                          className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] cursor-pointer hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-50"
                        >
                          {playingPhrase === phrase.phrase ? (
                            <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {searchQuery && filteredResults.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[var(--color-text-muted)]">
                  No phrases match &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
