import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildTierPrompt } from "@/lib/prompts/curriculum-prompt";
import { getTiersForLevel } from "@/lib/curriculum/tier-definitions";
import { buildDailySchedule, daysBetween } from "@/lib/curriculum/schedule-engine";
import type { UserProfile, Trip, Curriculum, CurriculumTier } from "@/lib/types/curriculum";

// Allow up to 60 seconds — we make multiple small API calls sequentially
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

/**
 * Generate a single tier via Claude. Each tier (5 topics) fits comfortably
 * within 4096 tokens, so truncation is impossible.
 */
async function generateTier(
  anthropic: Anthropic,
  tierPrompt: string,
  tierIndex: number
): Promise<CurriculumTier> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      { role: "user", content: tierPrompt },
      { role: "assistant", content: "{" },
    ],
  });

  console.log(`[curriculum] Tier ${tierIndex + 1} response: stop=${response.stop_reason}, tokens=${response.usage.output_tokens}`);

  if (response.stop_reason === "max_tokens") {
    throw new Error(`Tier ${tierIndex + 1} response was truncated — this should not happen`);
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`Tier ${tierIndex + 1}: no text response from Claude`);
  }

  let jsonStr = "{" + textBlock.text.trim();
  // Strip any markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const tier = JSON.parse(jsonStr);

  // Ensure all topics have completed: false
  if (tier.topics && Array.isArray(tier.topics)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tier.topics = tier.topics.map((topic: any) => ({
      ...topic,
      completed: false,
    }));
  }

  return tier as CurriculumTier;
}

export async function POST(request: NextRequest) {
  try {
    console.log("[curriculum] Starting generation...");

    const body = await request.json();
    const { profile, trip }: CurriculumGenerateRequest = body;

    if (!profile || !trip) {
      return NextResponse.json(
        { error: "Missing profile or trip in request body" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const totalDays = daysBetween(today, trip.holidayDate);
    const tierDefs = getTiersForLevel(trip.targetLevel);

    console.log(`[curriculum] ${trip.destinationCity}, ${trip.language}, ${trip.targetLevel} — ${tierDefs.length} tiers, ${totalDays} days`);

    const anthropic = getAnthropicClient();

    // Generate each tier independently — small, reliable API calls
    const tiers: CurriculumTier[] = [];
    for (let i = 0; i < tierDefs.length; i++) {
      const prompt = buildTierPrompt(tierDefs[i], profile, trip, totalDays);
      console.log(`[curriculum] Generating tier ${i + 1}/${tierDefs.length}: ${tierDefs[i].name}`);

      try {
        const tier = await generateTier(anthropic, prompt, i);
        tiers.push(tier);
      } catch (tierError) {
        const msg = tierError instanceof Error ? tierError.message : String(tierError);
        console.error(`[curriculum] Tier ${i + 1} failed:`, msg);
        return NextResponse.json(
          { error: `Failed to generate tier ${i + 1} (${tierDefs[i].name})`, detail: msg },
          { status: 500 }
        );
      }
    }

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

    const topicCount = tiers.reduce((sum, t) => sum + (t.topics?.length || 0), 0);
    console.log(`[curriculum] Success! ${tiers.length} tiers, ${topicCount} topics`);
    return NextResponse.json(curriculum);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[curriculum] Unhandled error:", errorMessage);
    return NextResponse.json(
      { error: "Failed to generate curriculum", detail: errorMessage },
      { status: 500 }
    );
  }
}
