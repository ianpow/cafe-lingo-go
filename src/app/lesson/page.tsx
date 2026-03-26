"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLessonStore } from "@/lib/store/lesson-store";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { useStreakStore } from "@/lib/store/streak-store";
import { useSRSStore } from "@/lib/store/srs-store";
import { useConversationFlow } from "@/lib/hooks/useConversationFlow";
import { vocabToSRSItems } from "@/lib/curriculum/srs-engine";
import {
  TalkingHeadAvatar,
  type TalkingHeadAvatarHandle,
} from "@/components/avatar/TalkingHeadAvatar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { PromptCard } from "@/components/chat/PromptCard";
import { RecordButton } from "@/components/audio/RecordButton";
import { PronunciationFeedback } from "@/components/pronunciation/PronunciationFeedback";
import { VocabularyPanel } from "@/components/lesson/VocabularyPanel";
import type { Scenario } from "@/lib/types/scenario";

function LessonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicId = searchParams.get("topicId");

  const profile = useUserStore((s) => s.profile);
  const getActiveTrip = useTripStore((s) => s.getActiveTrip);
  const { getCachedScenario, cacheScenario, markTopicCompleted, getDaysUntilHoliday } = useTripStore();
  const completeLesson = useStreakStore((s) => s.completeLesson);
  const addSRSItem = useSRSStore((s) => s.addItem);

  const activeTrip = getActiveTrip();

  const store = useLessonStore();
  const avatarRef = useRef<TalkingHeadAvatarHandle>(null);
  const { startAvatarTurn, startRecording, stopRecordingAndProcess, listenToExpectedPhrase } =
    useConversationFlow({
      avatarRef,
      gender: profile?.avatarGender || "female",
    });

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  // Reset state when topicId changes
  useEffect(() => {
    hasStartedRef.current = false;
    setIsLoading(true);
    setLoadError(null);
    store.resetLesson();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  // Load or generate scenario
  useEffect(() => {
    if (!topicId || !profile || !activeTrip?.curriculum) {
      setLoadError("Missing topic or profile data");
      setIsLoading(false);
      return;
    }

    const loadScenario = async () => {
      // Check cache first
      const cached = getCachedScenario(activeTrip.id, topicId);
      if (cached) {
        store.setScenario(cached);
        setIsLoading(false);
        return;
      }

      // Find the topic
      const topic = activeTrip.curriculum!.tiers
        .flatMap((t) => t.topics)
        .find((t) => t.id === topicId);

      if (!topic) {
        setLoadError("Topic not found in curriculum");
        setIsLoading(false);
        return;
      }

      // Gather previously learned vocabulary
      const previousVocab = activeTrip.curriculum!.tiers
        .flatMap((t) => t.topics)
        .filter((t) => t.completed)
        .flatMap((t) => t.vocabulary);

      try {
        const res = await fetch("/api/lesson-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            profile,
            trip: activeTrip,
            previousVocabulary: previousVocab,
          }),
        });

        if (!res.ok) throw new Error("Failed to generate lesson");

        const scenario: Scenario = await res.json();
        cacheScenario(activeTrip.id, topicId, scenario);
        store.setScenario(scenario);
        setIsLoading(false);
      } catch (err) {
        console.error("Lesson generation error:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load lesson");
        setIsLoading(false);
      }
    };

    loadScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  // Start first avatar turn when scenario loads
  useEffect(() => {
    if (!isLoading && store.scenario && !hasStartedRef.current) {
      hasStartedRef.current = true;
      const timer = setTimeout(() => startAvatarTurn(), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, store.scenario, startAvatarTurn]);

  // Handle lesson completion
  const handleLessonComplete = useCallback(() => {
    if (topicId && activeTrip) {
      markTopicCompleted(topicId);
      completeLesson();

      // Add vocabulary to SRS
      if (store.scenario) {
        const allVocab = store.scenario.turns.flatMap((t) => t.vocabulary);
        const srsItems = vocabToSRSItems(allVocab, topicId, activeTrip.language);
        srsItems.forEach((item) => addSRSItem(item));
      }
    }
  }, [topicId, activeTrip, markTopicCompleted, completeLesson, store.scenario, addSRSItem]);

  const handleRecordToggle = useCallback(() => {
    if (store.isRecording) {
      stopRecordingAndProcess();
    } else {
      startRecording();
    }
  }, [store.isRecording, startRecording, stopRecordingAndProcess]);

  const currentTurn = store.getCurrentTurn();
  const daysLeft = getDaysUntilHoliday();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">Preparing your lesson...</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Powered by Claude AI</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load lesson</p>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">{loadError}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-[var(--color-primary)] rounded-lg text-white cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{store.scenario?.title || "Lesson"}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                style={{
                  width: `${store.scenario ? ((store.currentTurnIndex + 1) / store.scenario.turns.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {store.currentTurnIndex + 1}/{store.scenario?.turns.length || 0}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-[var(--color-text-muted)]">{daysLeft}d left</span>
        </div>
      </div>

      {/* Avatar */}
      <div className="h-[280px] flex-shrink-0">
        <TalkingHeadAvatar
          ref={avatarRef}
          gender={profile?.avatarGender || "female"}
          language={activeTrip?.language}
        />
      </div>

      {/* Chat + Pronunciation */}
      <div className="flex-1 flex flex-col min-h-0">
        <ChatPanel
          messages={store.conversationHistory}
          showTranslation={store.showTranslation}
        />
        {store.latestPronunciation && (
          <PronunciationFeedback result={store.latestPronunciation} />
        )}
        {currentTurn && !store.isLessonComplete && (
          <VocabularyPanel items={currentTurn.vocabulary} />
        )}
      </div>

      {/* Bottom controls */}
      {store.isLessonComplete ? (
        <div className="p-4 border-t border-[var(--color-surface-light)] text-center">
          <h3 className="text-lg font-bold text-[var(--color-success)] mb-2">
            Lesson Complete!
          </h3>
          <button
            onClick={() => {
              handleLessonComplete();
              router.push("/dashboard");
            }}
            className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <>
          {currentTurn && (
            <PromptCard
              turn={currentTurn}
              showTranslation={store.showTranslation}
              onListenClick={listenToExpectedPhrase}
            />
          )}
          <div className="p-4 flex justify-center">
            <RecordButton
              isRecording={store.isRecording}
              isDisabled={store.isAvatarSpeaking || store.isProcessing}
              onToggle={handleRecordToggle}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LessonContent />
    </Suspense>
  );
}
