/**
 * Language Registry — single source of truth for all language configuration.
 * To add a new language: add one entry here + drop two avatar GLBs into public/models/.
 */

export type LanguageCode = "es" | "fr" | "it" | "de" | "pt" | "pl" | "el";

export interface LanguageConfig {
  code: LanguageCode;
  name: string;               // "Spanish"
  nativeName: string;          // "Español"
  flag: string;                // "🇪🇸"
  country: string;             // Primary country
  countries: string[];         // All countries where spoken
  exampleCities: string[];     // For onboarding placeholder/suggestions

  // ElevenLabs TTS
  voiceFemale: string;         // ElevenLabs voice ID
  voiceMale: string;           // ElevenLabs voice ID

  // OpenAI Whisper STT
  whisperCode: string;         // Language code for Whisper

  // Azure Speech pronunciation assessment
  azureLocale: string;         // e.g. "es-ES"

  // TalkingHead lipsync module (closest available: en, fr, de, fi, lt)
  lipsyncModule: string;

  // Avatar model paths (fallback to generic if file doesn't exist)
  avatarFemale: string;        // e.g. "/models/female-es.glb"
  avatarMale: string;          // e.g. "/models/male-es.glb"
  avatarFallbackFemale: string; // "/models/female.glb"
  avatarFallbackMale: string;   // "/models/male.glb"

  // Greeting examples for Claude chat responses
  encouragementExamples: string;

  // Default greeting for the avatar
  greeting: string;
  greetingEn: string;
}

/**
 * ElevenLabs voice selections (multilingual_v2 model).
 * These are sensible defaults — swap for native-speaker-approved voices later.
 *
 * Female voices:
 *   ES: Laura (FGY2WhTYpPnrIDTdsKH5) — warm Spanish female
 *   FR: Charlotte (XB0fDUnXU5powFXDhCwa) — natural French female
 *   IT: Aria (9BWtsMINqrJLrRacOk9x) — expressive, works well with Italian
 *   DE: Freya (jsCqWAovK2LkecY7zXl4) — clear European female
 *   PT: Bella (EXAVITQu4vr4xnSDxMaL) — warm tone, good for Portuguese
 *   PL: Elli (MF3mGyEYCl7XYWbV9V6O) — soft female, reasonable for Polish
 *   EL: Rachel (21m00Tcm4TlvDq8ikWAM) — clear female, works for Greek
 *
 * Male voices:
 *   All: Daniel (onwK4e9ZLuTAKqWW03F9) — multilingual male, solid across all languages
 *   Swap per-language later for more authentic sound.
 */

const DANIEL = "onwK4e9ZLuTAKqWW03F9"; // Multilingual male default

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    country: "Spain",
    countries: ["Spain"],
    exampleCities: ["Barcelona", "Madrid", "Seville", "Valencia", "Málaga", "Granada"],
    voiceFemale: "FGY2WhTYpPnrIDTdsKH5", // Laura
    voiceMale: DANIEL,
    whisperCode: "es",
    azureLocale: "es-ES",
    lipsyncModule: "en",
    avatarFemale: "/models/female-es.glb",
    avatarMale: "/models/male-es.glb",
    avatarFallbackFemale: "/models/female.glb",
    avatarFallbackMale: "/models/male.glb",
    encouragementExamples: '"¡Perfecto!", "¡Muy bien!", "¡Claro que sí!"',
    greeting: "¡Hola! ¿Cómo estás?",
    greetingEn: "Hello! How are you?",
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    country: "France",
    countries: ["France"],
    exampleCities: ["Paris", "Lyon", "Nice", "Marseille", "Bordeaux", "Strasbourg"],
    voiceFemale: "XB0fDUnXU5powFXDhCwa", // Charlotte
    voiceMale: DANIEL,
    whisperCode: "fr",
    azureLocale: "fr-FR",
    lipsyncModule: "fr",
    avatarFemale: "/models/female-fr.glb",
    avatarMale: "/models/male-fr.glb",
    avatarFallbackFemale: "/models/female.glb",
    avatarFallbackMale: "/models/male.glb",
    encouragementExamples: '"Parfait!", "Très bien!", "Bien sûr!"',
    greeting: "Bonjour ! Comment allez-vous ?",
    greetingEn: "Hello! How are you?",
  },
  it: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    country: "Italy",
    countries: ["Italy"],
    exampleCities: ["Rome", "Florence", "Venice", "Milan", "Naples", "Amalfi"],
    voiceFemale: "9BWtsMINqrJLrRacOk9x", // Aria
    voiceMale: DANIEL,
    whisperCode: "it",
    azureLocale: "it-IT",
    lipsyncModule: "en",
    avatarFemale: "/models/female-it.glb",
    avatarMale: "/models/male-it.glb",
    avatarFallbackFemale: "/models/female.glb",
    avatarFallbackMale: "/models/male.glb",
    encouragementExamples: '"Perfetto!", "Molto bene!", "Certo!"',
    greeting: "Ciao! Come stai?",
    greetingEn: "Hello! How are you?",
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    country: "Germany",
    countries: ["Germany", "Austria"],
    exampleCities: ["Berlin", "Munich", "Hamburg", "Vienna", "Cologne", "Frankfurt"],
    voiceFemale: "jsCqWAovK2LkecY7zXl4", // Freya
    voiceMale: DANIEL,
    whisperCode: "de",
    azureLocale: "de-DE",
    lipsyncModule: "de",
    avatarFemale: "/models/female-de.glb",
    avatarMale: "/models/male-de.glb",
    avatarFallbackFemale: "/models/female.glb",
    avatarFallbackMale: "/models/male.glb",
    encouragementExamples: '"Perfekt!", "Sehr gut!", "Natürlich!"',
    greeting: "Hallo! Wie geht es Ihnen?",
    greetingEn: "Hello! How are you?",
  },
  pt: {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    flag: "🇵🇹",
    country: "Portugal",
    countries: ["Portugal"],
    exampleCities: ["Lisbon", "Porto", "Faro", "Sintra", "Cascais", "Évora"],
    voiceFemale: "EXAVITQu4vr4xnSDxMaL", // Bella
    voiceMale: DANIEL,
    whisperCode: "pt",
    azureLocale: "pt-PT",
    lipsyncModule: "en",
    avatarFemale: "/models/female-pt.glb",
    avatarMale: "/models/male-pt.glb",
    avatarFallbackFemale: "/models/female.glb",
    avatarFallbackMale: "/models/male.glb",
    encouragementExamples: '"Perfeito!", "Muito bem!", "Claro!"',
    greeting: "Olá! Como está?",
    greetingEn: "Hello! How are you?",
  },
  pl: {
    code: "pl",
    name: "Polish",
    nativeName: "Polski",
    flag: "🇵🇱",
    country: "Poland",
    countries: ["Poland"],
    exampleCities: ["Warsaw", "Kraków", "Gdańsk", "Wrocław", "Poznań", "Zakopane"],
    voiceFemale: "MF3mGyEYCl7XYWbV9V6O", // Elli
    voiceMale: DANIEL,
    whisperCode: "pl",
    azureLocale: "pl-PL",
    lipsyncModule: "lt",
    avatarFemale: "/models/female-pl.glb",
    avatarMale: "/models/male-pl.glb",
    avatarFallbackFemale: "/models/female.glb",
    avatarFallbackMale: "/models/male.glb",
    encouragementExamples: '"Doskonale!", "Bardzo dobrze!", "Oczywiście!"',
    greeting: "Cześć! Jak się masz?",
    greetingEn: "Hello! How are you?",
  },
  el: {
    code: "el",
    name: "Greek",
    nativeName: "Ελληνικά",
    flag: "🇬🇷",
    country: "Greece",
    countries: ["Greece"],
    exampleCities: ["Athens", "Thessaloniki", "Santorini", "Mykonos", "Crete", "Rhodes"],
    voiceFemale: "21m00Tcm4TlvDq8ikWAM", // Rachel
    voiceMale: DANIEL,
    whisperCode: "el",
    azureLocale: "el-GR",
    lipsyncModule: "en",
    avatarFemale: "/models/female-el.glb",
    avatarMale: "/models/male-el.glb",
    avatarFallbackFemale: "/models/female.glb",
    avatarFallbackMale: "/models/male.glb",
    encouragementExamples: '"Τέλεια!", "Πολύ καλά!", "Φυσικά!"',
    greeting: "Γεια σας! Τι κάνετε;",
    greetingEn: "Hello! How are you?",
  },
};

/** All supported countries, mapped to their language */
export const COUNTRY_TO_LANGUAGE: Record<string, LanguageCode> = {};
for (const lang of Object.values(LANGUAGES)) {
  for (const country of lang.countries) {
    COUNTRY_TO_LANGUAGE[country] = lang.code;
  }
}

/** Get all supported countries for the onboarding dropdown */
export function getSupportedCountries(): { country: string; language: LanguageCode; flag: string }[] {
  return Object.values(LANGUAGES).flatMap((lang) =>
    lang.countries.map((country) => ({
      country,
      language: lang.code,
      flag: lang.flag,
    }))
  );
}

/** Get language config, with fallback to Spanish */
export function getLanguage(code: LanguageCode | string): LanguageConfig {
  return LANGUAGES[code as LanguageCode] || LANGUAGES.es;
}

/** Get avatar model URL for a language + gender, with fallback */
export function getAvatarUrl(language: LanguageCode, gender: "male" | "female"): {
  primary: string;
  fallback: string;
} {
  const lang = getLanguage(language);
  return {
    primary: gender === "male" ? lang.avatarMale : lang.avatarFemale,
    fallback: gender === "male" ? lang.avatarFallbackMale : lang.avatarFallbackFemale,
  };
}

/** Get voice ID for TTS */
export function getVoiceId(language: LanguageCode, gender: "male" | "female"): string {
  const lang = getLanguage(language);
  return gender === "male" ? lang.voiceMale : lang.voiceFemale;
}
