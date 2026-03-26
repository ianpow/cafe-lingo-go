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
        `Tier ${t.id} — ${t.name}: ${t.description}\n  Topics: ${t.topicTemplates.join(", ")}`
    )
    .join("\n");

  const langName = getLanguage(trip.language).name;

  return `You are a language learning curriculum designer creating a personalised ${langName} course.

## Student Profile
- Name: ${profile.name}, Age: ${profile.age}, From: ${profile.country}
- Destination: ${trip.destinationCity}, ${trip.destinationCountry}
- Holiday date: ${trip.holidayDate} (${totalDays} days to prepare)
- Target level: ${trip.targetLevel}
- Food preferences: ${trip.foodPreferences.join(", ") || "none specified"}
- Interests: ${trip.interests.join(", ") || "none specified"}

## Tier Structure
${tierDescriptions}

## Your Task
Generate a complete curriculum with detailed topics for each tier. Every topic MUST be deeply personalised:

1. **City-specific**: Set scenarios in REAL, NAMED locations in ${trip.destinationCity}. Use actual street names, neighbourhoods, landmarks, restaurants, and transport systems.
2. **Interest-driven**: Incorporate the student's interests (${trip.interests.join(", ")}) into scenarios where relevant. E.g., if they like football, include a scenario about getting to the local stadium.
3. **Food-aware**: Use the student's food preferences (${trip.foodPreferences.join(", ")}) to shape restaurant/food scenarios and vocabulary priority. If they're vegetarian, teach "sin carne" in Survival tier. If they have allergies, teach allergy phrases as emergency vocabulary.
4. **Realistic prices**: Use actual local prices for ${trip.destinationCity} in number/shopping exercises.
5. **Cultural tips**: Include city-specific cultural tips relevant to their travel dates and destination.

## Output Format
Respond with valid JSON only:
{
  "tiers": [
    {
      "id": 1,
      "name": "Survival",
      "description": "...",
      "topics": [
        {
          "id": "t1-greeting",
          "title": "Greetings at your Barcelona hotel",
          "description": "Learn to greet staff at Hotel [real hotel area] in the Gothic Quarter",
          "tierId": 1,
          "vocabulary": ["hola", "buenos días", "buenas tardes", "por favor", "gracias"],
          "scenarioSetting": "Reception desk at a hotel in Barri Gòtic, Barcelona",
          "culturalTip": "In Catalonia, locals may greet you with 'Bon dia' (Catalan) as well as 'Buenos días'"
        }
      ]
    }
  ]
}

Generate ${tiers.map((t) => `${t.topicTemplates.length} topics for Tier ${t.id}`).join(", ")}.
Each topic needs: id, title, description, tierId, vocabulary (8-12 key words/phrases), scenarioSetting (specific real location), and culturalTip (optional but encouraged).

Make the vocabulary and settings feel real and local to ${trip.destinationCity}. This student should feel like their course was designed specifically for THEIR trip.`;
}
