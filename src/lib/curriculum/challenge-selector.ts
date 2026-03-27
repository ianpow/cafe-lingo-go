import type { DailyChallenge, CurriculumTier, DailyScheduleEntry, ChallengeType } from "@/lib/types/curriculum";
import type { SRSItem } from "@/lib/types/curriculum";

/**
 * Selects today's challenge, incorporating SRS due items and
 * avoiding duplication with the "Next Lesson" CTA.
 *
 * Logic:
 * 1. If 5+ SRS items are due → flashcard-review (regardless of schedule)
 * 2. If the scheduled challenge is scenario-conversation for an uncompleted
 *    topic (i.e. identical to "Next Lesson") → pick a review challenge
 *    for a previously completed topic instead, so both CTAs are useful
 * 3. Otherwise → use the scheduled challenge as-is
 */

const REVIEW_TYPES: ChallengeType[] = [
  "vocab-recall",
  "listen-repeat",
  "how-would-you-say",
  "flashcard-review",
];

export function selectDailyChallenge(
  schedule: DailyScheduleEntry[],
  tiers: CurriculumTier[],
  dueItemCount: number,
  nextUncompletedTopicId: string | null
): DailyChallenge | null {
  const today = new Date().toISOString().split("T")[0];
  const entry = schedule.find((e) => e.date === today);

  if (!entry) return null;

  const allTopics = tiers.flatMap((t) => t.topics);
  const topic = allTopics.find((t) => t.id === entry.topicId);

  // Priority 1: If lots of SRS items due, push flashcard review
  if (dueItemCount >= 5) {
    return {
      id: `challenge-${entry.day}`,
      day: entry.day,
      date: entry.date,
      type: "flashcard-review",
      topicId: entry.topicId,
      tierId: entry.tierId,
      title: `Review ${dueItemCount} words`,
      description: "Strengthen your memory with spaced repetition flashcards",
      completed: entry.completed,
    };
  }

  // Priority 2: If scheduled challenge is identical to "Next Lesson"
  // (scenario-conversation for the next uncompleted topic), differentiate
  const isNextLesson =
    entry.challengeType === "scenario-conversation" &&
    nextUncompletedTopicId === entry.topicId &&
    !topic?.completed;

  if (isNextLesson) {
    // Find a completed topic to review instead
    const completedTopics = allTopics.filter((t) => t.completed);

    if (completedTopics.length > 0) {
      // Pick a review topic (cycle based on day number)
      const reviewTopic = completedTopics[entry.day % completedTopics.length];
      const reviewType = REVIEW_TYPES[entry.day % REVIEW_TYPES.length];
      const reviewTier = tiers.find((t) =>
        t.topics.some((tp) => tp.id === reviewTopic.id)
      );

      return {
        id: `challenge-${entry.day}`,
        day: entry.day,
        date: entry.date,
        type: reviewType,
        topicId: reviewTopic.id,
        tierId: reviewTier?.id || entry.tierId,
        title: `Review: ${reviewTopic.title}`,
        description: challengeDescription(reviewType),
        completed: entry.completed,
      };
    }

    // No completed topics yet (first day) — skip showing challenge
    // since it would duplicate Next Lesson
    return null;
  }

  // Default: use the scheduled challenge
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
}

function challengeDescription(type: ChallengeType): string {
  switch (type) {
    case "vocab-recall":
      return "Test your vocabulary with quick recall questions";
    case "listen-repeat":
      return "Listen and repeat to sharpen your pronunciation";
    case "how-would-you-say":
      return "Practice expressing yourself in the target language";
    case "flashcard-review":
      return "Strengthen your memory with spaced repetition";
    case "cultural-tip":
      return "Learn about local customs and culture";
    case "scenario-conversation":
      return "Practice a real-world conversation";
  }
}
