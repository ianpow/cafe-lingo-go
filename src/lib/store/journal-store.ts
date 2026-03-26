import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface JournalEntry {
  id: string;
  date: string; // ISO date string (date only, e.g. "2026-04-15")
  tripId: string;
  words: JournalWord[];
  createdAt: string;
}

export interface JournalWord {
  id: string;
  original: string; // what user typed or heard
  translation: string;
  pronunciation: string;
  exampleSentence: string;
  exampleTranslation: string;
  addedToSRS: boolean;
}

interface JournalState {
  entries: JournalEntry[];
  addEntry: (entry: JournalEntry) => void;
  getEntriesForTrip: (tripId: string) => JournalEntry[];
  getEntryForDate: (tripId: string, date: string) => JournalEntry | undefined;
  updateEntry: (entryId: string, words: JournalWord[]) => void;
  markWordSRS: (entryId: string, wordId: string) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((s) => ({ entries: [...s.entries, entry] })),

      getEntriesForTrip: (tripId) =>
        get().entries.filter((e) => e.tripId === tripId).sort((a, b) => b.date.localeCompare(a.date)),

      getEntryForDate: (tripId, date) =>
        get().entries.find((e) => e.tripId === tripId && e.date === date),

      updateEntry: (entryId, words) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId ? { ...e, words } : e
          ),
        })),

      markWordSRS: (entryId, wordId) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  words: e.words.map((w) =>
                    w.id === wordId ? { ...w, addedToSRS: true } : w
                  ),
                }
              : e
          ),
        })),
    }),
    { name: "cafelingo-go-journal" }
  )
);
