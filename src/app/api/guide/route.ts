import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GuideRequest {
  city: string;
  country: string;
  language: string;
  languageName: string;
  interests: string[];
  foodPreferences: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GuideRequest = await request.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Create a practical travel guide for ${body.city}, ${body.country} for someone learning ${body.languageName}. Their interests: ${body.interests.join(", ") || "general"}. Food preferences: ${body.foodPreferences.join(", ") || "none"}.

Return JSON only with this structure:
{
  "transport": {
    "overview": "Brief transport overview for the city",
    "types": [
      {
        "name": "Metro/Bus/Taxi/etc",
        "description": "How it works, what to expect",
        "ticketInfo": "How to buy tickets, typical prices in euros",
        "usefulPhrases": [
          {"phrase": "phrase in ${body.languageName}", "english": "English translation", "when": "When to use it"}
        ],
        "tips": ["practical tip 1", "practical tip 2"]
      }
    ]
  },
  "attractions": [
    {
      "name": "Real attraction name",
      "area": "Neighbourhood/area name",
      "description": "Brief description",
      "tip": "Practical visitor tip",
      "price": "Entry cost or 'Free'",
      "usefulPhrase": {"phrase": "phrase in ${body.languageName}", "english": "English meaning"}
    }
  ],
  "emergency": {
    "numbers": [
      {"service": "Police/Ambulance/etc", "number": "phone number"}
    ],
    "phrases": [
      {"phrase": "phrase in ${body.languageName}", "english": "English translation", "pronunciation": "phonetic guide"}
    ]
  },
  "eating": {
    "mealTimes": "When locals eat breakfast/lunch/dinner",
    "tipping": "Tipping customs",
    "mustTry": [
      {"dish": "dish name", "description": "what it is", "price": "typical price"}
    ],
    "dietaryPhrases": [
      {"phrase": "phrase in ${body.languageName}", "english": "English", "pronunciation": "phonetic"}
    ]
  }
}

Include 3-4 transport types, 6-8 attractions personalised to their interests, 5-6 emergency phrases, and 4-6 must-try dishes considering their food preferences. All phrases should be in ${body.languageName}. Use REAL, accurate information about ${body.city}.`,
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

    const guide = JSON.parse(jsonStr);

    return NextResponse.json(guide);
  } catch (error) {
    console.error("Guide generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate guide" },
      { status: 500 }
    );
  }
}
