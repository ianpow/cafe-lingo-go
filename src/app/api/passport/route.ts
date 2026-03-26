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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `Generate 20 critical phrases a traveller MUST pronounce clearly when visiting ${body.city}, ${body.country}. Food/allergies: ${body.foodPreferences.join(", ") || "none"}.

CRITICAL: ALL "phrase" fields MUST be in ${body.languageName} (NOT English). The "english" field is the English translation. Example if Spanish: "phrase":"¡Necesito un médico!","english":"I need a doctor!"

Return ONLY JSON: {"phrases":[{"id":"1","phrase":"IN ${body.languageName.toUpperCase()}","english":"English translation","pronunciation":"phonetic with STRESSED syllables","category":"emergency|health|food|directions|essential","importance":"why it matters","tips":"pronunciation tip"}]}

4 emergency, 4 health, 4 food/dietary, 4 directions, 4 essential. Be concise.`,
        },
        {
          role: "assistant",
          content: '{"phrases":[',
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response");
    }

    let jsonStr = '{"phrases":[' + textBlock.text.trim();
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
