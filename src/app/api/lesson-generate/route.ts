import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildLessonGeneratePrompt } from "@/lib/prompts/lesson-generate-prompt";

export const maxDuration = 60;
import type { UserProfile, Trip, CurriculumTopic } from "@/lib/types/curriculum";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface LessonGenerateRequest {
  topic: CurriculumTopic;
  profile: UserProfile;
  trip: Trip;
  previousVocabulary: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: LessonGenerateRequest = await request.json();
    const { topic, profile, trip, previousVocabulary } = body;

    const prompt = buildLessonGeneratePrompt(topic, profile, trip, previousVocabulary);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Reconstruct full JSON — we prefilled '{' in the assistant turn
    let jsonStr = "{" + textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const scenario = JSON.parse(jsonStr);

    return NextResponse.json(scenario);
  } catch (error) {
    console.error("Lesson generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson" },
      { status: 500 }
    );
  }
}
