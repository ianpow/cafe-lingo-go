import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface PhrasebookRequest {
  city: string;
  country: string;
  language: string;
  languageName: string;
  foodPreferences: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: PhrasebookRequest = await request.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Create a practical travel phrasebook for someone visiting ${body.city}, ${body.country} who speaks English and is learning ${body.languageName}. Food preferences: ${body.foodPreferences.join(", ") || "none"}.

Return JSON only with this structure:
{
  "categories": [
    {
      "id": "greetings",
      "name": "Greetings & Basics",
      "icon": "👋",
      "phrases": [
        {
          "phrase": "phrase in ${body.languageName}",
          "english": "English translation",
          "pronunciation": "phonetic pronunciation guide",
          "context": "When/where to use this"
        }
      ]
    }
  ]
}

Include these categories with 6-8 phrases each:
1. "greetings" - Greetings & Basics (hello, goodbye, please, thank you, excuse me, sorry, yes, no)
2. "restaurant" - At the Restaurant (ordering, asking about dishes, the bill, dietary needs based on their food preferences)
3. "directions" - Getting Around (where is, left, right, straight, how far, nearest, taxi, bus, metro — use real ${body.city} transport)
4. "shopping" - Shopping & Markets (how much, too expensive, discount, sizes, colours, paying — reference real ${body.city} markets/shops)
5. "hotel" - At the Hotel (check-in, key, wifi, breakfast, room problem, checkout)
6. "pharmacy" - Health & Pharmacy (headache, stomach, allergies, medicine, doctor, hospital)
7. "social" - Small Talk (my name is, where are you from, I'm from Scotland, do you speak English, I'm learning ${body.languageName}, beautiful city)
8. "emergency" - Emergency & Help (help, police, hospital, I'm lost, stolen, I need, call)
9. "compliments" - Being Polite (the food is delicious, beautiful place, you're very kind, thank you so much, what do you recommend)
10. "numbers" - Numbers & Money (1-10, 20, 50, 100, how much does it cost, the bill please, do you accept card, change)

All phrases must be in ${body.languageName} with accurate pronunciation guides. Tailor restaurant phrases to their food preferences and use real ${body.city} context where relevant.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response");
    }

    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const phrasebook = JSON.parse(jsonStr);
    return NextResponse.json(phrasebook);
  } catch (error) {
    console.error("Phrasebook generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate phrasebook" },
      { status: 500 }
    );
  }
}
