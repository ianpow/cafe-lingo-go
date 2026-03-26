import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Create a travel phrasebook for ${body.city}, ${body.country}. Learning ${body.languageName}. Food: ${body.foodPreferences.join(", ") || "none"}.

Return ONLY JSON: {"categories":[{"id":"greetings","name":"Greetings","icon":"👋","phrases":[{"phrase":"...","english":"...","pronunciation":"...","context":"..."}]}]}

8 categories (greetings, restaurant, directions, shopping, hotel, pharmacy, emergency, numbers), 5-6 phrases each. Use real ${body.city} context. Be concise.`,
        },
        {
          role: "assistant",
          content: '{"categories":[',
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response");
    }

    let jsonStr = '{"categories":[' + textBlock.text.trim();
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
