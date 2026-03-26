"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { LANGUAGES, getSupportedCountries } from "@/lib/config/language-registry";
import type { LanguageCode } from "@/lib/config/language-registry";
import type { UserProfile, Trip } from "@/lib/types/curriculum";

const SUPPORTED_COUNTRIES = getSupportedCountries();

const INTEREST_OPTIONS = [
  "Football", "History", "Nightlife", "Art", "Nature",
  "Shopping", "Architecture", "Music", "Photography", "Food & Wine",
];

const FOOD_OPTIONS = [
  "Vegetarian", "Vegan", "Seafood lover", "Adventurous eater",
  "Nut allergy", "Gluten-free", "Dairy-free", "No restrictions",
];

export default function OnboardingPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const { addTrip, setActiveTrip, setCurriculum, setGenerating, setGenerationError } = useTripStore();

  // If we already have a profile, this is a "new trip" flow — skip step 0
  const isNewTrip = !!profile;
  const STEPS = isNewTrip
    ? ["Destination", "Goals", "Summary"] as const
    : ["Welcome", "Destination", "Goals", "Summary"] as const;

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile fields (step 0 — only for first-time users)
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || "",
    age: profile?.age?.toString() || "",
    country: profile?.country || "Scotland",
    avatarGender: (profile?.avatarGender || "female") as "male" | "female",
  });

  // Trip fields
  const [tripForm, setTripForm] = useState({
    destinationCountry: "Spain",
    destinationCity: "",
    holidayDate: "",
    targetLevel: "conversational" as "survival" | "conversational" | "confident",
    foodPreferences: [] as string[],
    interests: [] as string[],
  });

  // Derive language from selected country
  const selectedLanguage: LanguageCode =
    SUPPORTED_COUNTRIES.find((c) => c.country === tripForm.destinationCountry)?.language || "es";
  const langConfig = LANGUAGES[selectedLanguage];

  const updateTrip = (updates: Partial<typeof tripForm>) =>
    setTripForm((prev) => ({ ...prev, ...updates }));

  const toggleArrayItem = (field: "foodPreferences" | "interests", item: string) => {
    setTripForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i) => i !== item)
        : [...prev[field], item],
    }));
  };

  const canAdvance = () => {
    const currentStepName = STEPS[step];
    switch (currentStepName) {
      case "Welcome": return profileForm.name.trim().length > 0;
      case "Destination": return tripForm.destinationCity.trim().length > 0 && tripForm.holidayDate.length > 0;
      case "Goals": return true;
      case "Summary": return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setGenerating(true);

    // Create or reuse profile
    const userProfile: UserProfile = profile || {
      id: `user-${Date.now()}`,
      name: profileForm.name.trim(),
      age: parseInt(profileForm.age) || 30,
      country: profileForm.country,
      avatarGender: profileForm.avatarGender,
      createdAt: new Date().toISOString(),
    };

    if (!profile) {
      setProfile(userProfile);
    }

    // Create trip
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      userId: userProfile.id,
      destinationCity: tripForm.destinationCity.trim(),
      destinationCountry: tripForm.destinationCountry,
      holidayDate: tripForm.holidayDate,
      targetLevel: tripForm.targetLevel,
      language: selectedLanguage,
      foodPreferences: tripForm.foodPreferences,
      interests: tripForm.interests,
      createdAt: new Date().toISOString(),
      curriculum: null,
      status: "active",
    };

    addTrip(trip);
    setActiveTrip(trip.id);

    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: userProfile, trip }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detail = errorData.detail || errorData.error || `HTTP ${res.status}`;
        console.error("Curriculum API error:", res.status, detail);
        throw new Error(`Curriculum generation failed: ${detail}`);
      }

      const curriculum = await res.json();
      setCurriculum(trip.id, curriculum);
      setGenerating(false);
      router.push("/dashboard");
    } catch (err) {
      console.error("Curriculum generation failed:", err);
      setGenerationError(err instanceof Error ? err.message : "Generation failed");
      setIsSubmitting(false);
      router.push("/dashboard");
    }
  };

  const currentStepName = STEPS[step];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-8 pb-4">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === step
                ? "bg-[var(--color-primary)]"
                : i < step
                  ? "bg-[var(--color-primary-light)]"
                  : "bg-[var(--color-surface-light)]"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Step: Welcome (first-time only) */}
          {currentStepName === "Welcome" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">
                  Welcome to <span className="text-[var(--color-primary)]">CafeLingo Go</span>
                </h1>
                <p className="text-[var(--color-text-muted)]">
                  Learn a language for your holiday, personalised just for you.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">What&apos;s your name?</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Age</label>
                    <input
                      type="number"
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                      placeholder="30"
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Country</label>
                    <input
                      type="text"
                      value={profileForm.country}
                      onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Avatar</label>
                  <div className="flex gap-3">
                    {(["female", "male"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setProfileForm({ ...profileForm, avatarGender: g })}
                        className={`flex-1 py-3 rounded-lg border transition-colors cursor-pointer ${
                          profileForm.avatarGender === g
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-surface-light)] bg-[var(--color-surface)]"
                        }`}
                      >
                        {g === "female" ? "Female" : "Male"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Destination (country-first) */}
          {currentStepName === "Destination" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  {isNewTrip ? "Plan a new trip" : "Where are you going?"}
                </h2>
                <p className="text-[var(--color-text-muted)]">
                  Pick your destination and we&apos;ll tailor lessons to real places there.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Destination country</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUPPORTED_COUNTRIES.map(({ country, flag, language }) => (
                      <button
                        key={country}
                        onClick={() => {
                          updateTrip({ destinationCountry: country, destinationCity: "" });
                        }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors cursor-pointer text-left ${
                          tripForm.destinationCountry === country
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-surface-light)] bg-[var(--color-surface)]"
                        }`}
                      >
                        <span className="text-xl">{flag}</span>
                        <div>
                          <span className="font-medium text-sm">{country}</span>
                          <span className="text-xs text-[var(--color-text-muted)] ml-1">
                            {LANGUAGES[language].name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={tripForm.destinationCity}
                    onChange={(e) => updateTrip({ destinationCity: e.target.value })}
                    placeholder={`e.g. ${langConfig.exampleCities.slice(0, 3).join(", ")}`}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Holiday date</label>
                  <input
                    type="date"
                    value={tripForm.holidayDate}
                    onChange={(e) => updateTrip({ holidayDate: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-surface-light)] rounded-lg px-4 py-3 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Language confirmation */}
                <div className="bg-[var(--color-surface)] rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">{langConfig.flag}</span>
                  <div>
                    <p className="text-sm font-medium">You&apos;ll learn {langConfig.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{langConfig.nativeName}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Goals & Preferences */}
          {currentStepName === "Goals" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Your goals & preferences</h2>
                <p className="text-[var(--color-text-muted)]">
                  Help us personalise your {langConfig.name} lessons.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Target level</label>
                  <div className="space-y-2">
                    {([
                      { level: "survival" as const, label: "Survival", desc: "Emergency phrases & basic navigation" },
                      { level: "conversational" as const, label: "Conversational", desc: "Get around, order food, chat with locals" },
                      { level: "confident" as const, label: "Confident", desc: "Handle any situation with confidence" },
                    ]).map((opt) => (
                      <button
                        key={opt.level}
                        onClick={() => updateTrip({ targetLevel: opt.level })}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                          tripForm.targetLevel === opt.level
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                            : "border-[var(--color-surface-light)] bg-[var(--color-surface)]"
                        }`}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-sm text-[var(--color-text-muted)] ml-2">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Interests (select any)</label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => toggleArrayItem("interests", interest)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                          tripForm.interests.includes(interest)
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            : "border-[var(--color-surface-light)] bg-[var(--color-surface)]"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Food preferences</label>
                  <div className="flex flex-wrap gap-2">
                    {FOOD_OPTIONS.map((pref) => (
                      <button
                        key={pref}
                        onClick={() => toggleArrayItem("foodPreferences", pref)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                          tripForm.foodPreferences.includes(pref)
                            ? "border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]"
                            : "border-[var(--color-surface-light)] bg-[var(--color-surface)]"
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Summary */}
          {currentStepName === "Summary" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Ready to go!</h2>
                <p className="text-[var(--color-text-muted)]">
                  We&apos;ll create a personalised {langConfig.name} curriculum just for you.
                </p>
              </div>

              <div className="bg-[var(--color-surface)] rounded-xl p-5 space-y-3">
                <SummaryRow label="Name" value={profile?.name || profileForm.name} />
                <SummaryRow label="Destination" value={`${tripForm.destinationCity}, ${tripForm.destinationCountry}`} />
                <SummaryRow label="Holiday" value={tripForm.holidayDate} />
                <SummaryRow
                  label="Language"
                  value={`${langConfig.flag} ${langConfig.name}`}
                />
                <SummaryRow label="Level" value={tripForm.targetLevel} />
                <SummaryRow label="Interests" value={tripForm.interests.join(", ") || "None selected"} />
                <SummaryRow label="Food" value={tripForm.foodPreferences.join(", ") || "No restrictions"} />
                <SummaryRow label="Avatar" value={profile?.avatarGender || profileForm.avatarGender} />
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-lg border border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                  canAdvance()
                    ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white"
                    : "bg-[var(--color-surface-light)] text-[var(--color-text-muted)] cursor-not-allowed"
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating your plan...
                  </span>
                ) : (
                  "Generate My Curriculum"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
