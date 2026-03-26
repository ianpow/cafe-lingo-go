"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from "react";

export interface TalkingHeadAvatarHandle {
  speakAudio: (audioData: SpeakAudioData) => void;
  stopSpeaking: () => void;
  setMood: (mood: string) => void;
}

export interface SpeakAudioData {
  audio: ArrayBuffer[];
  words: string[];
  wtimes: number[];
  wdurations: number[];
  sampleRate?: number;
  language?: string;  // "es", "fr", "zh" — maps to lipsync module
}

interface TalkingHeadAvatarProps {
  modelUrl?: string;
  gender?: "male" | "female";
  language?: string; // language code for per-language avatar models
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    TalkingHead?: unknown;
    __TalkingHeadLoaded?: boolean;
  }
}

let loadPromise: Promise<void> | null = null;

function loadTalkingHeadScript(): Promise<void> {
  if (window.__TalkingHeadLoaded && window.TalkingHead) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // Create a same-origin module script that the import map can apply to
    // We write a loader script to public/ and load it as a module
    const script = document.createElement("script");
    script.type = "module";

    // Instead of blob URL, use an inline script approach via data URI won't work either.
    // The simplest approach: create a script element with inline content
    // But <script type="module"> with inline content DOES use import maps.
    script.textContent = `
      import { TalkingHead } from "https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/modules/talkinghead.mjs";
      window.TalkingHead = TalkingHead;
      window.__TalkingHeadLoaded = true;
      window.dispatchEvent(new CustomEvent("talkinghead-ready"));
    `;

    const onReady = () => {
      window.removeEventListener("talkinghead-ready", onReady);
      console.log("[TalkingHead] Script loaded via inline module");
      resolve();
    };
    window.addEventListener("talkinghead-ready", onReady);

    // Timeout fallback
    const timeout = setTimeout(() => {
      window.removeEventListener("talkinghead-ready", onReady);
      reject(new Error("TalkingHead script load timeout"));
    }, 15000);

    script.onerror = (e) => {
      clearTimeout(timeout);
      window.removeEventListener("talkinghead-ready", onReady);
      reject(new Error(`Script load error: ${e}`));
    };

    // Inline module scripts DO have access to the page's import map
    document.head.appendChild(script);

    // Clear timeout on success
    window.addEventListener("talkinghead-ready", () => clearTimeout(timeout), {
      once: true,
    });
  });

  return loadPromise;
}

export const TalkingHeadAvatar = forwardRef<
  TalkingHeadAvatarHandle,
  TalkingHeadAvatarProps
>(function TalkingHeadAvatar(
  { modelUrl, gender = "female", language, onSpeakStart, onSpeakEnd },
  ref
) {
  // Try language-specific model first, fall back to generic
  const fallbackUrl = gender === "male" ? "/models/male.glb" : "/models/female.glb";
  const languageUrl = language
    ? `/models/${gender}-${language}.glb`
    : fallbackUrl;
  const [resolvedModelUrl, setResolvedModelUrl] = useState(modelUrl || languageUrl);
  const triedFallbackRef = useRef(false);

  // When language/gender/modelUrl changes, try the language-specific model
  useEffect(() => {
    if (modelUrl) {
      setResolvedModelUrl(modelUrl);
      triedFallbackRef.current = false;
      return;
    }
    const url = language ? `/models/${gender}-${language}.glb` : fallbackUrl;
    setResolvedModelUrl(url);
    triedFallbackRef.current = false;
  }, [modelUrl, gender, language, fallbackUrl]);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const onSpeakStartRef = useRef(onSpeakStart);
  const onSpeakEndRef = useRef(onSpeakEnd);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  onSpeakStartRef.current = onSpeakStart;
  onSpeakEndRef.current = onSpeakEnd;

  useEffect(() => {
    if (!containerRef.current) return;

    // In React Strict Mode, the effect runs twice. We use a ref
    // to track cancellation per-invocation, not globally.
    const controller = { cancelled: false };

    async function init() {
      const cancelled = () => controller.cancelled;
      try {
        setLoading(true);
        setError(null);

        console.log("[TalkingHead] Loading script from CDN...");
        await loadTalkingHeadScript();
        console.log("[TalkingHead] Script loaded, window.TalkingHead =", !!window.TalkingHead);
        console.log("[TalkingHead] cancelled =", cancelled(), ", containerRef =", !!containerRef.current);

        if (cancelled() || !containerRef.current) {
          console.log("[TalkingHead] Aborted: cancelled or no container");
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const TalkingHead = window.TalkingHead as any;
        if (!TalkingHead) {
          throw new Error("TalkingHead class not found on window");
        }

        console.log("[TalkingHead] Creating instance with container:", containerRef.current.offsetWidth, "x", containerRef.current.offsetHeight);
        const head = new TalkingHead(containerRef.current, {
          ttsEndpoint: null,
          lipsyncModules: ["en", "fr", "de", "fi", "lt"],
          lipsyncLang: "en",
          cameraView: "head",
  	  cameraDistance: -1,    // closer
  	  cameraY: -0.5,         // head-level framing
          cameraRotateEnable: true,
          cameraPanEnable: false,
          cameraZoomEnable: false,
          avatarMood: "neutral",
          avatarIdleEyeContact: 0.8,
          avatarSpeakingEyeContact: 1.0,
          pcmSampleRate: 44100,
          modelFPS: 30,
        });

        headRef.current = head;
        console.log("[TalkingHead] Instance created, loading avatar:", resolvedModelUrl);

        const showModel = async (url: string) => {
          await head.showAvatar(
            {
              url,
              body: gender === "male" ? "M" : "F",
              avatarMood: "neutral",
              lipsyncLang: "en",
            },
            (progress: number) => {
              if (progress % 0.1 < 0.01) {
                console.log(`[TalkingHead] Loading: ${Math.round(progress * 100)}%`);
              }
            }
          );
        };

        try {
          await showModel(resolvedModelUrl);
          console.log("[TalkingHead] Avatar loaded successfully!");
        } catch (modelErr) {
          // If language-specific model fails, try fallback
          const fb = gender === "male" ? "/models/male.glb" : "/models/female.glb";
          if (resolvedModelUrl !== fb && !triedFallbackRef.current) {
            console.warn("[TalkingHead] Language model not found, falling back to generic:", fb);
            triedFallbackRef.current = true;
            await showModel(fb);
            console.log("[TalkingHead] Fallback avatar loaded successfully!");
          } else {
            throw modelErr;
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("[TalkingHead] Init error:", err);
        setError(err instanceof Error ? err.message : "Failed to load avatar");
        setLoading(false);
      }
    }

    init();

    return () => {
      controller.cancelled = true;
      if (headRef.current) {
        try {
          headRef.current.stop();
          headRef.current = null;
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [resolvedModelUrl, gender]);

  const speakAudio = useCallback((audioData: SpeakAudioData) => {
    const head = headRef.current;
    if (!head) {
      console.warn("[TalkingHead] Not initialized, cannot speak");
      return;
    }

    onSpeakStartRef.current?.();

    try {
      // Map scenario language to TalkingHead lipsync module
      // Chinese doesn't have a dedicated module — use English as approximation
      const lipsyncLangMap: Record<string, string> = { es: "en", fr: "fr", zh: "en", de: "de" };
      const lipsyncLang = lipsyncLangMap[audioData.language || "es"] || "en";
      const opts: Record<string, unknown> = { lipsyncLang };
      if (audioData.sampleRate) {
        opts.sampleRate = audioData.sampleRate;
      }
      console.log("[TalkingHead] Speaking with", audioData.words.length, "words, sampleRate:", audioData.sampleRate);
      head.speakAudio(audioData, opts, null);
      // Note: speech end timing is handled by useConversationFlow
    } catch (err) {
      console.error("[TalkingHead] speakAudio error:", err);
      onSpeakEndRef.current?.();
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (headRef.current) {
      try {
        headRef.current.stopSpeaking?.();
      } catch {
        // ignore
      }
    }
  }, []);

  const setMood = useCallback((mood: string) => {
    if (headRef.current) {
      headRef.current.setMood(mood);
    }
  }, []);

  const [cameraMode, setCameraMode] = useState<"mid" | "head">("head");

  const toggleCamera = useCallback(() => {
    setCameraMode((prev) => {
      const next = prev === "mid" ? "head" : "mid";
      if (headRef.current?.setView) {
        headRef.current.setView(next, {
          cameraDistance: -1,
          cameraY: next === "head" ? -0.5 : -0.1,
        });
      }
      return next;
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      speakAudio,
      stopSpeaking,
      setMood,
    }),
    [speakAudio, stopSpeaking, setMood]
  );

  return (
    <div className="w-full h-full relative" style={{ minHeight: "300px" }}>
      <div ref={containerRef} className="w-full h-full" />
      {!loading && !error && (
        <button
          onClick={toggleCamera}
          className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full text-xs font-medium
            bg-black/50 hover:bg-black/70 text-white/80 hover:text-white
            backdrop-blur-sm transition-all duration-200 border border-white/10"
          title={cameraMode === "head" ? "Switch to body view" : "Switch to close-up"}
        >
          {cameraMode === "head" ? "🧍 Body" : "👤 Close-up"}
        </button>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[var(--color-text-muted)] text-sm">Loading avatar...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)]">
          <div className="text-center p-4">
            <p className="text-red-400 text-sm mb-2">Avatar Error</p>
            <p className="text-xs text-[var(--color-text-muted)]">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
});
