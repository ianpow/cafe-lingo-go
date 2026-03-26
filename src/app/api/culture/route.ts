import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CultureRequest {
  city: string;
  country: string;
  language: string;
  languageName: string;
  holidayDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CultureRequest = await request.json();

    const travelDate = new Date(body.holidayDate);
    const monthName = travelDate.toLocaleString("en", { month: "long" });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Generate cultural dos and don'ts cards for a tourist visiting ${body.city}, ${body.country} in ${monthName}. The tourist speaks English and is learning ${body.languageName}.

Return JSON only:
{
  "cards": [
    {
      "id": "1",
      "type": "do" | "dont",
      "title": "Short title",
      "description": "Detailed explanation of the custom/rule",
      "category": "dining|greetings|transport|tipping|dress|social|safety|festivals",
      "phrase": {"text": "useful phrase in ${body.languageName} related to this tip", "english": "translation", "pronunciation": "phonetic"} | null
    }
  ]
}

Include 18-22 cards covering:
- Dining etiquette (meal times, ordering customs, bill splitting, bread/water customs)
- Greeting customs (cheek kisses, handshakes, when to use formal/informal address)
- Tipping norms (restaurants, taxis, hotels — with specific amounts)
- Dress codes (churches, beaches, restaurants, local norms)
- Social customs (noise levels, personal space, photography etiquette)
- Transport etiquette (validating tickets, priority seating, taxi customs)
- Safety tips (tourist scams specific to ${body.city}, safe areas, late night)
- Any festivals or events happening in ${monthName} in ${body.city}
- Regional identity (e.g. Catalan vs Spanish, local pride, language sensitivity)

Make every card specific to ${body.city}, not generic. Include a relevant ${body.languageName} phrase where it would be helpful. Mix dos and don'ts roughly 50/50.`,
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

    const culture = JSON.parse(jsonStr);
    return NextResponse.json(culture);
  } catch (error) {
    console.error("Culture generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate cultural tips" },
      { status: 500 }
    );
  }
}
