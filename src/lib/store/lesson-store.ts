import { create } from "zustand";
import type { Message, Turn, Scenario } from "@/lib/types";
import type { PronunciationResult } from "@/lib/types/pronunciation";

interface LessonState {
  // Scenario
  scenario: Scenario | null;
  currentTurnIndex: number;

  // Conversation
  conversationHistory: Message[];

  // Pronunciation
  pronunciationResults: PronunciationResult[];
  latestPronunciation: PronunciationResult | null;

  // UI state
  isRecording: boolean;
  isAvatarSpeaking: boolean;
  isProcessing: boolean;
  isLessonComplete: boolean;
  showTranslation: boolean;

  // Actions
  setScenario: (scenario: Scenario) => void;
  getCurrentTurn: () => Turn | null;
  addMessage: (message: Omit<Message, "timestamp">) => void;
  advanceTurn: () => void;
  repeatTurn: () => void;
  setRecording: (recording: boolean) => void;
  setAvatarSpeaking: (speaking: boolean) => void;
  setProcessing: (processing: boolean) => void;
  addPronunciationResult: (result: PronunciationResult) => void;
  toggleTranslation: () => void;
  resetLesson: () => void;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  scenario: null,
  currentTurnIndex: 0,
  conversationHistory: [],
  pronunciationResults: [],
  latestPronunciation: null,
  isRecording: false,
  isAvatarSpeaking: false,
  isProcessing: false,
  isLessonComplete: false,
  showTranslation: true,

  setScenario: (scenario) => set({ scenario, currentTurnIndex: 0 }),

  getCurrentTurn: () => {
    const { scenario, currentTurnIndex } = get();
    if (!scenario) return null;
    return scenario.turns[currentTurnIndex] ?? null;
  },

  addMessage: (message) =>
    set((state) => ({
      conversationHistory: [
        ...state.conversationHistory,
        { ...message, timestamp: Date.now() },
      ],
    })),

  advanceTurn: () =>
    set((state) => {
      const nextIndex = state.currentTurnIndex + 1;
      const isComplete =
        state.scenario !== null && nextIndex >= state.scenario.turns.length;
      return {
        currentTurnIndex: isComplete ? state.currentTurnIndex : nextIndex,
        isLessonComplete: isComplete,
        latestPronunciation: null,
      };
    }),

  repeatTurn: () => set({ latestPronunciation: null }),

  setRecording: (recording) => set({ isRecording: recording }),
  setAvatarSpeaking: (speaking) => set({ isAvatarSpeaking: speaking }),
  setProcessing: (processing) => set({ isProcessing: processing }),

  addPronunciationResult: (result) =>
    set((state) => ({
      pronunciationResults: [...state.pronunciationResults, result],
      latestPronunciation: result,
    })),

  toggleTranslation: () =>
    set((state) => ({ showTranslation: !state.showTranslation })),

  resetLesson: () =>
    set({
      currentTurnIndex: 0,
      conversationHistory: [],
      pronunciationResults: [],
      latestPronunciation: null,
      isRecording: false,
      isAvatarSpeaking: false,
      isProcessing: false,
      isLessonComplete: false,
    }),
}));
