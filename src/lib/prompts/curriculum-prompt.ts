import { getLanguage } from "@/lib/config/language-registry";
import { getTiersForLevel } from "@/lib/curriculum/tier-definitions";
import type { TargetLevel, TargetLanguage } from "@/lib/types/curriculum";

export function buildCurriculumPrompt(
  profile: { name: string; age: number; country: string },
  trip: {
    destinationCity: string;
    destinationCountry: string;
    holidayDate: string;
    targetLevel: TargetLevel;
    language: TargetLanguage;
    foodPreferences: string[];
    interests: string[];
  },
  totalDays: number
): string {
  const tiers = getTiersForLevel(trip.targetLevel);
  const tierDescriptions = tiers
    .map(
      (t) =>
        `Tier ${t.id} — ${t.name}: ${t.topicTemplates.join(", ")}`
    )
    .join("\n");

  const langName = getLanguage(trip.language).name;

  return `Create a ${langName} curriculum for ${profile.name} visiting ${trip.destinationCity}, ${trip.destinationCountry} on ${trip.holidayDate} (${totalDays} days to prepare). Level: ${trip.targetLevel}. Interests: ${trip.interests.join(", ") || "none"}. Food: ${trip.foodPreferences.join(", ") || "none"}.

Tiers:
${tierDescriptions}

Rules:
- Use REAL locations, restaurants, landmarks in ${trip.destinationCity}
- Vocabulary: 5-8 key words per topic (keep compact)
- Set scenarios in specific real places
- Include a short culturalTip per topic

Respond with ONLY valid JSON, no markdown. Structure:
{"tiers":[{"id":1,"name":"Survival","description":"...","topics":[{"id":"t1-1","title":"...","description":"...","tierId":1,"vocabulary":["word1","word2"],"scenarioSetting":"...","culturalTip":"..."}]}]}

Generate ${tiers.map((t) => `${t.topicTemplates.length} topics for Tier ${t.id}`).join(", ")}. Be concise.`;
}
