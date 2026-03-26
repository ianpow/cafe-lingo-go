"use client";

import Link from "next/link";

interface LessonHeaderProps {
  title: string;
  currentTurn: number;
  totalTurns: number;
}

export function LessonHeader({
  title,
  currentTurn,
  totalTurns,
}: LessonHeaderProps) {
  const progress = ((currentTurn + 1) / totalTurns) * 100;

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
      <Link
        href="/"
        className="text-[var(--color-text-muted)] hover:text-white transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </Link>
      <div className="flex-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {currentTurn + 1}/{totalTurns}
          </span>
        </div>
      </div>
    </div>
  );
}
