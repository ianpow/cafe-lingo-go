# CafeLingo Go

## Project Overview
CafeLingo Go is a personalised, deadline-driven language learning app. Users enter their holiday destination, date, target fluency level, and personal info. The app generates a structured curriculum with daily lessons and challenges to reach the desired fluency by their holiday.

**Repo:** https://github.com/ianpow/cafe-lingo-go.git
**Local path:** E:/Claude Projects/cafe-lingo-go
**Reference app:** E:/Claude Projects/cafe-lingo (the original CafeLingo - do NOT modify)

## Tech Stack
- Next.js 16 + TypeScript + Tailwind CSS
- Zustand (with persist/localStorage) for state
- ElevenLabs TTS (multilingual_v2), OpenAI Whisper STT, Azure Speech pronunciation, Anthropic Claude (Sonnet 4)
- TalkingHead.js v1.7 for 3D avatar with lip sync
- Male/female avatar models (male.glb, female.glb) - port from cafe-lingo public/models/

## Starting with Spanish only, French to follow.

## Key Concept
Unlike the original CafeLingo (static hand-written scenarios), CafeLingo Go uses Claude to **dynamically generate personalised lesson plans** based on user profile. Scenarios follow the same Scenario/Turn TypeScript interfaces so all existing avatar/conversation/pronunciation components work unchanged.

## User Profile Captures
- Name, age, country (default: Scotland)
- Destination city, holiday date, target level (survival/conversational/confident)
- Food preferences, interests
- Avatar gender (male/female)

## Curriculum Structure (5 tiers, taught in order)
1. **Survival** - Emergency phrases, greetings (hello, goodbye, good morning/afternoon/night, please, thank you), numbers 1-20, "I don't understand", "Do you speak English?"
2. **Essentials** - Directions (left, right, straight, metres, kilometres, blocks, landmarks), transport words, "how much?", "where is...?", essential place names (police, hospital, pharmacy, bank, hotel, taxi, bus, train, bar, restaurant)
3. **Getting Around** - Taxi/bus/train phrases, hotel check-in/out, restaurant ordering (breakfast, lunch, dinner), reading a menu, paying the bill
4. **Social** - Introductions (name, age, where from, what you do), likes/dislikes, small talk, compliments
5. **Confidence** - Handling misunderstandings, bargaining, making plans, phone numbers

Target level determines how many tiers: survival=1-2, conversational=1-4, confident=all 5.

## Deep Personalisation (City + Interests + Preferences)

The destination city, user interests, and food preferences should drive content generation at EVERY level, not just cultural tips. This is the key differentiator of CafeLingo Go.

### City-Specific Content
When Claude generates lessons and challenges, it must use real local knowledge:

**Real places and landmarks** - Scenarios are set in actual locations. Barcelona: "asking for directions to La Boqueria from Las Ramblas", "ordering at a cafe in the Gothic Quarter", "buying metro tickets at Passeig de Gràcia". Madrid: "finding the Prado from Sol", "ordering bocadillo de calamares at Plaza Mayor". Not generic "where is the museum?" but "¿Dónde está el Parque Güell?".

**Local food and dishes** - Each city has its own cuisine. The restaurant/cafe scenarios should teach the actual dishes they'll encounter:
- Barcelona: pa amb tomàquet, fideuà, crema catalana, escalivada, cava
- Madrid: cocido madrileño, bocadillo de calamares, churros con chocolate, callos
- Seville: gazpacho, salmorejo, pescaíto frito, espinacas con garbanzos
- Valencia: paella valenciana, horchata, agua de Valencia, all i pebre
- Generic Spain: tortilla española, jamón ibérico, patatas bravas, sangría

**City transport systems** - Teach the transport they'll actually use:
- Barcelona: metro (TMB), FGC trains, bus, Aerobus to airport, funicular to Montjuïc
- Madrid: metro, Cercanías trains, bus, airport express
- Seville: tram (MetroCentro), bus, taxi
- Smaller cities: primarily bus and taxi

**Realistic local prices** - Number practice uses real prices. "Un café con leche cuesta un euro ochenta" (€1.80 in Madrid), not abstract counting. Menu items, taxi fares, metro tickets — all at realistic local prices.

**Neighbourhood knowledge** - Directions scenarios reference real neighbourhoods and their characteristics. "You're in El Born and want to find a pharmacy" or "You're at Puerta del Sol and need to get to Retiro park".

**Local customs specific to the city/region** - Meal times, tipping norms, siesta hours, regional greetings, local festivals around their travel dates. Catalan greetings in Barcelona vs Andalusian expressions in Seville.

### Interest-Driven Scenarios
User interests directly shape which scenarios are generated:

- **Football** → Buying match tickets, talking about the local team in a bar, understanding matchday vocabulary, getting to the stadium. Barcelona=Camp Nou, Madrid=Santiago Bernabéu.
- **History** → Asking about exhibits at local museums, discussing landmarks, understanding historical plaques and signs.
- **Nightlife** → Ordering drinks at a bar, making small talk, understanding club/bar etiquette, late-night taxi.
- **Art** → Gallery vocabulary, discussing what you've seen, buying art prints.
- **Nature** → Hiking vocabulary, asking about trails, weather, national parks near the city.
- **Shopping** → Bargaining at markets, asking about sizes/colours, returning items, local speciality shops.
- **Architecture** → Describing buildings, asking about Gaudí/historical architecture, booking tours.
- **Music** → Buying concert tickets, talking about music preferences, flamenco vocabulary in Andalusia.
- **Photography** → Asking permission to take photos, describing scenes, asking locals about best viewpoints.

### Food Preferences Shape Survival Vocabulary
Food preferences aren't just for restaurant scenarios — they affect what's taught as essential vocabulary:
- **Vegetarian/Vegan** → "sin carne", "es vegetariano/vegano", "¿tiene opciones sin carne?", "¿qué lleva este plato?" become SURVIVAL tier, not social tier. These are genuinely essential for this user.
- **Seafood lover** → Local fish/shellfish names, market vocabulary, "¿qué pescado es fresco hoy?"
- **Allergies** → "Soy alérgico/a a...", "¿contiene frutos secos/gluten/lácteos?" — taught as emergency vocabulary.
- **Adventurous eater** → "¿Qué me recomienda?", "Quiero probar algo típico de aquí", local delicacy names.

### Cultural Tips Are City-Specific
Cultural tips should be relevant to their actual destination and travel dates:
- Festival calendar: if travelling during La Mercè (Barcelona, Sept), Feria de Abril (Seville, April), San Isidro (Madrid, May) etc.
- Local customs: Catalan vs Castilian expectations, regional identity awareness
- Practical tips: "Shops close 2-5pm in Seville but many stay open in Barcelona tourist areas"
- Tipping: "In Spain, tipping isn't expected but rounding up is appreciated"
- Timing: "Dinner before 9pm will get you an empty restaurant"

### How This Feeds Into the Prompt Templates
The curriculum generation prompt (`lib/prompts/curriculum-prompt.ts`) receives the full user profile and must:
1. Research/use knowledge of the specific destination city
2. Set every scenario in a real, named location within that city
3. Use actual local dishes, prices, transport, and landmarks
4. Prioritise vocabulary based on stated food preferences and interests
5. Generate cultural tips tied to the city and (if possible) the travel dates

The lesson generation prompt (`lib/prompts/lesson-generate-prompt.ts`) receives:
1. The topic being taught (e.g., "restaurant ordering")
2. The full user profile (city, interests, food prefs)
3. Previously learned vocabulary (to build on, not repeat)
4. Must set the scenario in a specific named venue/location in the destination city
5. Must use locally appropriate food, prices, customs

## Daily Challenge Types
- `vocab-recall` - Multiple choice "What does X mean?"
- `listen-repeat` - Hear phrase, repeat it (TTS + STT + pronunciation)
- `scenario-conversation` - Full avatar conversation (reuses lesson page)
- `how-would-you-say` - Free-form speaking prompt
- `cultural-tip` - Read a cultural insight about destination
- `flashcard-review` - Spaced repetition session

## Spaced Repetition
SM-2 algorithm: intervals 1→3→7→14→30 days. Words enter SRS after completing a lesson. Daily challenges automatically include due SRS items.

## Pages
- `/` - Redirect to /onboarding (no profile) or /dashboard (has profile)
- `/onboarding` - 4-step form: Welcome → Destination → Goals → Summary/Generate
- `/dashboard` - Countdown calendar, progress rings, daily challenge, streak, curriculum timeline
- `/lesson` - Reused conversation page (avatar + chat + pronunciation)
- `/review` - SRS flashcard review sessions
- `/drill` - Quick drills (vocab recall, listen-repeat, how-would-you-say)
- `/vocab` - Browse all learned vocabulary

## During-the-Trip Features (Phase 7)

### "Help Me Say" Floating Button
A persistent floating action button visible on all pages (except onboarding). User taps it, types what they want to say in English, gets instant translation with pronunciation and a play button. Implemented as a global component in layout. Think of it as a panic button for language — faster than navigating to the translate page.

### Conversation Phrasebook (`/phrasebook`)
Pre-generated, categorised phrase reference organised by real situations: "At the restaurant", "Getting a taxi", "At the pharmacy", "Hotel check-in", "Shopping", "Complaining politely", "Small talk", "Emergencies". Each phrase has target language text, English translation, pronunciation guide, and TTS playback. Generated via Claude based on destination city. Searchable and filterable by category. Designed to work as a quick offline-ready reference.

### Pronunciation Passport (`/passport`)
The 20-30 phrases you absolutely must be able to say clearly before your trip. Includes: hotel address, allergy declarations, "I'm lost", "call an ambulance", "where is the nearest...?", user's specific dietary needs. Each phrase has TTS playback and pronunciation scoring via Azure Speech. Progress tracking shows which phrases are "passport stamped" (scored above threshold). Perfect for drilling on the flight over.

### Cultural Dos & Don'ts (`/culture`)
Quick-reference swipeable cards generated by Claude for the specific destination city and travel dates. Covers: tipping norms, greeting customs, meal time expectations, dress codes for religious sites, local festival awareness, common tourist mistakes, regional identity sensitivity (e.g., Catalan vs Castilian). Each card has a do/don't classification, explanation, and optionally a useful phrase.

### Daily Recap Journal (`/journal`)
After each day on the trip, the user logs new words or phrases they encountered. The app uses Claude to provide translations, pronunciation, and example sentences, then automatically adds them to the SRS system. Over the trip, this builds a personal vocabulary journal that continues reinforcing after they return home. Stored in journal-store with Zustand persist.

### Menu Scanner (`/menu-scanner`)
User takes a photo of a restaurant menu. The image is sent to Claude's vision API which reads the menu items and returns structured translations with cultural context: dish name, translation, what it actually is, typical ingredients, price if visible, dietary flags (contains meat/dairy/gluten/nuts). Helps solve the universal traveller problem of staring at an incomprehensible menu.

## API Routes
Port unchanged from cafe-lingo:
- `/api/tts` - ElevenLabs TTS (with male/female voice maps)
- `/api/stt` - OpenAI Whisper
- `/api/pronunciation` - Azure Speech assessment
- `/api/chat` - Claude conversation responses

New:
- `/api/curriculum/generate` - Claude generates full curriculum from user profile
- `/api/curriculum/daily` - Returns today's challenge selection
- `/api/lesson-generate` - Claude generates a single Scenario on demand
- `/api/translate` - Claude translation with pronunciation and literal meaning
- `/api/guide` - Claude generates city guide (transport, attractions, emergency, eating)
- `/api/phrasebook` - Claude generates categorised phrasebook for destination
- `/api/passport` - Claude generates must-know pronunciation phrases
- `/api/culture` - Claude generates cultural dos & don'ts cards
- `/api/journal/enrich` - Claude enriches user-logged words with translations and example sentences
- `/api/menu-scanner` - Claude Vision reads and translates menu photos

## Components to Port from cafe-lingo (unchanged)
Copy these from E:/Claude Projects/cafe-lingo/src/ into this project's src/:
- `components/avatar/TalkingHeadAvatar.tsx`
- `components/audio/RecordButton.tsx`
- `components/chat/ChatBubble.tsx`, `ChatPanel.tsx`, `PromptCard.tsx`
- `components/pronunciation/PronunciationFeedback.tsx`
- `components/lesson/VocabularyPanel.tsx`
- `lib/audio/recorder.ts`, `audio-utils.ts`
- `lib/hooks/useConversationFlow.ts`
- `lib/store/lesson-store.ts`
- `lib/types/scenario.ts`, `pronunciation.ts`
- `lib/prompts/system-prompt.ts`

Also copy from E:/Claude Projects/cafe-lingo/:
- `public/models/male.glb`, `female.glb`, `mpfb.glb` → into this project's public/models/
- `.env.local` → copy and reuse same API keys (ELEVENLABS_API_KEY, OPENAI_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, ANTHROPIC_API_KEY)
- `app/layout.tsx`, `globals.css` → use as starting point (modify for Go branding)

Also reference E:/Claude Projects/cafe-lingo/src/ for these API routes to copy:
- `app/api/tts/route.ts`
- `app/api/stt/route.ts`
- `app/api/pronunciation/route.ts`
- `app/api/chat/route.ts`

## Components to Port with Modifications
- `LessonHeader` - Add tier badge, countdown ("Day 12 of 45"), back to dashboard
- `progress-store` - Extend with curriculum progress, streak, total minutes
- `lesson/page.tsx` - Load generated scenarios from curriculum-store, not just static routes

## New Components to Build
- **Onboarding**: StepWelcome, StepDestination, StepGoals, StepSummary, ProgressDots
- **Dashboard**: CountdownCalendar, DailyChallenge, StreakTracker, ProgressRing, CurriculumTimeline, QuickActions
- **Review**: FlashCard, ReviewSession, ReviewStats
- **Drills**: DrillSelector, VocabRecallDrill, ListenRepeatDrill, HowWouldYouSayDrill, CulturalTipCard

## New Stores (Zustand persist)
- `user-store.ts` - UserProfile
- `curriculum-store.ts` - Generated curriculum + cached lesson Scenarios
- `srs-store.ts` - Spaced repetition item states
- `streak-store.ts` - Daily streak tracking

## New Lib Modules
- `lib/curriculum/tier-definitions.ts` - Static tier metadata
- `lib/curriculum/schedule-engine.ts` - Distributes topics across available days
- `lib/curriculum/challenge-selector.ts` - Daily challenge selection algorithm
- `lib/curriculum/srs-engine.ts` - SM-2 interval calculator
- `lib/prompts/curriculum-prompt.ts` - Claude prompt for curriculum generation
- `lib/prompts/lesson-generate-prompt.ts` - Claude prompt for single lesson generation

## Build Order
### Phase 1: Foundation
1. Create Next.js app, install deps, port shared components/types/API routes from cafe-lingo
2. Create new TypeScript interfaces (UserProfile, Curriculum, DailyChallenge, SRSItem)
3. Create Zustand stores (user-store, curriculum-store, srs-store, streak-store)
4. Root routing logic (redirect based on profile existence)

### Phase 2: Onboarding
5. Onboarding page with 4 step components
6. Curriculum generation API + Claude prompt template
7. Tier definitions + schedule engine

### Phase 3: Dashboard
8. Dashboard page with countdown, progress rings, streak
9. Daily challenge component + challenge selector algorithm
10. Curriculum timeline, quick actions

### Phase 4: Lesson Generation
11. Lesson generation API (Claude generates Scenario on demand)
12. Extend lesson page to load generated scenarios

### Phase 5: Drills & Review
13. SRS engine (SM-2 calculator)
14. Review page with flashcards
15. Drill page with all drill types

### Phase 6: Polish
16. Profile editing, curriculum regeneration
17. Theming/branding, error handling, edge cases

### Phase 7: During-the-Trip Features
18. Instant two-way voice translator (`/translate`) — speak English, hear target language and vice versa
19. City guide (`/guide`) — AI-generated transport, attractions, emergency phrases, dining info
20. "Help Me Say" floating button — global quick-translate widget accessible from any page
21. Conversation Phrasebook (`/phrasebook`) — categorised, searchable phrase reference by situation
22. Pronunciation Passport (`/passport`) — the 20-30 must-know phrases with pronunciation scoring drill
23. Cultural Dos & Don'ts (`/culture`) — quick-reference cards for local customs, etiquette, events
24. Daily Recap Journal (`/journal`) — log new words encountered during the trip, auto-adds to SRS
25. Menu Scanner (`/menu-scanner`) — camera OCR of restaurant menus with translation and dish explanations

## Data Models

### UserProfile
```typescript
interface UserProfile {
  id: string;
  name: string;
  age: number;
  country: string; // default "Scotland"
  destinationCity: string;
  destinationCountry: string;
  holidayDate: string; // ISO date
  targetLevel: "survival" | "conversational" | "confident";
  targetLanguage: "es" | "fr";
  foodPreferences: string[];
  interests: string[];
  avatarGender: "male" | "female";
  createdAt: string;
}
```

### Curriculum
```typescript
interface Curriculum {
  id: string;
  userId: string;
  generatedAt: string;
  targetLevel: TargetLevel;
  totalDays: number;
  language: "es" | "fr";
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
  language: "es" | "fr";
  interval: number; // days
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

## ElevenLabs Voice IDs
- Female: es=FGY2WhTYpPnrIDTdsKH5 (Laura), fr=XB0fDUnXU5powFXDhCwa (Charlotte)
- Male: es/fr=onwK4e9ZLuTAKqWW03F9 (Daniel multilingual)
