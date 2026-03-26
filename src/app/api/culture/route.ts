import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CultureRequest {
  city: string;
  country: string;
  language: string;
  languageName: string;
  holidayDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CultureRequest = await request.json();

    const travelDate = new Date(body.holidayDate);
    const monthName = travelDate.toLocaleString("en", { month: "long" });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `Generate 12 cultural dos/don'ts cards for a tourist visiting ${body.city}, ${body.country} in ${monthName}. Learning ${body.languageName}.

Return ONLY JSON: {"cards":[{"id":"1","type":"do"|"dont","title":"...","description":"...","category":"dining|greetings|transport|tipping|dress|social|safety|festivals","phrase":{"text":"phrase in ${body.languageName}","english":"...","pronunciation":"phonetic"}|null}]}

Cover: dining, greetings, tipping, dress, social, transport, safety. Specific to ${body.city}. Be concise.`,
        },
        {
          role: "assistant",
          content: '{"cards":[',
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response");
    }

    let jsonStr = '{"cards":[' + textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const culture = JSON.parse(jsonStr);
    return NextResponse.json(culture);
  } catch (error) {
    console.error("Culture generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate cultural tips" },
      { status: 500 }
    );
  }
}
