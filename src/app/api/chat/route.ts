import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserMessage } from "@/lib/prompts/system-prompt";
import type { Turn, Message } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequest {
  userMessage: string;
  conversationHistory: Message[];
  currentTurn: Turn;
  scenarioContext: string;
  pronunciationScore: number;
  language?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const {
      userMessage,
      conversationHistory,
      currentTurn,
      scenarioContext,
      pronunciationScore,
      language = "es",
    } = body;

    const systemPrompt = buildSystemPrompt(scenarioContext, currentTurn, language);

    const messages: Anthropic.MessageParam[] = conversationHistory
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "avatar" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    messages.push({
      role: "user",
      content: buildUserMessage(userMessage, pronunciationScore),
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const parsed = JSON.parse(textBlock.text);

    return NextResponse.json({
      response: parsed.response,
      responseEn: parsed.responseEn,
      correction: parsed.correction || null,
      encouragement: parsed.encouragement || null,
      shouldAdvance: parsed.shouldAdvance ?? true,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response from AI" },
      { status: 500 }
    );
  }
}
