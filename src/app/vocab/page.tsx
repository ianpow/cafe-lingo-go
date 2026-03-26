"use client";

import { useRouter } from "next/navigation";
import { useSRSStore } from "@/lib/store/srs-store";
import { useTripStore } from "@/lib/store/trip-store";

export default function VocabPage() {
  const router = useRouter();
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const items = useSRSStore((s) => Object.values(s.items));

  const filteredItems = activeTrip
    ? items.filter((i) => i.language === activeTrip.language)
    : items;

  // Sort by most recently added
  const sortedItems = [...filteredItems].sort(
    (a, b) => (b.lastReviewDate || "").localeCompare(a.lastReviewDate || "")
  );

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        <div>
          <h2 className="text-sm font-semibold">Vocabulary</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {sortedItems.length} words learned
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        {sortedItems.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-[var(--color-text-muted)]">No vocabulary yet.</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Complete lessons to start building your word bank.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-lg mx-auto">
            {sortedItems.map((item) => {
              const masteryColor =
                item.interval >= 30
                  ? "border-green-500/30"
                  : item.interval >= 7
                    ? "border-yellow-500/30"
                    : "border-[var(--color-surface-light)]";

              return (
                <div
                  key={item.vocabId}
                  className={`flex items-center justify-between bg-[var(--color-surface)] rounded-lg px-4 py-3 border ${masteryColor}`}
                >
                  <div>
                    <span className="font-medium">{item.word}</span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">
                      ({item.partOfSpeech})
                    </span>
                    <p className="text-xs text-[var(--color-primary)] italic">
                      {item.pronunciation}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {item.translation}
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {item.correctCount}/{item.correctCount + item.incorrectCount} correct
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
