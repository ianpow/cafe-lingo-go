export interface PronunciationResult {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: WordScore[];
}

export interface WordScore {
  word: string;
  accuracyScore: number;
  errorType: "None" | "Omission" | "Insertion" | "Mispronunciation";
  phonemes?: PhonemeScore[];
}

export interface PhonemeScore {
  phoneme: string;
  accuracyScore: number;
}
