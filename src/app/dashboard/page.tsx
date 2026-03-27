"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { useStreakStore } from "@/lib/store/streak-store";
import { useSRSStore } from "@/lib/store/srs-store";
import { getLanguage } from "@/lib/config/language-registry";
import { useThemeStore } from "@/lib/store/theme-store";

type Tab = "learn" | "travel";

export default function DashboardPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const trips = useTripStore((s) => s.trips);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const setActiveTrip = useTripStore((s) => s.setActiveTrip);
  const getActiveTrip = useTripStore((s) => s.getActiveTrip);
  const isGenerating = useTripStore((s) => s.isGenerating);
  const generationError = useTripStore((s) => s.generationError);
  const getCompletedTopicCount = useTripStore((s) => s.getCompletedTopicCount);
  const getTotalTopicCount = useTripStore((s) => s.getTotalTopicCount);
  const getTodaysChallenge = useTripStore((s) => s.getTodaysChallenge);
  const getDaysUntilHoliday = useTripStore((s) => s.getDaysUntilHoliday);
  const streak = useStreakStore();
  const { setTheme, getResolvedTheme } = useThemeStore();

  const [activeTab, setActiveTab] = useState<Tab>("learn");

  const activeTrip = getActiveTrip();
  const langConfig = activeTrip ? getLanguage(activeTrip.language) : null;
  const dueItemCount = useSRSStore((s) => s.getDueItems(activeTrip?.language).length);
  const totalVocab = useSRSStore((s) => s.getItemCount(activeTrip?.language));

  useEffect(() => {
    if (!profile) {
      router.replace("/onboarding");
      return;
    }
    streak.checkAndUpdateStreak();
  }, [profile, router, streak]);

  if (!profile) return null;

  const daysLeft = getDaysUntilHoliday();
  const completedTopics = getCompletedTopicCount();
  const totalTopics = getTotalTopicCount();
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const todaysChallenge = getTodaysChallenge();

  // Find next uncompleted topic for "Next Lesson" CTA
  const nextTopic = activeTrip?.curriculum?.tiers
    .flatMap((t) => t.topics)
    .find((t) => !t.completed);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold leading-tight">
                {langConfig?.greeting.split(" ")[0] || "Hello"},{" "}
                <span className="text-[var(--color-primary)]">{profile.name}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 mr-1 px-2 py-1 rounded-lg bg-[var(--color-surface-light)]">
              <span className="text-sm">{streak.getStreakEmoji()}</span>
              <span className="text-sm font-bold text-[var(--color-primary)]">{streak.currentStreak}</span>
            </div>
            <button
              onClick={() => setTheme(getResolvedTheme() === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-light)] transition-colors cursor-pointer"
              title={`Switch to ${getResolvedTheme() === "dark" ? "light" : "dark"} mode`}
            >
              {getResolvedTheme() === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-light)] transition-colors cursor-pointer"
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Compact stats strip */}
      {activeTrip && (
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)]">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--color-text-muted)]">{langConfig?.flag}</span>
              <span className="text-sm font-semibold text-[var(--color-primary)]">{daysLeft}d</span>
              <span className="text-xs text-[var(--color-text-muted)]">to {activeTrip.destinationCity}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{progressPercent}%</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {completedTopics}/{totalTopics}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trip selector (only when multiple trips) */}
      {trips.filter((t) => t.status === "active").length > 1 && (
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)]">
          <div className="max-w-lg mx-auto flex gap-2 overflow-x-auto px-4 py-2">
            {trips.filter((t) => t.status === "active").map((trip) => {
              const tLang = getLanguage(trip.language);
              const isActive = trip.id === activeTripId;
              return (
                <button
                  key={trip.id}
                  onClick={() => setActiveTrip(trip.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]"
                      : "border-[var(--color-surface-light)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span>{tLang.flag}</span>
                  <span>{trip.destinationCity}</span>
                </button>
              );
            })}
            <button
              onClick={() => router.push("/onboarding")}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer text-xs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              New
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      {activeTrip && (
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)]">
          <div className="max-w-lg mx-auto flex">
            <button
              onClick={() => setActiveTab("learn")}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors cursor-pointer relative ${
                activeTab === "learn"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              Learn
              {activeTab === "learn" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[var(--color-primary)] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("travel")}
              className={`flex-1 py-2.5 text-sm font-semibold text-center transition-colors cursor-pointer relative ${
                activeTab === "travel"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              Travel
              {activeTab === "travel" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[var(--color-primary)] rounded-full" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* No active trip state */}
          {!activeTrip && trips.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-xl font-bold mb-2">No trips yet</h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                Plan your first holiday and start learning!
              </p>
              <button
                onClick={() => router.push("/onboarding")}
                className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
              >
                Plan a Trip
              </button>
            </div>
          )}

          {/* Loading / Error states */}
          {isGenerating && (
            <div className="bg-[var(--color-surface)] rounded-xl p-6 text-center">
              <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-muted)]">
                Generating your personalised {langConfig?.name} curriculum...
              </p>
            </div>
          )}

          {generationError && (
            <div className="bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-error)_30%,transparent)] rounded-xl p-4">
              <p className="text-sm text-[var(--color-error)]">{generationError}</p>
              <button
                onClick={() => router.push("/onboarding")}
                className="mt-2 text-sm text-[var(--color-primary)] hover:underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {activeTrip && activeTab === "learn" && (
            <>
              {/* Today's Challenge */}
              {todaysChallenge && !todaysChallenge.completed && (
                <button
                  onClick={() => {
                    if (todaysChallenge.type === "scenario-conversation") {
                      router.push(`/lesson?topicId=${todaysChallenge.topicId}`);
                    } else if (todaysChallenge.type === "flashcard-review") {
                      router.push("/review");
                    } else {
                      router.push(`/drill?type=${todaysChallenge.type}&topicId=${todaysChallenge.topicId}`);
                    }
                  }}
                  className="w-full bg-[var(--color-surface)] rounded-xl p-4 border-l-4 border-l-[var(--color-secondary)] border border-[var(--color-surface-light)] hover:border-[var(--color-secondary)] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider">
                        Daily Challenge
                      </span>
                      <h3 className="text-sm font-semibold mt-0.5">{todaysChallenge.title}</h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {todaysChallenge.description}
                      </p>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-secondary)">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Next Lesson CTA — prominent */}
              {nextTopic && (
                <button
                  onClick={() => router.push(`/lesson?topicId=${nextTopic.id}`)}
                  className="w-full bg-[var(--color-primary)] rounded-xl p-4 text-white text-left cursor-pointer hover:opacity-90 transition-opacity shadow-lg shadow-[var(--color-primary)]/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                        Next Lesson
                      </span>
                      <h3 className="text-base font-semibold mt-0.5">{nextTopic.title}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              )}

              {/* Quick actions row */}
              <div className="grid grid-cols-3 gap-2">
                <QuickAction
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>}
                  label="Review"
                  badge={dueItemCount > 0 ? `${dueItemCount}` : undefined}
                  onClick={() => router.push("/review")}
                />
                <QuickAction
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>}
                  label="Drill"
                  onClick={() => router.push("/drill")}
                />
                <QuickAction
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" /></svg>}
                  label="Vocab"
                  badge={totalVocab > 0 ? `${totalVocab}` : undefined}
                  onClick={() => router.push("/vocab")}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <QuickActionWide
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm5 8c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-5.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>}
                  label="Pronunciation"
                  sublabel="Must-know phrases"
                  onClick={() => router.push("/passport")}
                />
                <QuickActionWide
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" /></svg>}
                  label="Phrasebook"
                  sublabel="Essential phrases"
                  onClick={() => router.push("/phrasebook")}
                />
              </div>

              {/* Curriculum — collapsible topics */}
              {activeTrip.curriculum && (
                <div className="space-y-3">
                  {activeTrip.curriculum.tiers.map((tier) => {
                    const completed = tier.topics.filter((t) => t.completed).length;
                    const total = tier.topics.length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <div key={tier.id} className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-surface-light)]">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] px-1.5 py-0.5 rounded">
                              T{tier.id}
                            </span>
                            <span className="text-sm font-medium">{tier.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {completed}/{total}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-[var(--color-surface-light)]">
                          {tier.topics.map((topic, i) => (
                            <button
                              key={topic.id}
                              onClick={() => router.push(`/lesson?topicId=${topic.id}`)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-surface-light)] transition-colors cursor-pointer ${
                                i < tier.topics.length - 1 ? "border-b border-[var(--color-surface-light)]" : ""
                              }`}
                            >
                              <span className="text-xs flex-shrink-0 w-5 text-center">
                                {topic.completed ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-success)">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                  </svg>
                                ) : nextTopic?.id === topic.id ? (
                                  <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]" />
                                ) : (
                                  <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--color-surface-light)]" />
                                )}
                              </span>
                              <span className={`text-sm flex-1 ${topic.completed ? "text-[var(--color-text-muted)]" : nextTopic?.id === topic.id ? "font-medium" : ""}`}>
                                {topic.title}
                              </span>
                              {topic.completed && (
                                <span className="text-[10px] text-[var(--color-text-muted)] uppercase">Redo</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Streak" value={`${streak.currentStreak}`} unit="d" />
                <StatCard label="Lessons" value={`${streak.totalLessonsCompleted}`} unit="" />
                <StatCard label="Minutes" value={`${streak.totalMinutes}`} unit="m" />
              </div>

              {/* New trip button (when only 1 trip) */}
              {trips.filter((t) => t.status === "active").length <= 1 && (
                <button
                  onClick={() => router.push("/onboarding")}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Plan another trip
                </button>
              )}
            </>
          )}

          {activeTrip && activeTab === "travel" && (
            <>
              {/* Travel tools */}
              <div className="space-y-2">
                <TravelAction
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" /></svg>}
                  label="Translate"
                  sublabel={`English ↔ ${langConfig?.name || "Language"}`}
                  onClick={() => router.push("/translate")}
                />
                <TravelAction
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>}
                  label="Menu Scanner"
                  sublabel="Snap a photo of any menu for instant translation"
                  onClick={() => router.push("/menu-scanner")}
                />
                <TravelAction
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>}
                  label="City Guide"
                  sublabel={`Transport, attractions & tips for ${activeTrip.destinationCity}`}
                  onClick={() => router.push("/guide")}
                />
                <TravelAction
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg>}
                  label="Culture Guide"
                  sublabel="Local customs, dos & don&apos;ts"
                  onClick={() => router.push("/culture")}
                />
                <TravelAction
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>}
                  label="Travel Journal"
                  sublabel="Log new words you encounter on your trip"
                  onClick={() => router.push("/journal")}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-surface-light)] hover:border-[var(--color-primary)] transition-colors text-center cursor-pointer relative"
    >
      <div className="flex justify-center text-[var(--color-primary)] mb-1">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}

function QuickActionWide({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-[var(--color-surface)] rounded-xl p-3 border border-[var(--color-surface-light)] hover:border-[var(--color-primary)] transition-colors text-left cursor-pointer flex items-center gap-3"
    >
      <div className="text-[var(--color-primary)] flex-shrink-0">{icon}</div>
      <div>
        <span className="text-xs font-semibold block">{label}</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{sublabel}</span>
      </div>
    </button>
  );
}

function TravelAction({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] hover:border-[var(--color-primary)] transition-colors text-left cursor-pointer flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] flex items-center justify-center text-[var(--color-primary)] flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{label}</h4>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sublabel}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-text-muted)" className="flex-shrink-0">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      </svg>
    </button>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg p-3 text-center border border-[var(--color-surface-light)]">
      <p className="text-lg font-bold">
        {value}<span className="text-xs text-[var(--color-text-muted)] font-normal">{unit}</span>
      </p>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
    </div>
  );
}
