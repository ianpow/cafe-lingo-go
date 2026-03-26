export interface Scenario {
  id: string;
  title: string;
  titleEs: string;       // kept for backward compat — same as titleLocal
  titleLocal?: string;    // title in the target language
  description: string;
  setting: string;
  language?: string;  // LanguageCode e.g. "es", "fr", "it", "de", "pt", "pl", "el"
  turns: Turn[];
}

export interface Turn {
  id: number;
  avatarLine: string;
  avatarLineEn: string;
  expectedUserPhrase: string;
  expectedUserPhraseEn: string;
  pronunciationGuide?: string;   // e.g., pinyin for Chinese — shown below the phrase
  acceptableVariations: string[];
  vocabulary: VocabItem[];
  grammarNote?: string;
  difficulty: "easy" | "medium" | "hard";
  branchingRules?: BranchingRule[];
}

export interface VocabItem {
  word: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: string;
}

export interface BranchingRule {
  condition: "high_score" | "low_score" | "wrong_phrase";
  nextTurnId: number;
  avatarResponse?: string;
}

export interface Message {
  role: "avatar" | "user" | "system";
  content: string;
  translation?: string;
  timestamp: number;
  pronunciationScore?: number;
}
