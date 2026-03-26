import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

interface TranslateRequest {
  text: string;
  from: string; // "en" or language code
  to: string; // "en" or language code
  fromName: string; // "English" or language name
  toName: string;
}

export async function POST(request: NextRequest) {
  try {
    const anthropic = getAnthropicClient();
    const { text, from, to, fromName, toName }: TranslateRequest =
      await request.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Translate the following from ${fromName} to ${toName}. Return JSON only:
{"translation": "the translated text", "pronunciation": "phonetic pronunciation guide for the translation", "literal": "word-by-word literal translation if different from natural translation, or null"}

Text to translate: "${text}"`,
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

    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      translation: parsed.translation,
      pronunciation: parsed.pronunciation || null,
      literal: parsed.literal || null,
      from,
      to,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
