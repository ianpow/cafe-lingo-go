import { getLanguage } from "@/lib/config/language-registry";
import type { CurriculumTopic, TargetLanguage } from "@/lib/types/curriculum";

export function buildLessonGeneratePrompt(
  topic: CurriculumTopic,
  profile: { name: string; age: number; country: string },
  trip: {
    destinationCity: string;
    destinationCountry: string;
    foodPreferences: string[];
    interests: string[];
    language: TargetLanguage;
  },
  previousVocabulary: string[]
): string {
  const langName = getLanguage(trip.language).name;
  const langCode = trip.language;

  return `You are creating a single interactive ${langName} lesson scenario for a language learning app.

## Student Profile
- Name: ${profile.name}, Age: ${profile.age}, From: ${profile.country}
- Destination: ${trip.destinationCity}, ${trip.destinationCountry}
- Food preferences: ${trip.foodPreferences.join(", ") || "none"}
- Interests: ${trip.interests.join(", ") || "none"}

## Topic to Teach
- Title: ${topic.title}
- Description: ${topic.description}
- Setting: ${topic.scenarioSetting}
- Key vocabulary: ${topic.vocabulary.join(", ")}
${topic.culturalTip ? `- Cultural tip: ${topic.culturalTip}` : ""}

## Previously Learned Vocabulary (don't re-teach, but can use)
${previousVocabulary.length > 0 ? previousVocabulary.join(", ") : "None yet — this is an early lesson"}

## Scenario Requirements
1. Set the scenario in the SPECIFIC location: ${topic.scenarioSetting}
2. Create exactly 4 conversational turns (keep it concise!)
3. Each turn has: the avatar's line (in ${langName}), what the user should say back (in ${langName}), and 2-3 vocabulary items
4. Build from simple to slightly more complex within the scenario
5. Use realistic, natural ${langName} at beginner level (A1-A2)
6. Include real place references for ${trip.destinationCity}
7. The avatar is a friendly local character (waiter, taxi driver, hotel staff, etc.)
8. Keep acceptableVariations to 1-2 alternatives max
9. grammarNote is optional — only include if genuinely useful

## Output Format
Respond with valid JSON only. Use this exact Scenario/Turn structure:
{
  "id": "${topic.id}-lesson",
  "title": "${topic.title}",
  "titleEs": "[title in ${langName}]",
  "titleLocal": "[title in ${langName}]",
  "description": "[brief scenario description]",
  "setting": "${topic.scenarioSetting}",
  "language": "${langCode}",
  "turns": [
    {
      "id": 1,
      "avatarLine": "[${langName} greeting/line from the character]",
      "avatarLineEn": "[English translation]",
      "expectedUserPhrase": "[What the student should say in ${langName}]",
      "expectedUserPhraseEn": "[English translation]",
      "acceptableVariations": ["[alternative acceptable phrases]"],
      "vocabulary": [
        {
          "word": "[${langName} word]",
          "translation": "[English]",
          "pronunciation": "[phonetic guide]",
          "partOfSpeech": "[noun/verb/phrase/etc.]"
        }
      ],
      "grammarNote": "[optional brief grammar tip]",
      "difficulty": "easy"
    }
  ]
}

Make the conversation feel natural and immersive — as if ${profile.name} is really there in ${trip.destinationCity}.`;
}
