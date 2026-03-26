import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

interface EnrichRequest {
  words: string[];
  language: string;
  languageName: string;
  city: string;
}

export async function POST(request: NextRequest) {
  try {
    const anthropic = getAnthropicClient();
    const body: EnrichRequest = await request.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `A traveller in ${body.city} encountered these words/phrases today and wants to learn them. The words may be in ${body.languageName} or English (they might have heard them or seen them on signs).

Words: ${body.words.map((w) => `"${w}"`).join(", ")}

For each word, return JSON:
{
  "words": [
    {
      "original": "the word as provided",
      "translation": "translation (if original is ${body.languageName} → English, if English → ${body.languageName})",
      "pronunciation": "phonetic pronunciation of the ${body.languageName} version",
      "exampleSentence": "a practical example sentence in ${body.languageName} using this word, set in ${body.city}",
      "exampleTranslation": "English translation of the example sentence"
    }
  ]
}

Make example sentences practical and relevant to travelling in ${body.city}. Return JSON only.`,
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

    const enriched = JSON.parse(jsonStr);
    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Journal enrich error:", error);
    return NextResponse.json(
      { error: "Failed to enrich words" },
      { status: 500 }
    );
  }
}
