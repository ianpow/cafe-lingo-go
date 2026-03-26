import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCurriculumPrompt } from "@/lib/prompts/curriculum-prompt";
import { buildDailySchedule, daysBetween } from "@/lib/curriculum/schedule-engine";
import type { UserProfile, Trip, Curriculum, CurriculumTier } from "@/lib/types/curriculum";

// Allow up to 60 seconds for curriculum generation (Claude can take a while)
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CurriculumGenerateRequest {
  profile: UserProfile;
  trip: Trip;
}

export async function POST(request: NextRequest) {
  try {
    const { profile, trip }: CurriculumGenerateRequest = await request.json();

    const today = new Date().toISOString().split("T")[0];
    const totalDays = daysBetween(today, trip.holidayDate);

    const prompt = buildCurriculumPrompt(profile, trip, totalDays);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Extract JSON from response (handle possible markdown code blocks)
    let jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const tiers: CurriculumTier[] = parsed.tiers.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => ({
        ...t,
        topics: t.topics.map(
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

    return NextResponse.json(curriculum);
  } catch (error) {
    console.error("Curriculum generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate curriculum" },
      { status: 500 }
    );
  }
}
