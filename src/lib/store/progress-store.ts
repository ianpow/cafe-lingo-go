import { create } from "zustand";
import type { VocabItem } from "@/lib/types";

interface ScenarioProgress {
  scenarioId: string;
  completed: boolean;
  bestScore: number;
  attempts: number;
  lastPlayedAt: number;
  vocabulary: VocabItem[];  // vocab learned from this scenario
}

interface ProgressState {
  // Progress data
  scenarioProgress: Record<string, ScenarioProgress>;
  totalXP: number;

  // Actions
  completeScenario: (scenarioId: string, score: number, vocab: VocabItem[]) => void;
  getProgress: (scenarioId: string) => ScenarioProgress | null;
  getAllVocabulary: () => VocabItem[];
  getVocabularyByLanguage: (lang: string) => VocabItem[];
  isCompleted: (scenarioId: string) => boolean;
  getBestScore: (scenarioId: string) => number;
  getCompletedCount: () => number;
  resetAllProgress: () => void;
}

// Load from localStorage
function loadProgress(): Record<string, ScenarioProgress> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("cafelingo-progress");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function loadXP(): number {
  if (typeof window === "undefined") return 0;
  try {
    const stored = localStorage.getItem("cafelingo-xp");
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function saveProgress(progress: Record<string, ScenarioProgress>, xp: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cafelingo-progress", JSON.stringify(progress));
    localStorage.setItem("cafelingo-xp", xp.toString());
  } catch {
    // localStorage full or unavailable
  }
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  scenarioProgress: loadProgress(),
  totalXP: loadXP(),

  completeScenario: (scenarioId, score, vocab) => {
    set((state) => {
      const existing = state.scenarioProgress[scenarioId];
      const isNewCompletion = !existing?.completed;

      // Merge vocabulary — avoid duplicates
      const existingVocab = existing?.vocabulary || [];
      const existingWords = new Set(existingVocab.map((v) => v.word));
      const newVocab = vocab.filter((v) => !existingWords.has(v.word));
      const mergedVocab = [...existingVocab, ...newVocab];

      const updated: ScenarioProgress = {
        scenarioId,
        completed: true,
        bestScore: Math.max(score, existing?.bestScore || 0),
        attempts: (existing?.attempts || 0) + 1,
        lastPlayedAt: Date.now(),
        vocabulary: mergedVocab,
      };

      const newProgress = {
        ...state.scenarioProgress,
        [scenarioId]: updated,
      };

      // Award XP: 10 per new completion + score bonus
      const xpGain = (isNewCompletion ? 10 : 0) + Math.round(score / 10);
      const newXP = state.totalXP + xpGain;

      saveProgress(newProgress, newXP);

      return {
        scenarioProgress: newProgress,
        totalXP: newXP,
      };
    });
  },

  getProgress: (scenarioId) => {
    return get().scenarioProgress[scenarioId] || null;
  },

  getAllVocabulary: () => {
    const progress = get().scenarioProgress;
    const allVocab: VocabItem[] = [];
    const seen = new Set<string>();
    for (const sp of Object.values(progress)) {
      for (const v of sp.vocabulary) {
        if (!seen.has(v.word)) {
          seen.add(v.word);
          allVocab.push(v);
        }
      }
    }
    return allVocab;
  },

  getVocabularyByLanguage: (lang: string) => {
    const progress = get().scenarioProgress;
    const vocab: VocabItem[] = [];
    const seen = new Set<string>();

    for (const [scenarioId, sp] of Object.entries(progress)) {
      // Determine language from scenario ID
      const scenarioLang = scenarioId.endsWith("-fr")
        ? "fr"
        : scenarioId.endsWith("-zh")
        ? "zh"
        : "es";

      if (scenarioLang !== lang) continue;

      for (const v of sp.vocabulary) {
        if (!seen.has(v.word)) {
          seen.add(v.word);
          vocab.push(v);
        }
      }
    }
    return vocab;
  },

  isCompleted: (scenarioId) => {
    return get().scenarioProgress[scenarioId]?.completed || false;
  },

  getBestScore: (scenarioId) => {
    return get().scenarioProgress[scenarioId]?.bestScore || 0;
  },

  getCompletedCount: () => {
    return Object.values(get().scenarioProgress).filter((p) => p.completed).length;
  },

  resetAllProgress: () => {
    saveProgress({}, 0);
    set({ scenarioProgress: {}, totalXP: 0 });
  },
}));
