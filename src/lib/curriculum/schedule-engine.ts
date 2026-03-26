import type {
  CurriculumTier,
  CurriculumTopic,
  DailyScheduleEntry,
  ChallengeType,
} from "@/lib/types/curriculum";

const CHALLENGE_TYPES: ChallengeType[] = [
  "scenario-conversation",
  "vocab-recall",
  "listen-repeat",
  "how-would-you-say",
  "cultural-tip",
  "flashcard-review",
];

/**
 * Distributes curriculum topics across available days between now and the holiday.
 * Each topic gets at least one day. Remaining days get review/drill challenges.
 */
export function buildDailySchedule(
  tiers: CurriculumTier[],
  totalDays: number,
  startDate: string
): DailyScheduleEntry[] {
  const allTopics = tiers.flatMap((tier) =>
    tier.topics.map((topic) => ({ ...topic, tierId: tier.id }))
  );

  const schedule: DailyScheduleEntry[] = [];
  const start = new Date(startDate);

  if (totalDays <= 0 || allTopics.length === 0) return schedule;

  // First pass: assign one day per topic as a scenario conversation
  for (let i = 0; i < allTopics.length && i < totalDays; i++) {
    const topic = allTopics[i];
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    schedule.push({
      day: i + 1,
      date: date.toISOString().split("T")[0],
      topicId: topic.id,
      challengeType: "scenario-conversation",
      tierId: topic.tierId,
      completed: false,
    });
  }

  // Second pass: fill remaining days with review/drill challenges
  for (let i = allTopics.length; i < totalDays; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    // Cycle through topics for review, vary challenge type
    const topicIndex = i % allTopics.length;
    const topic = allTopics[topicIndex];
    const challengeIndex = (i - allTopics.length) % (CHALLENGE_TYPES.length - 1) + 1; // skip scenario-conversation

    schedule.push({
      day: i + 1,
      date: date.toISOString().split("T")[0],
      topicId: topic.id,
      challengeType: CHALLENGE_TYPES[challengeIndex],
      tierId: topic.tierId,
      completed: false,
    });
  }

  return schedule;
}

/**
 * Calculate how many days are available between two dates.
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
