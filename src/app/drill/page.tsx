"use client";

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { useSRSStore } from "@/lib/store/srs-store";
import { useStreakStore } from "@/lib/store/streak-store";
import { getLanguage } from "@/lib/config/language-registry";
import type { SRSItem, ChallengeType } from "@/lib/types/curriculum";

// ─── Drill selector (no type param) ─────────────────────────────────

function DrillSelector({ onSelect }: { onSelect: (type: ChallengeType) => void }) {
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const langConfig = activeTrip ? getLanguage(activeTrip.language) : null;
  const vocabCount = useSRSStore((s) => s.getItemCount(activeTrip?.language));
  const dueCount = useSRSStore((s) => s.getDueItems(activeTrip?.language).length);

  const drills: { type: ChallengeType; label: string; desc: string; icon: string; minVocab: number }[] = [
    { type: "vocab-recall", label: "Vocab Quiz", desc: "Multiple choice — what does this word mean?", icon: "🧠", minVocab: 4 },
    { type: "listen-repeat", label: "Listen & Repeat", desc: "Hear a phrase, then say it back", icon: "🎧", minVocab: 1 },
    { type: "how-would-you-say", label: "How Would You Say…", desc: "Translate a phrase into the target language", icon: "💬", minVocab: 1 },
    { type: "cultural-tip", label: "Cultural Tip", desc: "Learn something about your destination", icon: "🌍", minVocab: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Quick Drills</h2>
        <p className="text-[var(--color-text-muted)]">
          {langConfig ? `${langConfig.flag} ${langConfig.name}` : "Pick a drill"} — {vocabCount} words learned, {dueCount} due
        </p>
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        {drills.map((d) => {
          const locked = vocabCount < d.minVocab;
          return (
            <button
              key={d.type}
              onClick={() => !locked && onSelect(d.type)}
              disabled={locked}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${
                locked
                  ? "border-[var(--color-surface-light)] bg-[var(--color-surface)] opacity-50 cursor-not-allowed"
                  : "border-[var(--color-surface-light)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] cursor-pointer"
              }`}
            >
              <span className="text-2xl">{d.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{d.label}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{d.desc}</p>
              </div>
              {locked && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  Need {d.minVocab}+ words
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vocab Recall Drill ─────────────────────────────────────────────

function VocabRecallDrill({ onComplete }: { onComplete: (score: number) => void }) {
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const srsItems = useSRSStore((s) => s.items);
  const reviewItem = useSRSStore((s) => s.reviewItem);

  const items = useMemo(() => {
    const all = Object.values(srsItems);
    return activeTrip ? all.filter((i) => i.language === activeTrip.language) : all;
  }, [srsItems, activeTrip]);

  const [questions, setQuestions] = useState<
    { item: SRSItem; options: string[]; correctIndex: number }[]
  >([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || items.length < 4) return;
    initialized.current = true;

    // Pick up to 10 random items for questions
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 10);

    const qs = picked.map((item) => {
      // Get 3 wrong options from other items
      const others = items
        .filter((i) => i.vocabId !== item.vocabId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((i) => i.translation);

      const allOptions = [...others, item.translation].sort(() => Math.random() - 0.5);
      return {
        item,
        options: allOptions,
        correctIndex: allOptions.indexOf(item.translation),
      };
    });

    setQuestions(qs);
  }, [items]);

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = idx === questions[currentQ].correctIndex;
    if (isCorrect) setCorrectCount((c) => c + 1);

    // Update SRS
    reviewItem(questions[currentQ].item.vocabId, isCorrect ? 4 : 1);

    setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ((c) => c + 1);
        setSelected(null);
      } else {
        setShowResult(true);
      }
    }, 1200);
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-muted)]">Need at least 4 vocabulary words to start a quiz.</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Complete some lessons first!</p>
      </div>
    );
  }

  if (showResult) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="text-center py-8 space-y-4">
        <h3 className="text-2xl font-bold">
          {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good effort!" : "Keep practising!"}
        </h3>
        <p className="text-4xl font-bold text-[var(--color-primary)]">{pct}%</p>
        <p className="text-[var(--color-text-muted)]">
          {correctCount}/{questions.length} correct
        </p>
        <button
          onClick={() => onComplete(pct)}
          className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
        >
          Done
        </button>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <p className="text-xs text-[var(--color-text-muted)] mb-1">
          {currentQ + 1} of {questions.length}
        </p>
        <div className="h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-[var(--color-primary)] rounded-full transition-all"
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
          {q.item.partOfSpeech}
        </p>
        <h3 className="text-3xl font-bold mb-1">{q.item.word}</h3>
        <p className="text-sm text-[var(--color-primary)] italic">{q.item.pronunciation}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let style = "border-[var(--color-surface-light)] bg-[var(--color-surface)]";
          if (selected !== null) {
            if (idx === q.correctIndex) {
              style = "border-green-500 bg-green-500/20 text-green-400";
            } else if (idx === selected && idx !== q.correctIndex) {
              style = "border-red-500 bg-red-500/20 text-red-400";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Listen & Repeat Drill ──────────────────────────────────────────

function ListenRepeatDrill({ onComplete }: { onComplete: (score: number) => void }) {
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const profile = useUserStore((s) => s.profile);
  const srsItems = useSRSStore((s) => s.items);

  const items = useMemo(() => {
    const all = Object.values(srsItems);
    return activeTrip ? all.filter((i) => i.language === activeTrip.language) : all;
  }, [srsItems, activeTrip]);

  const [phrases] = useState(() =>
    [...items].sort(() => Math.random() - 0.5).slice(0, 5)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{ score: number; transcription: string } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentPhrase = phrases[currentIdx];
  const language = activeTrip?.language || "es";
  const gender = profile?.avatarGender || "female";

  const playPhrase = useCallback(async () => {
    if (!currentPhrase || isPlaying) return;
    setIsPlaying(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentPhrase.word, language, gender }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
      audio.onended = () => setIsPlaying(false);
      audio.play();
    } catch {
      setIsPlaying(false);
    }
  }, [currentPhrase, isPlaying, language, gender]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    setIsRecording(false);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("language", language);

    try {
      const sttRes = await fetch("/api/stt", { method: "POST", body: formData });
      const sttData = await sttRes.json();
      const transcription = sttData.text || "";

      // Simple similarity score
      const normalize = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
      const expected = normalize(currentPhrase.word);
      const spoken = normalize(transcription);
      const score = expected === spoken ? 95 : expected.includes(spoken) || spoken.includes(expected) ? 70 : 40;

      setResult({ score, transcription });
      setScores((prev) => [...prev, score]);
    } catch {
      setResult({ score: 0, transcription: "Error processing audio" });
    }
  }, [language, currentPhrase]);

  const next = () => {
    if (currentIdx + 1 < phrases.length) {
      setCurrentIdx((c) => c + 1);
      setResult(null);
    } else {
      setDone(true);
    }
  };

  if (phrases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-muted)]">No vocabulary to practise yet.</p>
      </div>
    );
  }

  if (done) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <div className="text-center py-8 space-y-4">
        <h3 className="text-2xl font-bold">
          {avg >= 80 ? "Great listening!" : avg >= 50 ? "Good effort!" : "Keep at it!"}
        </h3>
        <p className="text-4xl font-bold text-[var(--color-primary)]">{avg}%</p>
        <p className="text-[var(--color-text-muted)]">{phrases.length} phrases practised</p>
        <button
          onClick={() => onComplete(avg)}
          className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / phrases.length) * 100}%` }}
        />
      </div>

      <div className="text-center space-y-4">
        <p className="text-xs text-[var(--color-text-muted)]">Listen, then repeat</p>

        <button
          onClick={playPhrase}
          disabled={isPlaying}
          className="mx-auto w-20 h-20 rounded-full bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary)]/30 transition-colors disabled:opacity-50"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--color-primary)">
            {isPlaying ? (
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            ) : (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            )}
          </svg>
        </button>

        <p className="text-xl font-bold">{currentPhrase.word}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{currentPhrase.translation}</p>
      </div>

      {!result ? (
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopAndProcess : startRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              isRecording
                ? "bg-red-500 animate-pulse"
                : "bg-[var(--color-surface)] border-2 border-[var(--color-surface-light)] hover:border-[var(--color-primary)]"
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isRecording ? "white" : "currentColor"}>
              {isRecording ? (
                <rect x="6" y="6" width="12" height="12" rx="2" />
              ) : (
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              )}
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-center">
          <div className={`text-lg font-bold ${result.score >= 70 ? "text-green-400" : result.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {result.score >= 70 ? "Well done!" : result.score >= 40 ? "Almost there!" : "Try again!"}
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            You said: &ldquo;{result.transcription}&rdquo;
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2 rounded-lg border border-[var(--color-surface-light)] text-sm cursor-pointer hover:border-[var(--color-primary)] transition-colors"
            >
              Retry
            </button>
            <button
              onClick={next}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── How Would You Say Drill ────────────────────────────────────────

function HowWouldYouSayDrill({ onComplete }: { onComplete: (score: number) => void }) {
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const profile = useUserStore((s) => s.profile);
  const srsItems = useSRSStore((s) => s.items);

  const items = useMemo(() => {
    const all = Object.values(srsItems);
    return activeTrip ? all.filter((i) => i.language === activeTrip.language) : all;
  }, [srsItems, activeTrip]);

  const [prompts] = useState(() =>
    [...items].sort(() => Math.random() - 0.5).slice(0, 5)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<{ score: number; transcription: string } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentPrompt = prompts[currentIdx];
  const language = activeTrip?.language || "es";

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    setIsRecording(false);

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("language", language);

    try {
      const sttRes = await fetch("/api/stt", { method: "POST", body: formData });
      const sttData = await sttRes.json();
      const transcription = sttData.text || "";

      const normalize = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
      const expected = normalize(currentPrompt.word);
      const spoken = normalize(transcription);
      const score = expected === spoken ? 95 : expected.includes(spoken) || spoken.includes(expected) ? 70 : 35;

      setResult({ score, transcription });
      setScores((prev) => [...prev, score]);
    } catch {
      setResult({ score: 0, transcription: "Error processing audio" });
    }
  }, [language, currentPrompt]);

  const next = () => {
    if (currentIdx + 1 < prompts.length) {
      setCurrentIdx((c) => c + 1);
      setResult(null);
      setShowHint(false);
    } else {
      setDone(true);
    }
  };

  if (prompts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-muted)]">No vocabulary to practise yet.</p>
      </div>
    );
  }

  if (done) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <div className="text-center py-8 space-y-4">
        <h3 className="text-2xl font-bold">
          {avg >= 80 ? "Brilliant!" : avg >= 50 ? "Not bad!" : "Keep going!"}
        </h3>
        <p className="text-4xl font-bold text-[var(--color-primary)]">{avg}%</p>
        <p className="text-[var(--color-text-muted)]">{prompts.length} phrases attempted</p>
        <button
          onClick={() => onComplete(avg)}
          className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / prompts.length) * 100}%` }}
        />
      </div>

      <div className="text-center space-y-3">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">How would you say…</p>
        <h3 className="text-2xl font-bold">&ldquo;{currentPrompt.translation}&rdquo;</h3>

        {showHint ? (
          <p className="text-sm text-[var(--color-primary)] italic">
            Hint: {currentPrompt.word} — {currentPrompt.pronunciation}
          </p>
        ) : (
          <button
            onClick={() => setShowHint(true)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
          >
            Show hint
          </button>
        )}
      </div>

      {!result ? (
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopAndProcess : startRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              isRecording
                ? "bg-red-500 animate-pulse"
                : "bg-[var(--color-surface)] border-2 border-[var(--color-surface-light)] hover:border-[var(--color-primary)]"
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isRecording ? "white" : "currentColor"}>
              {isRecording ? (
                <rect x="6" y="6" width="12" height="12" rx="2" />
              ) : (
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              )}
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-center">
          <div className={`text-lg font-bold ${result.score >= 70 ? "text-green-400" : result.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
            {result.score >= 70 ? "Correct!" : result.score >= 40 ? "Close!" : "Not quite"}
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            You said: &ldquo;{result.transcription}&rdquo;
          </p>
          <p className="text-sm">
            Expected: <span className="font-medium text-[var(--color-primary)]">{currentPrompt.word}</span>
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2 rounded-lg border border-[var(--color-surface-light)] text-sm cursor-pointer hover:border-[var(--color-primary)] transition-colors"
            >
              Retry
            </button>
            <button
              onClick={next}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cultural Tip Drill ─────────────────────────────────────────────

function CulturalTipDrill({ onComplete }: { onComplete: (score: number) => void }) {
  const activeTrip = useTripStore((s) => s.getActiveTrip)();
  const langConfig = activeTrip ? getLanguage(activeTrip.language) : null;

  // Gather cultural tips from curriculum topics
  const tips = activeTrip?.curriculum?.tiers
    .flatMap((t) => t.topics)
    .filter((t) => t.culturalTip)
    .map((t) => ({ title: t.title, tip: t.culturalTip!, setting: t.scenarioSetting })) || [];

  const [currentIdx, setCurrentIdx] = useState(0);

  if (tips.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-[var(--color-text-muted)]">No cultural tips available yet.</p>
        <p className="text-sm text-[var(--color-text-muted)]">Generate a curriculum to unlock cultural tips.</p>
        <button
          onClick={() => onComplete(100)}
          className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
        >
          Back
        </button>
      </div>
    );
  }

  const tip = tips[currentIdx];
  const isLast = currentIdx >= tips.length - 1;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / tips.length) * 100}%` }}
        />
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-surface-light)] space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{langConfig?.flag || "🌍"}</span>
          <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wide">
            Cultural Tip {currentIdx + 1}/{tips.length}
          </span>
        </div>

        <h3 className="text-lg font-bold">{tip.title}</h3>
        <p className="text-sm text-[var(--color-text-muted)] italic">{tip.setting}</p>
        <p className="text-[var(--color-text)] leading-relaxed">{tip.tip}</p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => (isLast ? onComplete(100) : setCurrentIdx((c) => c + 1))}
          className="px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white cursor-pointer"
        >
          {isLast ? "Done" : "Next Tip"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Drill Page ────────────────────────────────────────────────

function DrillContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as ChallengeType | null;
  const recordActivity = useStreakStore((s) => s.recordActivity);

  const [drillType, setDrillType] = useState<ChallengeType | null>(typeParam);

  const handleComplete = useCallback(
    (score: number) => {
      recordActivity(3);
      router.push("/dashboard");
    },
    [recordActivity, router]
  );

  const handleSelect = useCallback((type: ChallengeType) => {
    setDrillType(type);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
        <button
          onClick={() => drillType ? setDrillType(null) : router.push("/dashboard")}
          className="text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {drillType ? (
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            ) : (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            )}
          </svg>
        </button>
        <h2 className="text-sm font-semibold">
          {drillType ? drillType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Quick Drills"}
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        {!drillType && <DrillSelector onSelect={handleSelect} />}
        {drillType === "vocab-recall" && <VocabRecallDrill onComplete={handleComplete} />}
        {drillType === "listen-repeat" && <ListenRepeatDrill onComplete={handleComplete} />}
        {drillType === "how-would-you-say" && <HowWouldYouSayDrill onComplete={handleComplete} />}
        {drillType === "cultural-tip" && <CulturalTipDrill onComplete={handleComplete} />}
        {drillType === "flashcard-review" && (
          // Redirect to the dedicated review page
          <DrillRedirect to="/review" />
        )}
        {drillType === "scenario-conversation" && (
          <DrillRedirect to="/lesson" />
        )}
      </div>
    </div>
  );
}

function DrillRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );
}

export default function DrillPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DrillContent />
    </Suspense>
  );
}
