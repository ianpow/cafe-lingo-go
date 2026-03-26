import type { DailyChallenge, CurriculumTier, DailyScheduleEntry } from "@/lib/types/curriculum";
import type { SRSItem } from "@/lib/types/curriculum";

/**
 * Selects today's challenge(s), incorporating SRS due items.
 */
export function selectDailyChallenge(
  schedule: DailyScheduleEntry[],
  tiers: CurriculumTier[],
  dueItems: SRSItem[]
): DailyChallenge | null {
  const today = new Date().toISOString().split("T")[0];
  const entry = schedule.find((e) => e.date === today);

  if (!entry) return null;

  const topic = tiers
    .flatMap((t) => t.topics)
    .find((t) => t.id === entry.topicId);

  // If there are SRS items due and today isn't a new lesson, do flashcard review
  const challengeType =
    dueItems.length >= 5 && entry.completed
      ? "flashcard-review"
      : entry.challengeType;

  return {
    id: `challenge-${entry.day}`,
    day: entry.day,
    date: entry.date,
    type: challengeType,
    topicId: entry.topicId,
    tierId: entry.tierId,
    title: topic?.title || "Daily Challenge",
    description: topic?.description || "",
    completed: entry.completed,
  };
}
