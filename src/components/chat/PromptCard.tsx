"use client";

import { useState } from "react";
import type { Turn } from "@/lib/types";

interface PromptCardProps {
  turn: Turn;
  showTranslation: boolean;
  onListenClick?: () => void;
}

export function PromptCard({
  turn,
  showTranslation,
  onListenClick,
}: PromptCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!turn.expectedUserPhrase) return null;

  const hasDetails =
    turn.vocabulary.length > 0 || turn.grammarNote || turn.pronunciationGuide;

  return (
    <div className="bg-[var(--color-surface)] border-t border-[var(--color-surface-light)] px-4 py-3 flex-shrink-0">
      {/* Main prompt row — always visible */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wide">
            Say this:
          </span>
          <p className="text-lg font-medium leading-snug mt-0.5">
            {turn.expectedUserPhrase}
          </p>
          {turn.pronunciationGuide && (
            <p className="text-sm text-[var(--color-primary)] italic">
              {turn.pronunciationGuide}
            </p>
          )}
          {showTranslation && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {turn.expectedUserPhraseEn}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {onListenClick && (
            <button
              onClick={onListenClick}
              className="text-xs text-[var(--color-text-muted)] hover:text-white flex items-center gap-1 cursor-pointer bg-[var(--color-surface-light)] rounded-full px-2.5 py-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
              Listen
            </button>
          )}
          {hasDetails && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-[var(--color-text-muted)] hover:text-white flex items-center gap-1 cursor-pointer bg-[var(--color-surface-light)] rounded-full px-2.5 py-1.5"
            >
              {showDetails ? "Hide" : "Help"}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`transition-transform ${showDetails ? "rotate-180" : ""}`}
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expandable details — vocabulary + grammar tip */}
      {showDetails && hasDetails && (
        <div className="mt-2 pt-2 border-t border-[var(--color-surface-light)] space-y-2">
          {/* Vocabulary */}
          {turn.vocabulary.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Vocabulary
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {turn.vocabulary.map((item) => (
                  <span
                    key={item.word}
                    className="text-xs bg-[var(--color-surface-light)] rounded-lg px-2 py-1"
                  >
                    <span className="font-medium">{item.word}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {" "}= {item.translation}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grammar note */}
          {turn.grammarNote && (
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-secondary)]">
                Tip:{" "}
              </span>
              {turn.grammarNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
