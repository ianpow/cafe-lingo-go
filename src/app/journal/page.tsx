"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { useSRSStore } from "@/lib/store/srs-store";
import { useJournalStore, JournalWord } from "@/lib/store/journal-store";
import { getLanguage } from "@/lib/config/language-registry";

export default function JournalPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const { entries, addEntry, updateEntry, markWordSRS, getEntriesForTrip } =
    useJournalStore();
  const addSRSItem = useSRSStore((s) => s.addItem);

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  const [wordInput, setWordInput] = useState("");
  const [pendingWords, setPendingWords] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const tripEntries = activeTrip ? getEntriesForTrip(activeTrip.id) : [];
  const todayEntry = tripEntries.find((e) => e.date === today);

  const addWord = () => {
    const word = wordInput.trim();
    if (!word || pendingWords.includes(word)) return;
    setPendingWords((prev) => [...prev, word]);
    setWordInput("");
  };

  const removeWord = (word: string) => {
    setPendingWords((prev) => prev.filter((w) => w !== word));
  };

  const processWords = async () => {
    if (pendingWords.length === 0 || !activeTrip) return;
    setIsProcessing(true);

    try {
      const res = await fetch("/api/journal/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: pendingWords,
          language,
          languageName: langConfig.name,
          city: activeTrip.destinationCity,
        }),
      });
      if (!res.ok) throw new Error("Failed to enrich");
      const data = await res.json();

      const enrichedWords: JournalWord[] = (data.words || []).map(
        (w: { original: string; translation: string; pronunciation: string; exampleSentence: string; exampleTranslation: string }, i: number) => ({
          id: `${Date.now()}-${i}`,
          original: w.original,
          translation: w.translation,
          pronunciation: w.pronunciation,
          exampleSentence: w.exampleSentence,
          exampleTranslation: w.exampleTranslation,
          addedToSRS: false,
        })
      );

      if (todayEntry) {
        updateEntry(todayEntry.id, [...todayEntry.words, ...enrichedWords]);
      } else {
        addEntry({
          id: `journal-${Date.now()}`,
          date: today,
          tripId: activeTrip.id,
          words: enrichedWords,
          createdAt: new Date().toISOString(),
        });
      }

      setPendingWords([]);
    } catch (err) {
      console.error("Failed to process words:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToSRS = (entryId: string, word: JournalWord) => {
    if (!activeTrip) return;
    addSRSItem({
      vocabId: `journal-${word.id}`,
      word: word.original,
      translation: word.translation,
      pronunciation: word.pronunciation,
      partOfSpeech: "phrase",
      language: activeTrip.language,
      sourceTopicId: "journal",
    });
    markWordSRS(entryId, word.id);
  };

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
          <h1 className="text-lg font-bold">Travel Journal</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Log new words from your day in {activeTrip?.destinationCity}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add words section */}
        <div className="px-4 pt-4 space-y-3">
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)]">
            <h3 className="font-semibold mb-2">
              What new words did you encounter today?
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Type words or phrases you heard or saw — in English or {langConfig.name}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWord()}
                placeholder="e.g. cuenta, perdona, cerrado..."
                className="flex-1 bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                onClick={addWord}
                disabled={!wordInput.trim()}
                className="px-4 py-2.5 bg-[var(--color-surface-light)] rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Pending words */}
            {pendingWords.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {pendingWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-sm"
                    >
                      {word}
                      <button
                        onClick={() => removeWord(word)}
                        className="hover:text-red-400 cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={processWords}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-[var(--color-primary)] rounded-lg text-white font-medium cursor-pointer disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Learn ${pendingWords.length} word${pendingWords.length > 1 ? "s" : ""}`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Journal entries */}
        <div className="px-4 py-4 space-y-6">
          {tripEntries.length === 0 && pendingWords.length === 0 && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📖</p>
              <p className="text-[var(--color-text-muted)]">
                Your journal is empty. Add words you encounter during your trip!
              </p>
            </div>
          )}

          {tripEntries.map((entry) => (
            <div key={entry.id}>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
                {new Date(entry.date + "T12:00:00").toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                <span className="ml-2 text-[var(--color-primary)]">
                  {entry.words.length} word{entry.words.length !== 1 ? "s" : ""}
                </span>
              </h3>
              <div className="space-y-3">
                {entry.words.map((word) => (
                  <div
                    key={word.id}
                    className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--color-primary)]">
                          {word.original}
                        </p>
                        <p className="text-sm">{word.translation}</p>
                        <p className="text-xs text-[var(--color-accent)] italic mt-1">
                          {word.pronunciation}
                        </p>
                      </div>
                      <button
                        onClick={() => speakPhrase(word.original, word.id)}
                        disabled={playingId === word.id}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] cursor-pointer disabled:opacity-50"
                      >
                        {playingId === word.id ? (
                          <div className="w-3 h-3 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Example sentence */}
                    <div className="mt-2 bg-[var(--color-bg)] rounded-lg p-3">
                      <p className="text-sm italic">{word.exampleSentence}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {word.exampleTranslation}
                      </p>
                    </div>

                    {/* Add to SRS */}
                    {word.addedToSRS ? (
                      <p className="text-xs text-[var(--color-primary)] mt-2 flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        Added to review deck
                      </p>
                    ) : (
                      <button
                        onClick={() => handleAddToSRS(entry.id, word)}
                        className="mt-2 text-xs text-[var(--color-primary)] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        Add to review deck
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
