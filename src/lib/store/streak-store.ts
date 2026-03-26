import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StreakData } from "@/lib/types/curriculum";

interface StreakState extends StreakData {
  recordActivity: (minutes?: number) => void;
  checkAndUpdateStreak: () => void;
  completeLesson: () => void;
  getStreakEmoji: () => string;
  clearAll: () => void;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalMinutes: 0,
      totalLessonsCompleted: 0,
      activeDates: [],

      recordActivity: (minutes = 5) => {
        const today = getToday();
        const state = get();

        // Already logged today
        if (state.lastActiveDate === today) {
          set({ totalMinutes: state.totalMinutes + minutes });
          return;
        }

        const yesterday = getYesterday();
        let newStreak = 1;

        if (state.lastActiveDate === yesterday) {
          newStreak = state.currentStreak + 1;
        }

        const newLongest = Math.max(state.longestStreak, newStreak);
        const newActiveDates = state.activeDates.includes(today)
          ? state.activeDates
          : [...state.activeDates, today];

        set({
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          totalMinutes: state.totalMinutes + minutes,
          activeDates: newActiveDates,
        });
      },

      checkAndUpdateStreak: () => {
        const state = get();
        const today = getToday();
        const yesterday = getYesterday();

        // If last active was before yesterday, streak is broken
        if (
          state.lastActiveDate &&
          state.lastActiveDate !== today &&
          state.lastActiveDate !== yesterday
        ) {
          set({ currentStreak: 0 });
        }
      },

      completeLesson: () => {
        const state = get();
        set({ totalLessonsCompleted: state.totalLessonsCompleted + 1 });
        get().recordActivity(10);
      },

      clearAll: () =>
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
          totalMinutes: 0,
          totalLessonsCompleted: 0,
          activeDates: [],
        }),

      getStreakEmoji: () => {
        const streak = get().currentStreak;
        if (streak >= 30) return "🔥";
        if (streak >= 14) return "⚡";
        if (streak >= 7) return "✨";
        if (streak >= 3) return "💪";
        if (streak >= 1) return "👍";
        return "🌱";
      },
    }),
    {
      name: "cafelingo-go-streak",
    }
  )
);
