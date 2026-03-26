import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Trip,
  Curriculum,
  DailyChallenge,
} from "@/lib/types/curriculum";
import type { Scenario } from "@/lib/types/scenario";

interface TripState {
  trips: Trip[];
  activeTripId: string | null;
  cachedScenarios: Record<string, Record<string, Scenario>>; // tripId -> topicId -> Scenario
  isGenerating: boolean;
  generationError: string | null;

  // Trip management
  addTrip: (trip: Trip) => void;
  removeTrip: (tripId: string) => void;
  setActiveTrip: (tripId: string) => void;
  getActiveTrip: () => Trip | null;
  updateTrip: (tripId: string, updates: Partial<Trip>) => void;

  // Curriculum for active trip
  setCurriculum: (tripId: string, curriculum: Curriculum) => void;
  setGenerating: (generating: boolean) => void;
  setGenerationError: (error: string | null) => void;

  // Scenario cache
  cacheScenario: (tripId: string, topicId: string, scenario: Scenario) => void;
  getCachedScenario: (tripId: string, topicId: string) => Scenario | null;

  // Reset
  clearAll: () => void;

  // Progress helpers for active trip
  markTopicCompleted: (topicId: string) => void;
  markDayCompleted: (day: number) => void;
  getTodaysChallenge: () => DailyChallenge | null;
  getCompletedTopicCount: () => number;
  getTotalTopicCount: () => number;
  getCurrentTier: () => number;
  getDaysUntilHoliday: () => number;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTripId: null,
      cachedScenarios: {},
      isGenerating: false,
      generationError: null,

      // ── Trip management ──────────────────────────────────────────

      addTrip: (trip) =>
        set((state) => ({
          trips: [...state.trips, trip],
          // Auto-activate if it's the first trip
          activeTripId: state.activeTripId ?? trip.id,
        })),

      removeTrip: (tripId) =>
        set((state) => {
          const trips = state.trips.filter((t) => t.id !== tripId);
          const { [tripId]: _, ...remainingScenarios } =
            state.cachedScenarios;
          return {
            trips,
            cachedScenarios: remainingScenarios,
            activeTripId:
              state.activeTripId === tripId
                ? (trips[0]?.id ?? null)
                : state.activeTripId,
          };
        }),

      setActiveTrip: (tripId) => set({ activeTripId: tripId }),

      getActiveTrip: () => {
        const { trips, activeTripId } = get();
        if (!activeTripId) return null;
        return trips.find((t) => t.id === activeTripId) ?? null;
      },

      updateTrip: (tripId, updates) =>
        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === tripId ? { ...t, ...updates } : t
          ),
        })),

      // ── Curriculum ───────────────────────────────────────────────

      setCurriculum: (tripId, curriculum) =>
        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === tripId ? { ...t, curriculum } : t
          ),
          generationError: null,
        })),

      setGenerating: (generating) => set({ isGenerating: generating }),

      setGenerationError: (error) =>
        set({ generationError: error, isGenerating: false }),

      // ── Scenario cache ───────────────────────────────────────────

      cacheScenario: (tripId, topicId, scenario) =>
        set((state) => ({
          cachedScenarios: {
            ...state.cachedScenarios,
            [tripId]: {
              ...(state.cachedScenarios[tripId] ?? {}),
              [topicId]: scenario,
            },
          },
        })),

      getCachedScenario: (tripId, topicId) =>
        get().cachedScenarios[tripId]?.[topicId] ?? null,

      // ── Reset ──────────────────────────────────────────────────
      clearAll: () =>
        set({
          trips: [],
          activeTripId: null,
          cachedScenarios: {},
          isGenerating: false,
          generationError: null,
        }),

      // ── Progress helpers (operate on active trip) ────────────────

      markTopicCompleted: (topicId) =>
        set((state) => {
          const activeTripId = state.activeTripId;
          if (!activeTripId) return state;

          return {
            trips: state.trips.map((trip) => {
              if (trip.id !== activeTripId || !trip.curriculum) return trip;
              const tiers = trip.curriculum.tiers.map((tier) => ({
                ...tier,
                topics: tier.topics.map((topic) =>
                  topic.id === topicId
                    ? { ...topic, completed: true }
                    : topic
                ),
              }));
              return {
                ...trip,
                curriculum: { ...trip.curriculum, tiers },
              };
            }),
          };
        }),

      markDayCompleted: (day) =>
        set((state) => {
          const activeTripId = state.activeTripId;
          if (!activeTripId) return state;

          return {
            trips: state.trips.map((trip) => {
              if (trip.id !== activeTripId || !trip.curriculum) return trip;
              const dailySchedule = trip.curriculum.dailySchedule.map(
                (entry) =>
                  entry.day === day ? { ...entry, completed: true } : entry
              );
              return {
                ...trip,
                curriculum: { ...trip.curriculum, dailySchedule },
              };
            }),
          };
        }),

      getTodaysChallenge: () => {
        const trip = get().getActiveTrip();
        if (!trip?.curriculum) return null;

        const today = new Date().toISOString().split("T")[0];
        const entry = trip.curriculum.dailySchedule.find(
          (e) => e.date === today
        );
        if (!entry) return null;

        const topic = trip.curriculum.tiers
          .flatMap((t) => t.topics)
          .find((t) => t.id === entry.topicId);

        return {
          id: `challenge-${entry.day}`,
          day: entry.day,
          date: entry.date,
          type: entry.challengeType,
          topicId: entry.topicId,
          tierId: entry.tierId,
          title: topic?.title || "Daily Challenge",
          description: topic?.description || "",
          completed: entry.completed,
        };
      },

      getCompletedTopicCount: () => {
        const trip = get().getActiveTrip();
        if (!trip?.curriculum) return 0;
        return trip.curriculum.tiers
          .flatMap((t) => t.topics)
          .filter((t) => t.completed).length;
      },

      getTotalTopicCount: () => {
        const trip = get().getActiveTrip();
        if (!trip?.curriculum) return 0;
        return trip.curriculum.tiers.flatMap((t) => t.topics).length;
      },

      getCurrentTier: () => {
        const trip = get().getActiveTrip();
        if (!trip?.curriculum) return 1;
        for (const tier of trip.curriculum.tiers) {
          if (tier.topics.some((t) => !t.completed)) return tier.id;
        }
        return trip.curriculum.tiers.length;
      },

      getDaysUntilHoliday: () => {
        const trip = get().getActiveTrip();
        if (!trip) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const holiday = new Date(trip.holidayDate);
        holiday.setHours(0, 0, 0, 0);
        const diff = holiday.getTime() - today.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      },
    }),
    {
      name: "cafelingo-go-trips",
    }
  )
);
