import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildLessonGeneratePrompt } from "@/lib/prompts/lesson-generate-prompt";

export const maxDuration = 60;
import type { CurriculumTopic, TargetLanguage } from "@/lib/types/curriculum";

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

interface LessonGenerateRequest {
  topic: CurriculumTopic;
  profile: { name: string; age: number; country: string };
  trip: {
    destinationCity: string;
    destinationCountry: string;
    foodPreferences: string[];
    interests: string[];
    language: TargetLanguage;
  };
  previousVocabulary: string[];
}

export async function POST(request: NextRequest) {
  try {
    console.log("[lesson-generate] Starting...");

    const body: LessonGenerateRequest = await request.json();
    const { topic, profile, trip, previousVocabulary } = body;

    if (!topic || !profile || !trip) {
      console.error("[lesson-generate] Missing required fields");
      return NextResponse.json(
        { error: "Missing topic, profile, or trip in request body" },
        { status: 400 }
      );
    }

    console.log(`[lesson-generate] Topic: ${topic.title}, City: ${trip.destinationCity}`);

    const prompt = buildLessonGeneratePrompt(topic, profile, trip, previousVocabulary);

    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2500,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
    });

    console.log(`[lesson-generate] Claude responded. Stop: ${response.stop_reason}`);

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[lesson-generate] No text block in response");
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Reconstruct full JSON — we prefilled '{' in the assistant turn
    let jsonStr = "{" + textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let scenario;
    try {
      scenario = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[lesson-generate] JSON parse failed. First 500 chars:", jsonStr.substring(0, 500));
      console.error("[lesson-generate] Parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse lesson JSON", detail: String(parseError) },
        { status: 500 }
      );
    }

    console.log(`[lesson-generate] Success! ${scenario.turns?.length || 0} turns`);
    return NextResponse.json(scenario);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[lesson-generate] Unhandled error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to generate lesson", detail: errorMessage },
      { status: 500 }
    );
  }
}
