# CafeLingo Go

## Project Overview
CafeLingo Go is a personalised, deadline-driven language learning app. Users enter their holiday destination, date, target fluency level, and personal info. The app generates a structured curriculum with daily lessons and challenges to reach the desired fluency by their holiday.

**Repo:** https://github.com/ianpow/cafe-lingo-go.git
**Production:** https://go.cafelingo.co.uk (deployed on Vercel)
**Local path:** E:/Claude Projects/cafe-lingo-go
**Reference app:** E:/Claude Projects/cafe-lingo (the original CafeLingo - do NOT modify)

## Tech Stack
- Next.js 16 + TypeScript + Tailwind CSS v4
- Zustand (with persist/localStorage) for state management
- Anthropic Claude (Haiku 4.5 for generation, Sonnet for chat) via `@anthropic-ai/sdk`
- ElevenLabs TTS (multilingual_v2) for avatar speech
- OpenAI Whisper STT for speech-to-text
- Azure Speech REST API for pronunciation assessment
- TalkingHead.js v1.7 for 3D avatar with lip sync
- Male/female avatar models (male.glb, female.glb)
- Vercel Speed Insights for performance monitoring
- Vercel Hobby plan, deployed to `lhr1` (London) region

## Current Status (March 2026)
**All core features are built and deployed.** The app is functional end-to-end:
- Onboarding, curriculum generation, lesson delivery, SRS review, drills
- All Phase 7 "during-the-trip" features (translate, phrasebook, passport, culture, journal, menu scanner, city guide)
- Settings with trip management (edit, archive/restore, delete, regenerate curriculum)
- Light/dark/system theme support
- Tabbed dashboard (Learn / Travel)

Starting with Spanish and Italian. French to follow.

## Key Architecture Decisions

### Curriculum Generation — Tier-by-Tier
Curriculum is generated one tier at a time (not all at once) to prevent JSON truncation on Vercel's token limits. Each tier (5 topics) fits within 4096 tokens.

```
POST /api/curriculum/generate
  → for each tier: call Claude Haiku 4.5 with buildTierPrompt()
  → assistant prefill: "{" to force JSON output
  → max_tokens: 4096 per tier
  → stop_reason check: reject if "max_tokens" (truncated)
```

**Key file:** `src/app/api/curriculum/generate/route.ts`

### Lesson Generation
Each lesson scenario is generated on-demand when the user starts a topic. Uses Claude Haiku 4.5 with exactly 4 conversational turns, 2-3 vocabulary items per turn.

**Key file:** `src/app/api/lesson-generate/route.ts`

**Important:** The lesson page sends only slim trip data (city, country, food prefs, interests, language) — NOT the full trip object with curriculum, to keep request size small.

### Lazy Anthropic Client Initialisation
ALL API routes use lazy initialisation for the Anthropic client to prevent cold start crashes on Vercel:
```typescript
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
```
**Never** use module-level `const anthropic = new Anthropic()` — this crashes on Vercel if the env var isn't available at import time.

### Pronunciation Scoring Curve
Azure Speech tends to give 85-100 for nearly any attempt. A piecewise linear scoring curve in `/api/pronunciation/route.ts` stretches the meaningful range:
- Azure 95 → displays ~88
- Azure 90 → displays ~76
- Azure 85 → displays ~64
- Azure 80 → displays ~52

The `useConversationFlow` hook always calls `/api/pronunciation` first, falling back to client-side estimation only if the API fails. No env var gating.

### Smart Daily Challenge Selection
`src/lib/curriculum/challenge-selector.ts` uses `selectDailyChallenge()` with SRS-aware logic:
1. If 5+ SRS items are due → challenge becomes `flashcard-review`
2. If scheduled challenge duplicates "Next Lesson" (same uncompleted topic) → switches to a review challenge for a completed topic
3. Day 1 with no completed topics → hides challenge (would duplicate Next Lesson CTA)

### Theme System — CSS Variables
All colors use CSS custom properties (`--color-primary`, `--color-success`, `--color-error`, etc.) for light/dark mode. **Never use hardcoded Tailwind colors** like `text-green-400` — use `text-[var(--color-success)]` instead. For transparent backgrounds, use `color-mix()`:
```css
bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)]
```

### Reset All Data
Settings page "Delete Everything" clears localStorage keys directly and does `window.location.href = "/onboarding"` (hard navigation) to avoid React re-render crashes from partially cleared Zustand stores. Store keys:
- `cafelingo-go-user`, `cafelingo-go-trips`, `cafelingo-go-srs`
- `cafelingo-go-streak`, `cafelingo-go-theme`, `cafelingo-go-journal`

### Mobile Layout Pattern
Use `h-[100dvh]` (dynamic viewport height) instead of `min-h-screen` / `100vh` for full-screen pages (lesson, review). Mobile browsers' address bar and nav buttons cause `100vh` to extend behind chrome, pushing content off-screen. Pin bottom controls with `flex-shrink-0` and `env(safe-area-inset-bottom)` for notched phones.

### HelpMeSay Floating Button
Hidden on `/lesson`, `/review`, `/drill` pages (via `usePathname` check) to avoid overlapping interactive controls like record buttons and score buttons.

## User Profile Captures
- Name, age, country (default: Scotland)
- Destination city, holiday date, target level (survival/conversational/confident)
- Food preferences, interests
- Avatar gender (male/female)

## Curriculum Structure (5 tiers, taught in order)
1. **Survival** - Emergency phrases, greetings, numbers 1-20, "I don't understand", "Do you speak English?"
2. **Essentials** - Directions, transport words, "how much?", "where is...?", essential place names
3. **Getting Around** - Taxi/bus/train phrases, hotel check-in/out, restaurant ordering, reading a menu, paying the bill
4. **Social** - Introductions, likes/dislikes, small talk, compliments
5. **Confidence** - Handling misunderstandings, bargaining, making plans, phone numbers

Target level determines how many tiers: survival=1-2, conversational=1-4, confident=all 5.

## Deep Personalisation (City + Interests + Preferences)

The destination city, user interests, and food preferences drive content generation at EVERY level. This is the key differentiator of CafeLingo Go.

### City-Specific Content
Scenarios use real places, local dishes, actual transport systems, realistic prices, real neighbourhoods, and city-specific customs.

### Interest-Driven Scenarios
Football → match tickets, stadium directions. History → museum exhibits. Nightlife → bar ordering. Art → gallery vocab. Nature → hiking trails. Shopping → market bargaining. Architecture → building descriptions. Music → concert tickets. Photography → asking permission.

### Food Preferences Shape Survival Vocabulary
Vegetarian/vegan needs become SURVIVAL tier vocabulary. Allergies are taught as emergency phrases. Adventurous eaters get local delicacy names.

## Daily Challenge Types
- `vocab-recall` - Multiple choice "What does X mean?"
- `listen-repeat` - Hear phrase, repeat it (TTS + STT + pronunciation)
- `scenario-conversation` - Full avatar conversation (reuses lesson page)
- `how-would-you-say` - Free-form speaking prompt
- `cultural-tip` - Read a cultural insight about destination
- `flashcard-review` - Spaced repetition session

## Daily Schedule Generation
Built at curriculum generation time in `schedule-engine.ts`:
- **Pass 1**: Each topic gets one day as `scenario-conversation` (in order)
- **Pass 2**: Remaining days get review challenges cycling through topics with varied types

## Spaced Repetition
SM-2 algorithm: intervals 1→3→7→14→30 days. Words enter SRS after completing a lesson. The challenge selector automatically pushes flashcard review when 5+ items are due.

## Pages
- `/` - Redirect to /onboarding (no profile) or /dashboard (has profile)
- `/onboarding` - 4-step form: Welcome → Destination → Goals → Summary/Generate
- `/dashboard` - **Tabbed layout** (Learn / Travel) with compact header, stats strip, smart daily challenge, Next Lesson CTA, curriculum timeline
- `/lesson` - Avatar conversation page (scrollable middle, pinned bottom controls)
- `/review` - SRS flashcard review (pinned score buttons at bottom with `100dvh`)
- `/drill` - Quick drills (vocab recall, listen-repeat, how-would-you-say)
- `/vocab` - Browse all learned vocabulary
- `/settings` - Profile editing, trip management (edit/archive/restore/delete/regenerate), theme, stats, danger zone
- `/translate` - Two-way translation
- `/phrasebook` - Categorised phrase reference by situation
- `/passport` - Must-know pronunciation phrases with scoring
- `/culture` - Cultural dos & don'ts cards
- `/journal` - Daily recap word journal
- `/menu-scanner` - Camera menu translation via Claude Vision
- `/guide` - AI-generated city guide

## API Routes

### Ported from cafe-lingo (with lazy init)
- `/api/tts` - ElevenLabs TTS (male/female voice maps)
- `/api/stt` - OpenAI Whisper
- `/api/pronunciation` - Azure Speech REST API + scoring curve
- `/api/chat` - Claude conversation responses

### New for CafeLingo Go (all use lazy Anthropic init)
- `/api/curriculum/generate` - Tier-by-tier curriculum generation (Claude Haiku 4.5)
- `/api/curriculum/daily` - Daily challenge selection (uses `selectDailyChallenge`)
- `/api/lesson-generate` - Single scenario generation (Claude Haiku 4.5, 4 turns)
- `/api/translate` - Translation with pronunciation
- `/api/guide` - City guide generation
- `/api/phrasebook` - Categorised phrasebook generation
- `/api/passport` - Must-know phrases generation
- `/api/culture` - Cultural dos & don'ts generation
- `/api/journal/enrich` - Enriches user-logged words with translations
- `/api/menu-scanner` - Claude Vision menu reading

All API routes export `maxDuration = 60` for Vercel serverless timeout.

## Zustand Stores (all persisted to localStorage)
- `user-store.ts` (`cafelingo-go-user`) - UserProfile
- `trip-store.ts` (`cafelingo-go-trips`) - Trips, curriculum, cached scenarios, generation state
- `srs-store.ts` (`cafelingo-go-srs`) - Spaced repetition items
- `streak-store.ts` (`cafelingo-go-streak`) - Daily streak tracking
- `theme-store.ts` (`cafelingo-go-theme`) - Light/dark/system preference
- `journal-store.ts` (`cafelingo-go-journal`) - Travel journal entries
- `lesson-store.ts` (NOT persisted) - Current lesson session state

## Key Lib Modules
- `lib/curriculum/tier-definitions.ts` - Static tier metadata
- `lib/curriculum/schedule-engine.ts` - Distributes topics across available days
- `lib/curriculum/challenge-selector.ts` - Smart daily challenge selection with SRS override
- `lib/curriculum/srs-engine.ts` - SM-2 interval calculator + vocabToSRSItems converter
- `lib/prompts/curriculum-prompt.ts` - `buildTierPrompt()` for single-tier generation
- `lib/prompts/lesson-generate-prompt.ts` - Lesson scenario prompt (4 turns, 2-3 vocab each)
- `lib/hooks/useConversationFlow.ts` - Core lesson flow: TTS → record → STT → pronunciation → chat → advance
- `lib/config/language-registry.ts` - Language configs (locale, flag, voices, Azure locale, example cities)

## Key Components
- `components/avatar/TalkingHeadAvatar.tsx` - 3D avatar with lip sync (TalkingHead.js)
- `components/audio/RecordButton.tsx` - Microphone record button
- `components/chat/ChatPanel.tsx`, `ChatBubble.tsx`, `PromptCard.tsx` - Conversation UI
- `components/pronunciation/PronunciationFeedback.tsx` - Score ring + sub-scores + word badges
- `components/lesson/VocabularyPanel.tsx` - Key vocabulary display
- `components/HelpMeSay.tsx` - Floating translate button (hidden on lesson/review/drill)

## Deployment
- **Vercel Hobby plan** — `lhr1` region (London) for UK latency
- **vercel.json**: `{ "regions": ["lhr1"] }`
- **Vercel Speed Insights** enabled via `@vercel/speed-insights/next`
- Static assets are content-hashed (automatic cache busting on deploy)
- No service worker — users always get latest version on navigation

## Environment Variables (Vercel + .env.local)
- `ANTHROPIC_API_KEY` - Claude API
- `ELEVENLABS_API_KEY` - TTS
- `OPENAI_API_KEY` - Whisper STT
- `AZURE_SPEECH_KEY` - Pronunciation assessment
- `AZURE_SPEECH_REGION` - Azure region (e.g., `uksouth`)

## ElevenLabs Voice IDs
- Female: es=FGY2WhTYpPnrIDTdsKH5 (Laura), fr=XB0fDUnXU5powFXDhCwa (Charlotte)
- Male: es/fr=onwK4e9ZLuTAKqWW03F9 (Daniel multilingual)

## Known Gotchas & Patterns

1. **Never use module-level Anthropic client init** — causes Vercel cold start crashes
2. **Never use hardcoded Tailwind colors** — breaks in light mode. Always use CSS variables
3. **Use `h-[100dvh]` not `min-h-screen`** for full-screen mobile pages
4. **Curriculum generation is tier-by-tier** — the user explicitly required this: "it needs to be fed in small chunks, piece at a time to stay within limits"
5. **Lesson prompt asks for exactly 4 turns, 2-3 vocab each** — to stay within 4096 token limit
6. **Assistant prefill `"{"` technique** forces Claude to output JSON without markdown fences
7. **Reset All Data** uses `localStorage.removeItem()` + `window.location.href` — never Zustand `clearAll()` calls which cause cascading re-render crashes
8. **HelpMeSay** is hidden on pages with bottom controls (`/lesson`, `/review`, `/drill`)
9. **Pronunciation always tries Azure first**, falls back to client-side estimation — no env var gating
10. **`color-mix()` CSS function** is the pattern for theme-aware transparent backgrounds
11. **Trip archive** is non-destructive — sets `status: "archived"`, preserves all data, can be restored

## Data Models

### UserProfile
```typescript
interface UserProfile {
  id: string;
  name: string;
  age: number;
  country: string;
  avatarGender: "male" | "female";
  createdAt: string;
}
```

### Trip
```typescript
interface Trip {
  id: string;
  destinationCity: string;
  destinationCountry: string;
  holidayDate: string;
  targetLevel: "survival" | "conversational" | "confident";
  language: TargetLanguage;
  foodPreferences: string[];
  interests: string[];
  status: "active" | "archived" | "completed";
  curriculum?: Curriculum;
}
```

### Curriculum
```typescript
interface Curriculum {
  id: string;
  tripId: string;
  generatedAt: string;
  targetLevel: TargetLevel;
  totalDays: number;
  language: TargetLanguage;
  tiers: CurriculumTier[];
  dailySchedule: DailyScheduleEntry[];
  metadata: { destinationCity: string; userInterests: string[]; foodPreferences: string[]; };
}
```

### SRSItem
```typescript
interface SRSItem {
  vocabId: string;
  word: string;
  translation: string;
  pronunciation: string;
  partOfSpeech: string;
  language: TargetLanguage;
  interval: number;
  easeFactor: number; // SM-2, default 2.5
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string | null;
  correctCount: number;
  incorrectCount: number;
  lastScore: number;
  sourceTopicId: string;
}
```

## Future Improvements (Not Yet Built)
- Smarter schedule reordering based on performance (currently fixed at generation time)
- Offline support / PWA
- French language support
- More languages via language-registry expansion
- Performance-adaptive difficulty within lessons
