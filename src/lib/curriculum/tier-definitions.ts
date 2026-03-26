import type { TargetLevel } from "@/lib/types/curriculum";

export interface TierDefinition {
  id: number;
  name: string;
  description: string;
  topicTemplates: string[];
}

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: 1,
    name: "Survival",
    description: "Emergency phrases, greetings, numbers, and essential requests",
    topicTemplates: [
      "Emergency phrases & asking for help",
      "Greetings & farewells",
      "Numbers 1-20 & prices",
      "\"I don't understand\" & \"Do you speak English?\"",
      "Please, thank you & basic politeness",
    ],
  },
  {
    id: 2,
    name: "Essentials",
    description: "Directions, transport, essential places, and asking prices",
    topicTemplates: [
      "Asking for directions",
      "Transport vocabulary & phrases",
      "Essential places (hospital, pharmacy, bank, hotel)",
      "\"How much?\" & basic shopping",
      "\"Where is...?\" & finding places",
    ],
  },
  {
    id: 3,
    name: "Getting Around",
    description: "Taxi, bus, train, hotel check-in, restaurant ordering, paying the bill",
    topicTemplates: [
      "Taking a taxi",
      "Using public transport (bus/metro/train)",
      "Hotel check-in & check-out",
      "Ordering at a restaurant",
      "Reading a menu & paying the bill",
    ],
  },
  {
    id: 4,
    name: "Social",
    description: "Introductions, likes/dislikes, small talk, compliments",
    topicTemplates: [
      "Introducing yourself",
      "Talking about likes & dislikes",
      "Small talk & conversation",
      "Giving & receiving compliments",
      "Talking about your plans",
    ],
  },
  {
    id: 5,
    name: "Confidence",
    description: "Handling misunderstandings, bargaining, making plans, phone numbers",
    topicTemplates: [
      "Handling misunderstandings",
      "Bargaining & negotiating",
      "Making plans & invitations",
      "Phone numbers & contact info",
      "Putting it all together",
    ],
  },
];

/**
 * Returns which tiers to include based on target level.
 */
export function getTiersForLevel(level: TargetLevel): TierDefinition[] {
  switch (level) {
    case "survival":
      return TIER_DEFINITIONS.slice(0, 2); // tiers 1-2
    case "conversational":
      return TIER_DEFINITIONS.slice(0, 4); // tiers 1-4
    case "confident":
      return TIER_DEFINITIONS; // all 5
  }
}
