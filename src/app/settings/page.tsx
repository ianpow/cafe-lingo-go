"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { useSRSStore } from "@/lib/store/srs-store";
import { useStreakStore } from "@/lib/store/streak-store";
import { getLanguage, getSupportedCountries, LANGUAGES } from "@/lib/config/language-registry";
import type { Trip } from "@/lib/types/curriculum";
import { useThemeStore } from "@/lib/store/theme-store";

export default function SettingsPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const clearProfile = useUserStore((s) => s.clearProfile);
  const trips = useTripStore((s) => s.trips);
  const removeTrip = useTripStore((s) => s.removeTrip);
  const updateTrip = useTripStore((s) => s.updateTrip);
  const clearSRS = useSRSStore((s) => s.clearAll);
  const streak = useStreakStore();

  const [name, setName] = useState(profile?.name || "");
  const [age, setAge] = useState(profile?.age?.toString() || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [avatarGender, setAvatarGender] = useState<"male" | "female">(
    profile?.avatarGender || "female"
  );
  const [saved, setSaved] = useState(false);
  const themeStore = useThemeStore();
  const setCurriculum = useTripStore((s) => s.setCurriculum);
  const setGenerating = useTripStore((s) => s.setGenerating);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<string | null>(null);
  const [regeneratingTrip, setRegeneratingTrip] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      router.replace("/onboarding");
    }
  }, [profile, router]);

  if (!profile) return null;

  const handleSave = () => {
    updateProfile({
      name: name.trim(),
      age: parseInt(age) || profile.age,
      country: country.trim(),
      avatarGender,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearTrips = useTripStore((s) => s.clearAll);
  const clearStreak = useStreakStore((s) => s.clearAll);

  const handleResetAll = () => {
    // Clear all localStorage directly first to avoid partial state issues
    if (typeof window !== "undefined") {
      const storeKeys = [
        "cafelingo-go-user",
        "cafelingo-go-trips",
        "cafelingo-go-srs",
        "cafelingo-go-streak",
        "cafelingo-go-theme",
        "cafelingo-go-journal",
      ];
      storeKeys.forEach((key) => localStorage.removeItem(key));
    }
    // Navigate away before React tries to re-render with cleared state
    window.location.href = "/onboarding";
  };

  const handleArchiveTrip = (tripId: string) => {
    updateTrip(tripId, { status: "archived" });
    setConfirmArchive(null);
  };

  const handleDeleteTrip = (tripId: string) => {
    removeTrip(tripId);
    setConfirmDelete(null);
  };

  const handleRegenerateCurriculum = async (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip || !profile) return;

    setRegeneratingTrip(tripId);
    setConfirmRegen(null);

    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, trip }),
      });

      if (!res.ok) throw new Error("Failed to regenerate curriculum");

      const curriculum = await res.json();
      setCurriculum(tripId, curriculum);
    } catch (err) {
      console.error("Regeneration failed:", err);
    } finally {
      setRegeneratingTrip(null);
    }
  };

  const activeTrips = trips.filter((t) => t.status === "active");
  const archivedTrips = trips.filter((t) => t.status === "archived" || t.status === "completed");

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-8">
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Profile
          </h2>
          <div className="bg-[var(--color-surface)] rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-4 py-2.5 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Avatar</label>
              <div className="flex gap-3">
                {(["female", "male"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setAvatarGender(g)}
                    className={`flex-1 py-2.5 rounded-lg border transition-colors cursor-pointer text-sm ${
                      avatarGender === g
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-surface-light)] bg-[var(--color-bg)]"
                    }`}
                  >
                    {g === "female" ? "Female" : "Male"}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-lg font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white transition-colors cursor-pointer"
            >
              {saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Appearance
          </h2>
          <div className="bg-[var(--color-surface)] rounded-xl p-5">
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="flex gap-2">
              {([
                { value: "light" as const, label: "Light", icon: "☀️" },
                { value: "dark" as const, label: "Dark", icon: "🌙" },
                { value: "system" as const, label: "System", icon: "💻" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => themeStore.setTheme(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-colors cursor-pointer text-sm ${
                    themeStore.theme === opt.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-surface-light)] bg-[var(--color-bg)]"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Stats
          </h2>
          <div className="bg-[var(--color-surface)] rounded-xl p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{streak.currentStreak}</p>
                <p className="text-xs text-[var(--color-text-muted)]">day streak</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{streak.totalLessonsCompleted}</p>
                <p className="text-xs text-[var(--color-text-muted)]">lessons</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{streak.totalMinutes}</p>
                <p className="text-xs text-[var(--color-text-muted)]">minutes</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--color-surface-light)] text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                Longest streak: <span className="font-medium text-[var(--color-text)]">{streak.longestStreak} days</span>
              </p>
            </div>
          </div>
        </section>

        {/* Active Trips Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Active Trips ({activeTrips.length})
          </h2>
          {activeTrips.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-xl p-5 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">No active trips</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrips.map((trip) => {
                const lang = getLanguage(trip.language);
                const completed = trip.curriculum?.tiers
                  .flatMap((t) => t.topics)
                  .filter((t) => t.completed).length || 0;
                const total = trip.curriculum?.tiers
                  .flatMap((t) => t.topics).length || 0;
                const isEditing = editingTrip === trip.id;
                const isRegenerating = regeneratingTrip === trip.id;

                return (
                  <div
                    key={trip.id}
                    className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{lang.flag}</span>
                        <div>
                          <h3 className="font-semibold text-sm">
                            {trip.destinationCity}, {trip.destinationCountry}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {lang.name} — {trip.holidayDate} — {trip.targetLevel}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingTrip(isEditing ? null : trip.id)}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                      >
                        {isEditing ? "Close" : "Edit"}
                      </button>
                    </div>

                    {/* Edit trip details */}
                    {isEditing && (
                      <TripEditor
                        trip={trip}
                        onSave={(updates) => {
                          updateTrip(trip.id, updates);
                          setEditingTrip(null);
                        }}
                      />
                    )}

                    {total > 0 && !isEditing && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-primary)] rounded-full"
                            style={{ width: `${(completed / total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {completed}/{total}
                        </span>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex gap-2">
                        {/* Regenerate button */}
                        {confirmRegen === trip.id ? (
                          <>
                            <button
                              onClick={() => handleRegenerateCurriculum(trip.id)}
                              disabled={isRegenerating}
                              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 cursor-pointer disabled:opacity-50"
                            >
                              {isRegenerating ? (
                                <span className="flex items-center justify-center gap-1">
                                  <span className="w-3 h-3 border border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                                  Generating...
                                </span>
                              ) : (
                                "Confirm — this replaces your current curriculum"
                              )}
                            </button>
                            {!isRegenerating && (
                              <button
                                onClick={() => setConfirmRegen(null)}
                                className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-surface-light)] cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        ) : isRegenerating ? (
                          <div className="flex-1 py-1.5 rounded-lg text-xs text-center text-[var(--color-primary)]">
                            <span className="flex items-center justify-center gap-1">
                              <span className="w-3 h-3 border border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                              Regenerating curriculum...
                            </span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setConfirmRegen(trip.id)}
                              className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                            >
                              Regenerate Curriculum
                            </button>
                            {confirmArchive === trip.id ? (
                              <>
                                <button
                                  onClick={() => handleArchiveTrip(trip.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmArchive(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-surface-light)] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmArchive(trip.id)}
                                className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-yellow-500/30 hover:text-yellow-400 transition-colors cursor-pointer"
                              >
                                Archive
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Archived Trips */}
        {archivedTrips.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Archived Trips ({archivedTrips.length})
            </h2>
            <div className="space-y-3">
              {archivedTrips.map((trip) => {
                const lang = getLanguage(trip.language);
                return (
                  <div
                    key={trip.id}
                    className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] opacity-70"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{lang.flag}</span>
                        <div>
                          <h3 className="font-semibold text-sm">
                            {trip.destinationCity}, {trip.destinationCountry}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {lang.name} — {trip.holidayDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateTrip(trip.id, { status: "active" })}
                          className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                        >
                          Restore
                        </button>
                        {confirmDelete === trip.id ? (
                          <button
                            onClick={() => handleDeleteTrip(trip.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(trip.id)}
                            className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
            Danger Zone
          </h2>
          <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-red-500/20">
            <p className="text-sm text-[var(--color-text-muted)] mb-3">
              This will delete your profile, all trips, vocabulary, and progress. This cannot be undone.
            </p>
            {confirmReset ? (
              <div className="flex gap-3">
                <button
                  onClick={handleResetAll}
                  className="flex-1 py-2.5 rounded-lg font-medium bg-red-500 text-white cursor-pointer"
                >
                  Yes, Delete Everything
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[var(--color-surface-light)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Reset All Data
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Trip Editor ──────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  "Football", "History", "Nightlife", "Art", "Nature",
  "Shopping", "Architecture", "Music", "Photography", "Food & Wine",
];

const FOOD_OPTIONS = [
  "Vegetarian", "Vegan", "Seafood lover", "Adventurous eater",
  "Nut allergy", "Gluten-free", "Dairy-free", "No restrictions",
];

function TripEditor({
  trip,
  onSave,
}: {
  trip: Trip;
  onSave: (updates: Partial<Trip>) => void;
}) {
  const [city, setCity] = useState(trip.destinationCity);
  const [holidayDate, setHolidayDate] = useState(trip.holidayDate);
  const [targetLevel, setTargetLevel] = useState(trip.targetLevel);
  const [interests, setInterests] = useState(trip.interests);
  const [foodPreferences, setFoodPreferences] = useState(trip.foodPreferences);

  const langConfig = LANGUAGES[trip.language];

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

  return (
    <div className="space-y-3 py-3 border-t border-b border-[var(--color-surface-light)] my-3">
      <div>
        <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">City</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={langConfig.exampleCities.slice(0, 3).join(", ")}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Holiday Date</label>
          <input
            type="date"
            value={holidayDate}
            onChange={(e) => setHolidayDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Level</label>
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value as Trip["targetLevel"])}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-surface-light)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="survival">Survival</option>
            <option value="conversational">Conversational</option>
            <option value="confident">Confident</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Interests</label>
        <div className="flex flex-wrap gap-1.5">
          {INTEREST_OPTIONS.map((item) => (
            <button
              key={item}
              onClick={() => setInterests(toggleItem(interests, item))}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
                interests.includes(item)
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-surface-light)] text-[var(--color-text-muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Food Preferences</label>
        <div className="flex flex-wrap gap-1.5">
          {FOOD_OPTIONS.map((item) => (
            <button
              key={item}
              onClick={() => setFoodPreferences(toggleItem(foodPreferences, item))}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer ${
                foodPreferences.includes(item)
                  ? "border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]"
                  : "border-[var(--color-surface-light)] text-[var(--color-text-muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() =>
          onSave({
            destinationCity: city.trim(),
            holidayDate,
            targetLevel,
            interests,
            foodPreferences,
          })
        }
        className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white cursor-pointer hover:bg-[var(--color-primary-dark)] transition-colors"
      >
        Save Trip Changes
      </button>
      <p className="text-xs text-[var(--color-text-muted)] text-center">
        After saving, use &ldquo;Regenerate Curriculum&rdquo; to create a new plan with these changes.
      </p>
    </div>
  );
}
