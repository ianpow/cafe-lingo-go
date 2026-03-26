"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { useStreakStore } from "@/lib/store/streak-store";
import { useSRSStore } from "@/lib/store/srs-store";
import { getLanguage } from "@/lib/config/language-registry";
import { useThemeStore } from "@/lib/store/theme-store";

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
  const getCurrentTier = useTripStore((s) => s.getCurrentTier);
  const getTodaysChallenge = useTripStore((s) => s.getTodaysChallenge);
  const getDaysUntilHoliday = useTripStore((s) => s.getDaysUntilHoliday);
  const streak = useStreakStore();
  const { theme, setTheme, getResolvedTheme } = useThemeStore();

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
  const currentTier = getCurrentTier();
  const tierNames = ["", "Survival", "Essentials", "Getting Around", "Social", "Confidence"];

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-surface-light)] px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">
              {langConfig?.greeting.split(" ")[0] || "Hello"},{" "}
              <span className="text-[var(--color-primary)]">{profile.name}</span>!
            </h1>
            {activeTrip && (
              <p className="text-sm text-[var(--color-text-muted)]">
                {langConfig?.flag} {activeTrip.destinationCity} in {daysLeft} days
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-1">
              <div className="text-2xl font-bold text-[var(--color-primary)]">
                {streak.getStreakEmoji()} {streak.currentStreak}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">day streak</p>
            </div>
            <button
              onClick={() => setTheme(getResolvedTheme() === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-light)] transition-colors cursor-pointer"
              title={`Switch to ${getResolvedTheme() === "dark" ? "light" : "dark"} mode`}
            >
              {getResolvedTheme() === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-light)] transition-colors cursor-pointer"
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Trip selector (show when multiple active trips exist) */}
        {trips.filter((t) => t.status === "active").length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {trips.filter((t) => t.status === "active").map((trip) => {
              const tLang = getLanguage(trip.language);
              const isActive = trip.id === activeTripId;
              return (
                <button
                  key={trip.id}
                  onClick={() => setActiveTrip(trip.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                    isActive
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-surface-light)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                  }`}
                >
                  <span>{tLang.flag}</span>
                  <span className="text-sm font-medium">{trip.destinationCity}</span>
                </button>
              );
            })}
            <button
              onClick={() => router.push("/onboarding")}
              className="flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full border border-dashed border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span className="text-sm">New Trip</span>
            </button>
          </div>
        )}

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
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-sm text-red-400">{generationError}</p>
            <button
              onClick={() => router.push("/onboarding")}
              className="mt-2 text-sm text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {activeTrip && (
          <>
            {/* Countdown card */}
            <div className="bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/10 rounded-xl p-6 border border-[var(--color-primary)]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Days until {activeTrip.destinationCity}
                  </p>
                  <p className="text-4xl font-bold text-[var(--color-primary)] animate-countdown-pulse">
                    {daysLeft}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--color-text-muted)]">Progress</p>
                  <p className="text-2xl font-bold">{progressPercent}%</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {completedTopics}/{totalTopics} topics
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

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
                className="w-full bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-surface-light)] hover:border-[var(--color-primary)] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wide">
                      Today&apos;s Challenge
                    </span>
                    <h3 className="text-lg font-semibold mt-1">{todaysChallenge.title}</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      {todaysChallenge.description}
                    </p>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-primary)">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </div>
              </button>
            )}

            {/* Quick actions — Learning */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                Learn
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction
                  label="Continue Learning"
                  sublabel={`Tier ${currentTier}: ${tierNames[currentTier]}`}
                  onClick={() => {
                    const nextTopic = activeTrip.curriculum?.tiers
                      .flatMap((t) => t.topics)
                      .find((t) => !t.completed);
                    if (nextTopic) {
                      router.push(`/lesson?topicId=${nextTopic.id}`);
                    }
                  }}
                  color="primary"
                />
                <QuickAction
                  label="Review Words"
                  sublabel={`${dueItemCount} due / ${totalVocab} total`}
                  onClick={() => router.push("/review")}
                  color="secondary"
                />
                <QuickAction
                  label="Quick Drill"
                  sublabel="Vocab & pronunciation"
                  onClick={() => router.push("/drill")}
                  color="accent"
                />
                <QuickAction
                  label="Vocabulary"
                  sublabel={`${totalVocab} words learned`}
                  onClick={() => router.push("/vocab")}
                  color="text-muted"
                />
                <QuickAction
                  label="Pronunciation"
                  sublabel="Must-know phrases"
                  onClick={() => router.push("/passport")}
                  color="primary"
                />
                <QuickAction
                  label="Phrasebook"
                  sublabel="Essential phrases"
                  onClick={() => router.push("/phrasebook")}
                  color="secondary"
                />
              </div>
            </div>

            {/* Quick actions — On the Trip */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                On the Trip
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction
                  label="Translate"
                  sublabel={`English ↔ ${langConfig?.name || "Language"}`}
                  onClick={() => router.push("/translate")}
                  color="primary"
                />
                <QuickAction
                  label="Menu Scanner"
                  sublabel="Snap & translate menus"
                  onClick={() => router.push("/menu-scanner")}
                  color="secondary"
                />
                <QuickAction
                  label="City Guide"
                  sublabel={`${activeTrip.destinationCity} tips`}
                  onClick={() => router.push("/guide")}
                  color="accent"
                />
                <QuickAction
                  label="Culture Guide"
                  sublabel="Dos & don'ts"
                  onClick={() => router.push("/culture")}
                  color="text-muted"
                />
                <QuickAction
                  label="Travel Journal"
                  sublabel="Log new words"
                  onClick={() => router.push("/journal")}
                  color="accent"
                />
              </div>
            </div>

            {/* Curriculum Timeline — clickable topics */}
            {activeTrip.curriculum && (
              <div className="bg-[var(--color-surface)] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">
                  {langConfig?.flag} {langConfig?.name} Curriculum
                </h3>
                <div className="space-y-5">
                  {activeTrip.curriculum.tiers.map((tier) => {
                    const completed = tier.topics.filter((t) => t.completed).length;
                    const total = tier.topics.length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <div key={tier.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            Tier {tier.id}: {tier.name}
                          </span>
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {completed}/{total}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="space-y-1">
                          {tier.topics.map((topic) => (
                            <button
                              key={topic.id}
                              onClick={() => router.push(`/lesson?topicId=${topic.id}`)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-[var(--color-surface-light)] transition-colors cursor-pointer"
                            >
                              <span className="text-sm flex-shrink-0">
                                {topic.completed ? "✅" : "📝"}
                              </span>
                              <span className={`text-sm flex-1 ${topic.completed ? "text-[var(--color-text-muted)]" : ""}`}>
                                {topic.title}
                              </span>
                              {topic.completed && (
                                <span className="text-xs text-[var(--color-primary)]">Review</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New trip button (when only 1 active trip) */}
            {trips.filter((t) => t.status === "active").length <= 1 && (
              <button
                onClick={() => router.push("/onboarding")}
                className="w-full py-3 rounded-xl border border-dashed border-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Plan another trip
              </button>
            )}
          </>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Streak" value={`${streak.currentStreak}`} unit="days" />
          <StatCard label="Lessons" value={`${streak.totalLessonsCompleted}`} unit="done" />
          <StatCard label="Time" value={`${streak.totalMinutes}`} unit="min" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  label,
  sublabel,
  onClick,
  color,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] hover:border-[var(--color-primary)] transition-colors text-left cursor-pointer"
    >
      <h4 className={`text-sm font-semibold text-[var(--color-${color})]`}>{label}</h4>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sublabel}</p>
    </button>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">
        {unit} {label.toLowerCase()}
      </p>
    </div>
  );
}
