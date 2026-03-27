"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSRSStore } from "@/lib/store/srs-store";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { useStreakStore } from "@/lib/store/streak-store";
import type { SRSItem } from "@/lib/types/curriculum";

export default function ReviewPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const { getDueItems, reviewItem } = useSRSStore();
  const recordActivity = useStreakStore((s) => s.recordActivity);

  const dueItems = getDueItems(activeTrip?.language);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const currentItem: SRSItem | undefined = dueItems[currentIndex];

  const handleScore = useCallback(
    (score: number) => {
      if (!currentItem) return;
      reviewItem(currentItem.vocabId, score);
      setReviewedCount((c) => c + 1);
      setShowAnswer(false);

      if (currentIndex + 1 < dueItems.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        recordActivity(5);
      }
    },
    [currentItem, currentIndex, dueItems.length, reviewItem, recordActivity]
  );

  useEffect(() => {
    if (!profile) {
      router.replace("/onboarding");
    }
  }, [profile, router]);

  if (!profile) {
    return null;
  }

  // All done
  if (dueItems.length === 0 || currentIndex >= dueItems.length) {
    return (
      <div className="h-[100dvh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {reviewedCount > 0 ? "Review Complete!" : "No cards to review"}
          </h2>
          <p className="text-[var(--color-text-muted)] mb-4">
            {reviewedCount > 0
              ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? "" : "s"}.`
              : "Complete some lessons to start building your vocabulary."}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Flashcard Review</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            {currentIndex + 1} of {dueItems.length} cards
          </p>
        </div>
      </div>

      {/* Card — takes available space */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0">
        <div
          className="w-full max-w-sm bg-[var(--color-surface)] rounded-2xl p-8 text-center cursor-pointer border border-[var(--color-surface-light)]"
          onClick={() => setShowAnswer(true)}
        >
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
            {currentItem.partOfSpeech}
          </p>
          <h3 className="text-3xl font-bold mb-2">{currentItem.word}</h3>
          <p className="text-sm text-[var(--color-primary)] italic mb-6">
            {currentItem.pronunciation}
          </p>

          {showAnswer ? (
            <div className="pt-4 border-t border-[var(--color-surface-light)]">
              <p className="text-xl font-medium">{currentItem.translation}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Tap to reveal</p>
          )}
        </div>
      </div>

      {/* Score buttons — always pinned at bottom */}
      <div className="flex-shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-[var(--color-bg)] border-t border-[var(--color-surface-light)]">
        {showAnswer ? (
          <div className="space-y-2">
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              How well did you know this?
            </p>
            <div className="flex gap-2">
              <ScoreButton label="Again" score={1} color="red" onClick={handleScore} />
              <ScoreButton label="Hard" score={3} color="yellow" onClick={handleScore} />
              <ScoreButton label="Good" score={4} color="green" onClick={handleScore} />
              <ScoreButton label="Easy" score={5} color="cyan" onClick={handleScore} />
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-[var(--color-text-muted)] py-3">
            Tap the card to reveal the answer
          </p>
        )}
      </div>
    </div>
  );
}

function ScoreButton({
  label,
  score,
  color,
  onClick,
}: {
  label: string;
  score: number;
  color: string;
  onClick: (score: number) => void;
}) {
  const colorMap: Record<string, string> = {
    red: "bg-[color-mix(in_srgb,var(--color-error)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-error)_30%,transparent)] text-[var(--color-error)] border-[color-mix(in_srgb,var(--color-error)_30%,transparent)]",
    yellow: "bg-[color-mix(in_srgb,var(--color-warning)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] text-[var(--color-warning)] border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]",
    green: "bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-success)_30%,transparent)] text-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]",
    cyan: "bg-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] text-[var(--color-primary)] border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]",
  };

  return (
    <button
      onClick={() => onClick(score)}
      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${colorMap[color]}`}
    >
      {label}
    </button>
  );
}
