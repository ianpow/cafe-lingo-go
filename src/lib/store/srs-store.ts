import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SRSItem } from "@/lib/types/curriculum";
import type { LanguageCode } from "@/lib/config/language-registry";

interface SRSState {
  items: Record<string, SRSItem>; // vocabId -> SRSItem

  addItem: (item: Omit<SRSItem, "interval" | "easeFactor" | "repetitions" | "nextReviewDate" | "lastReviewDate" | "correctCount" | "incorrectCount" | "lastScore">) => void;
  reviewItem: (vocabId: string, score: number) => void; // score 0-5 (SM-2)
  getDueItems: (language?: LanguageCode) => SRSItem[];
  getItemCount: (language?: LanguageCode) => number;
  getMasteredCount: (language?: LanguageCode) => number;
  clearAll: () => void;
}

/**
 * SM-2 algorithm: calculate next interval and ease factor
 */
function sm2(item: SRSItem, score: number): Pick<SRSItem, "interval" | "easeFactor" | "repetitions"> {
  let { easeFactor, repetitions, interval } = item;

  if (score >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
  );

  return { interval, easeFactor, repetitions };
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export const useSRSStore = create<SRSState>()(
  persist(
    (set, get) => ({
      items: {},

      addItem: (partial) => {
        const today = new Date().toISOString().split("T")[0];
        const item: SRSItem = {
          ...partial,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          nextReviewDate: today, // due immediately
          lastReviewDate: null,
          correctCount: 0,
          incorrectCount: 0,
          lastScore: 0,
        };
        set((state) => ({
          items: { ...state.items, [item.vocabId]: item },
        }));
      },

      reviewItem: (vocabId, score) =>
        set((state) => {
          const item = state.items[vocabId];
          if (!item) return state;

          const today = new Date().toISOString().split("T")[0];
          const updated = sm2(item, score);

          const newItem: SRSItem = {
            ...item,
            ...updated,
            nextReviewDate: addDays(today, updated.interval),
            lastReviewDate: today,
            lastScore: score,
            correctCount: item.correctCount + (score >= 3 ? 1 : 0),
            incorrectCount: item.incorrectCount + (score < 3 ? 1 : 0),
          };

          return {
            items: { ...state.items, [vocabId]: newItem },
          };
        }),

      getDueItems: (language) => {
        const today = new Date().toISOString().split("T")[0];
        return Object.values(get().items).filter(
          (item) =>
            item.nextReviewDate <= today &&
            (!language || item.language === language)
        );
      },

      getItemCount: (language) => {
        const items = Object.values(get().items);
        return language ? items.filter((i) => i.language === language).length : items.length;
      },

      getMasteredCount: (language) => {
        const items = Object.values(get().items);
        return items.filter(
          (i) =>
            i.interval >= 30 &&
            (!language || i.language === language)
        ).length;
      },

      clearAll: () => set({ items: {} }),
    }),
    {
      name: "cafelingo-go-srs",
    }
  )
);
