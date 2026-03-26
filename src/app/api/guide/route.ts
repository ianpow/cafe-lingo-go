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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Create a travel guide for ${body.city}, ${body.country}. Learning ${body.languageName}. Interests: ${body.interests.join(", ") || "general"}. Food: ${body.foodPreferences.join(", ") || "none"}.

Return ONLY JSON: {"transport":{"overview":"...","types":[{"name":"...","description":"...","ticketInfo":"...","usefulPhrases":[{"phrase":"...","english":"...","when":"..."}],"tips":["..."]}]},"attractions":[{"name":"...","area":"...","description":"...","tip":"...","price":"...","usefulPhrase":{"phrase":"...","english":"..."}}],"emergency":{"numbers":[{"service":"...","number":"..."}],"phrases":[{"phrase":"...","english":"...","pronunciation":"..."}]},"eating":{"mealTimes":"...","tipping":"...","mustTry":[{"dish":"...","description":"...","price":"..."}],"dietaryPhrases":[{"phrase":"...","english":"...","pronunciation":"..."}]}}

3 transport types, 5 attractions, 4 emergency phrases, 4 must-try dishes. Real info about ${body.city}. Be concise.`,
        },
        {
          role: "assistant",
          content: '{"transport":{',
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response");
    }

    let jsonStr = '{"transport":{' + textBlock.text.trim();
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
