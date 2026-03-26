import type { VocabItem } from "@/lib/types/scenario";
import type { SRSItem, TargetLanguage } from "@/lib/types/curriculum";

/**
 * Create SRS items from vocabulary learned in a lesson.
 */
export function vocabToSRSItems(
  vocab: VocabItem[],
  sourceTopicId: string,
  language: TargetLanguage
): Omit<SRSItem, "interval" | "easeFactor" | "repetitions" | "nextReviewDate" | "lastReviewDate" | "correctCount" | "incorrectCount" | "lastScore">[] {
  return vocab.map((v) => ({
    vocabId: `${sourceTopicId}-${v.word}`,
    word: v.word,
    translation: v.translation,
    pronunciation: v.pronunciation,
    partOfSpeech: v.partOfSpeech,
    language,
    sourceTopicId,
  }));
}

/**
 * Convert a quality score (0-100 from pronunciation) to SM-2 scale (0-5).
 */
export function pronunciationToSM2(score: number): number {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 65) return 3;
  if (score >= 50) return 2;
  if (score >= 30) return 1;
  return 0;
}
