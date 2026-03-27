import { getLanguage } from "@/lib/config/language-registry";
import type { TargetLanguage } from "@/lib/types/curriculum";
import type { TierDefinition } from "@/lib/curriculum/tier-definitions";

/**
 * Build a prompt to generate a SINGLE tier of the curriculum.
 * Called once per tier to keep responses well within token limits.
 */
export function buildTierPrompt(
  tier: TierDefinition,
  profile: { name: string; age: number; country: string },
  trip: {
    destinationCity: string;
    destinationCountry: string;
    holidayDate: string;
    language: TargetLanguage;
    foodPreferences: string[];
    interests: string[];
  },
  totalDays: number
): string {
  const langName = getLanguage(trip.language).name;

  return `Generate Tier ${tier.id} ("${tier.name}") of a ${langName} curriculum for ${profile.name} visiting ${trip.destinationCity}, ${trip.destinationCountry} on ${trip.holidayDate} (${totalDays} days to prepare).

Interests: ${trip.interests.join(", ") || "none"}. Food: ${trip.foodPreferences.join(", ") || "none"}.

Tier ${tier.id} — ${tier.name}: ${tier.description}
Topics to cover: ${tier.topicTemplates.join(", ")}

Rules:
- Use REAL locations, restaurants, landmarks in ${trip.destinationCity}
- Vocabulary: 5-8 key words per topic (keep compact)
- Set scenarios in specific real places
- Include a short culturalTip per topic

Respond with ONLY valid JSON, no markdown:
{"id":${tier.id},"name":"${tier.name}","description":"...","topics":[{"id":"t${tier.id}-1","title":"...","description":"...","tierId":${tier.id},"vocabulary":["word1","word2"],"scenarioSetting":"...","culturalTip":"..."}]}

Generate exactly ${tier.topicTemplates.length} topics. Be concise.`;
}
