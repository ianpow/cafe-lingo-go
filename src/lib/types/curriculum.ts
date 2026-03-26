import type { LanguageCode } from "@/lib/config/language-registry";

export type TargetLevel = "survival" | "conversational" | "confident";
export type TargetLanguage = LanguageCode;
export type ChallengeType =
  | "vocab-recall"
  | "listen-repeat"
  | "scenario-conversation"
  | "how-would-you-say"
  | "cultural-tip"
  | "flashcard-review";

/** Personal info — persists across all trips */
export interface UserProfile {
  id: string;
  name: string;
  age: number;
  country: string; // default "Scotland"
  avatarGender: "male" | "female";
  createdAt: string;
}

/** A single trip with its own destination, language, curriculum, and progress */
export interface Trip {
  id: string;
  userId: string;
  destinationCity: string;
  destinationCountry: string;
  holidayDate: string; // ISO date
  targetLevel: TargetLevel;
  language: TargetLanguage;
  foodPreferences: string[];
  interests: string[];
  createdAt: string;
  curriculum: Curriculum | null;
  status: "active" | "completed" | "archived";
}

export interface Curriculum {
  id: string;
  tripId: string;
  generatedAt: string;
  targetLevel: TargetLevel;
  totalDays: number;
  language: TargetLanguage;
  tiers: CurriculumTier[];
  dailySchedule: DailyScheduleEntry[];
  metadata: {
    destinationCity: string;
    userInterests: string[];
    foodPreferences: string[];
  };
}

export interface CurriculumTier {
  id: number;
  name: string;
  description: string;
  topics: CurriculumTopic[];
}

export interface CurriculumTopic {
  id: string;
  title: string;
  description: string;
  tierId: number;
  vocabulary: string[]; // key words to teach
  scenarioSetting: string; // e.g. "La Boqueria market, Barcelona"
  culturalTip?: string;
  completed: boolean;
}

export interface DailyScheduleEntry {
  day: number;
  date: string; // ISO date
  topicId: string;
  challengeType: ChallengeType;
  tierId: number;
  completed: boolean;
}

export interface DailyChallenge {
  id: string;
  day: number;
  date: string;
  type: ChallengeType;
  topicId: string;
  tierId: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface SRSItem {
  vocabId: string;
  word: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: string;
  language: TargetLanguage;
  interval: number; // days
  easeFactor: number; // SM-2, default 2.5
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string | null;
  correctCount: number;
  incorrectCount: number;
  lastScore: number;
  sourceTopicId: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalMinutes: number;
  totalLessonsCompleted: number;
  activeDates: string[]; // ISO dates
}
