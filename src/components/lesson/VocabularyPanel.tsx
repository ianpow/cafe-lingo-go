"use client";

import type { VocabItem } from "@/lib/types";

interface VocabularyPanelProps {
  items: VocabItem[];
}

export function VocabularyPanel({ items }: VocabularyPanelProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 mx-4 mb-4">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
        Key Vocabulary
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.word} className="flex items-center justify-between">
            <div>
              <span className="font-medium text-sm">{item.word}</span>
              <span className="text-xs text-[var(--color-text-muted)] ml-2">
                ({item.partOfSpeech})
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm text-[var(--color-text-muted)]">
                {item.translation}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] ml-2 opacity-60">
                {item.pronunciation}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
