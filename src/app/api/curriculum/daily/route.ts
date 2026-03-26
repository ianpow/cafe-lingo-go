import { NextRequest, NextResponse } from "next/server";
import { selectDailyChallenge } from "@/lib/curriculum/challenge-selector";
import type { Curriculum } from "@/lib/types/curriculum";
import type { SRSItem } from "@/lib/types/curriculum";

interface DailyChallengeRequest {
  curriculum: Curriculum;
  dueItems: SRSItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body: DailyChallengeRequest = await request.json();
    const { curriculum, dueItems } = body;

    const challenge = selectDailyChallenge(
      curriculum.dailySchedule,
      curriculum.tiers,
      dueItems
    );

    if (!challenge) {
      return NextResponse.json(
        { error: "No challenge for today" },
        { status: 404 }
      );
    }

    return NextResponse.json(challenge);
  } catch (error) {
    console.error("Daily challenge error:", error);
    return NextResponse.json(
      { error: "Failed to get daily challenge" },
      { status: 500 }
    );
  }
}
