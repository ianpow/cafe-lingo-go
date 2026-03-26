import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MenuScanRequest {
  imageBase64: string;
  language: string;
  languageName: string;
  city: string;
  foodPreferences: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: MenuScanRequest = await request.json();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: body.imageBase64,
              },
            },
            {
              type: "text",
              text: `You are helping a tourist in ${body.city} read a restaurant menu. The menu is in ${body.languageName}. The tourist's food preferences: ${body.foodPreferences.join(", ") || "none specified"}.

Read every item you can see on this menu and return JSON only:
{
  "restaurantName": "name if visible, or null",
  "items": [
    {
      "original": "dish name as written on the menu",
      "translation": "English translation",
      "description": "What this dish actually is — ingredients, cooking method, cultural context",
      "price": "price if visible, or null",
      "dietary": ["vegetarian", "contains-nuts", "contains-gluten", "contains-dairy", "contains-seafood", "spicy", "vegan"] (applicable flags),
      "recommendation": "recommended" | "caution" | "neutral",
      "recommendationReason": "Why — e.g. 'Contains meat (user is vegetarian)' or 'Classic local dish, must-try!'"
    }
  ],
  "summary": "Brief overview of the menu type and recommendations based on their preferences"
}

Mark items as "caution" if they conflict with the user's food preferences. Mark local specialities as "recommended". Be thorough — include every readable item. If something is partially obscured, do your best and note it.`,
            },
          ],
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

    const menu = JSON.parse(jsonStr);
    return NextResponse.json(menu);
  } catch (error) {
    console.error("Menu scanner error:", error);
    return NextResponse.json(
      { error: "Failed to read menu" },
      { status: 500 }
    );
  }
}
