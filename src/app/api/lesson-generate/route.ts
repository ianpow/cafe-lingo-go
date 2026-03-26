import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildLessonGeneratePrompt } from "@/lib/prompts/lesson-generate-prompt";
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
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Extract JSON from response
    let jsonStr = textBlock.text.trim();
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
