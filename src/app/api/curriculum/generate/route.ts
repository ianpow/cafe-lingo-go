import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCurriculumPrompt } from "@/lib/prompts/curriculum-prompt";
import { buildDailySchedule, daysBetween } from "@/lib/curriculum/schedule-engine";
import type { UserProfile, Trip, Curriculum, CurriculumTier } from "@/lib/types/curriculum";

// Allow up to 60 seconds for curriculum generation (Claude can take a while)
export const maxDuration = 60;

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

interface CurriculumGenerateRequest {
  profile: UserProfile;
  trip: Trip;
}

export async function POST(request: NextRequest) {
  try {
    console.log("[curriculum] Starting generation...");

    const body = await request.json();
    const { profile, trip }: CurriculumGenerateRequest = body;

    if (!profile || !trip) {
      console.error("[curriculum] Missing profile or trip in request body");
      return NextResponse.json(
        { error: "Missing profile or trip in request body" },
        { status: 400 }
      );
    }

    console.log(`[curriculum] City: ${trip.destinationCity}, Language: ${trip.language}, Level: ${trip.targetLevel}`);

    const today = new Date().toISOString().split("T")[0];
    const totalDays = daysBetween(today, trip.holidayDate);

    const prompt = buildCurriculumPrompt(profile, trip, totalDays);
    console.log(`[curriculum] Prompt built. Total days: ${totalDays}. Calling Claude...`);

    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: '{"tiers":[' },
      ],
    });

    console.log(`[curriculum] Claude responded. Stop reason: ${response.stop_reason}, Usage: ${JSON.stringify(response.usage)}`);

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[curriculum] No text block in response. Content:", JSON.stringify(response.content));
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Reconstruct full JSON — we prefilled '{"tiers":[' in the assistant turn
    let jsonStr = '{"tiers":[' + textBlock.text.trim();
    // Strip any markdown code fences if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[curriculum] JSON parse failed. First 500 chars:", jsonStr.substring(0, 500));
      console.error("[curriculum] Last 200 chars:", jsonStr.substring(jsonStr.length - 200));
      console.error("[curriculum] Parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse curriculum JSON from Claude", detail: String(parseError) },
        { status: 500 }
      );
    }

    if (!parsed.tiers || !Array.isArray(parsed.tiers)) {
      console.error("[curriculum] Parsed JSON has no tiers array:", JSON.stringify(parsed).substring(0, 500));
      return NextResponse.json(
        { error: "Claude response missing tiers array" },
        { status: 500 }
      );
    }

    const tiers: CurriculumTier[] = parsed.tiers.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => ({
        ...t,
        topics: (t.topics || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (topic: any) => ({ ...topic, completed: false })
        ),
      })
    );

    const dailySchedule = buildDailySchedule(tiers, totalDays, today);

    const curriculum: Curriculum = {
      id: `curriculum-${Date.now()}`,
      tripId: trip.id,
      generatedAt: new Date().toISOString(),
      targetLevel: trip.targetLevel,
      totalDays,
      language: trip.language,
      tiers,
      dailySchedule,
      metadata: {
        destinationCity: trip.destinationCity,
        userInterests: trip.interests,
        foodPreferences: trip.foodPreferences,
      },
    };

    console.log(`[curriculum] Success! ${tiers.length} tiers, ${tiers.reduce((sum, t) => sum + (t.topics?.length || 0), 0)} topics`);
    return NextResponse.json(curriculum);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[curriculum] Unhandled error:", errorMessage);
    if (errorStack) console.error("[curriculum] Stack:", errorStack);
    return NextResponse.json(
      { error: "Failed to generate curriculum", detail: errorMessage },
      { status: 500 }
    );
  }
}
