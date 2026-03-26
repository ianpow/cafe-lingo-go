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
      max_tokens: 4096,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
    });

    console.log(`[lesson-generate] Claude responded. Stop: ${response.stop_reason}, Usage: ${JSON.stringify(response.usage)}`);

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

    // If response was truncated (max_tokens), try to repair the JSON
    if (response.stop_reason === "max_tokens") {
      console.warn("[lesson-generate] Response truncated at max_tokens, attempting JSON repair");
      // Try to close any open arrays/objects to salvage partial data
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escaped = false;
      for (const ch of jsonStr) {
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
        if (ch === '[') openBrackets++;
        if (ch === ']') openBrackets--;
      }
      // Remove any trailing partial key/value
      jsonStr = jsonStr.replace(/,\s*"[^"]*"?\s*$/, '');
      jsonStr = jsonStr.replace(/,\s*$/, '');
      // Close open brackets and braces
      for (let i = 0; i < openBrackets; i++) jsonStr += ']';
      for (let i = 0; i < openBraces; i++) jsonStr += '}';
    }

    let scenario;
    try {
      scenario = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[lesson-generate] JSON parse failed. First 500 chars:", jsonStr.substring(0, 500));
      console.error("[lesson-generate] Last 300 chars:", jsonStr.substring(jsonStr.length - 300));
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
