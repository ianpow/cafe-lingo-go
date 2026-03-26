import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface PassportRequest {
  city: string;
  country: string;
  language: string;
  languageName: string;
  foodPreferences: string[];
  hotelAddress?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PassportRequest = await request.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Generate the 25 most critical phrases a traveller MUST be able to pronounce clearly when visiting ${body.city}, ${body.country}. These are phrases where being misunderstood could cause real problems — emergencies, allergies, getting lost, etc.

The traveller's food preferences/allergies: ${body.foodPreferences.join(", ") || "none specified"}.

Return JSON only:
{
  "phrases": [
    {
      "id": "1",
      "phrase": "phrase in ${body.languageName}",
      "english": "English translation",
      "pronunciation": "detailed phonetic pronunciation guide with syllable stress marked",
      "category": "emergency|health|food|directions|essential",
      "importance": "Why this phrase matters — e.g. 'Critical if you have allergies'",
      "tips": "Pronunciation tip — e.g. 'Roll the R at the start'"
    }
  ]
}

Include:
- 4-5 emergency phrases (help, call ambulance, police, I need a doctor, there's been an accident)
- 4-5 health/allergy phrases (I'm allergic to X based on their food preferences, I need medicine, where is the pharmacy, I don't feel well)
- 4-5 food/dietary phrases (tailored to their preferences — e.g. "no meat" for vegetarians, specific allergy declarations)
- 4-5 direction/location phrases (I'm lost, where is my hotel, take me to this address, how do I get to the airport)
- 5-6 essential daily phrases (I don't understand, do you speak English, please speak slowly, how much, thank you very much, my name is)

Every pronunciation guide must be detailed enough that someone with zero ${body.languageName} knowledge could read it aloud and be understood. Mark stressed syllables in CAPS.`,
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

    const passport = JSON.parse(jsonStr);
    return NextResponse.json(passport);
  } catch (error) {
    console.error("Passport generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate pronunciation passport" },
      { status: 500 }
    );
  }
}
