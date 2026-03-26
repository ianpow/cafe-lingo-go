"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { getLanguage } from "@/lib/config/language-registry";

interface TransportType {
  name: string;
  description: string;
  ticketInfo: string;
  usefulPhrases: { phrase: string; english: string; when: string }[];
  tips: string[];
}

interface Attraction {
  name: string;
  area: string;
  description: string;
  tip: string;
  price: string;
  usefulPhrase: { phrase: string; english: string };
}

interface EmergencyInfo {
  numbers: { service: string; number: string }[];
  phrases: { phrase: string; english: string; pronunciation: string }[];
}

interface EatingInfo {
  mealTimes: string;
  tipping: string;
  mustTry: { dish: string; description: string; price: string }[];
  dietaryPhrases: { phrase: string; english: string; pronunciation: string }[];
}

interface GuideData {
  transport: { overview: string; types: TransportType[] };
  attractions: Attraction[];
  emergency: EmergencyInfo;
  eating: EatingInfo;
}

type TabId = "transport" | "attractions" | "emergency" | "eating";

export default function GuidePage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  const [guide, setGuide] = useState<GuideData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("transport");

  useEffect(() => {
    if (!profile || !activeTrip) return;

    const loadGuide = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: activeTrip.destinationCity,
            country: activeTrip.destinationCountry,
            language,
            languageName: langConfig.name,
            interests: activeTrip.interests || [],
            foodPreferences: activeTrip.foodPreferences || [],
          }),
        });
        if (!res.ok) throw new Error("Failed to generate guide");
        const data = await res.json();
        setGuide(data);
      } catch {
        setError("Failed to load city guide. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadGuide();
  }, []);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "transport", label: "Transport", icon: "🚇" },
    { id: "attractions", label: "Explore", icon: "📍" },
    { id: "eating", label: "Eating", icon: "🍽️" },
    { id: "emergency", label: "Emergency", icon: "🆘" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--color-surface-light)]">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold">
            {langConfig.flag} {activeTrip?.destinationCity || "City"} Guide
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Personalised for your trip
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-12 h-12 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="font-medium">Generating your city guide...</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Personalising for {activeTrip?.destinationCity} based on your interests
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--color-primary)] rounded-lg text-white cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Guide content */}
      {guide && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-[var(--color-surface-light)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "transport" && (
              <TransportTab data={guide.transport} />
            )}
            {activeTab === "attractions" && (
              <AttractionsTab data={guide.attractions} />
            )}
            {activeTab === "eating" && (
              <EatingTab data={guide.eating} />
            )}
            {activeTab === "emergency" && (
              <EmergencyTab data={guide.emergency} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TransportTab({ data }: { data: GuideData["transport"] }) {
  return (
    <>
      <p className="text-sm text-[var(--color-text-muted)]">{data.overview}</p>
      {data.types.map((t, i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] space-y-3"
        >
          <h3 className="font-semibold text-[var(--color-primary)]">{t.name}</h3>
          <p className="text-sm">{t.description}</p>
          <div className="bg-[var(--color-bg)] rounded-lg p-3">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Tickets & Prices</p>
            <p className="text-sm">{t.ticketInfo}</p>
          </div>
          {t.usefulPhrases.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--color-text-muted)]">Useful Phrases</p>
              {t.usefulPhrases.map((p, j) => (
                <div key={j} className="bg-[var(--color-bg)] rounded-lg p-3">
                  <p className="font-medium text-sm text-[var(--color-primary)]">{p.phrase}</p>
                  <p className="text-sm">{p.english}</p>
                  <p className="text-xs text-[var(--color-text-muted)] italic">{p.when}</p>
                </div>
              ))}
            </div>
          )}
          {t.tips.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Tips</p>
              <ul className="space-y-1">
                {t.tips.map((tip, j) => (
                  <li key={j} className="text-sm flex gap-2">
                    <span className="text-[var(--color-accent)]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function AttractionsTab({ data }: { data: Attraction[] }) {
  return (
    <>
      {data.map((a, i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] space-y-2"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{a.name}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">{a.area}</p>
            </div>
            <span className="text-xs bg-[var(--color-primary)]/20 text-[var(--color-primary)] px-2 py-1 rounded-full font-medium">
              {a.price}
            </span>
          </div>
          <p className="text-sm">{a.description}</p>
          <p className="text-sm text-[var(--color-accent)] italic">{a.tip}</p>
          {a.usefulPhrase && (
            <div className="bg-[var(--color-bg)] rounded-lg p-3">
              <p className="text-sm font-medium text-[var(--color-primary)]">{a.usefulPhrase.phrase}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{a.usefulPhrase.english}</p>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function EatingTab({ data }: { data: EatingInfo }) {
  return (
    <>
      <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] space-y-2">
        <h3 className="font-semibold text-[var(--color-primary)]">Meal Times</h3>
        <p className="text-sm">{data.mealTimes}</p>
      </div>
      <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] space-y-2">
        <h3 className="font-semibold text-[var(--color-primary)]">Tipping</h3>
        <p className="text-sm">{data.tipping}</p>
      </div>

      <h3 className="font-semibold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
        Must-Try Dishes
      </h3>
      {data.mustTry.map((d, i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] flex items-start justify-between"
        >
          <div>
            <h4 className="font-semibold">{d.dish}</h4>
            <p className="text-sm text-[var(--color-text-muted)]">{d.description}</p>
          </div>
          <span className="text-xs text-[var(--color-primary)] font-medium whitespace-nowrap ml-3">
            {d.price}
          </span>
        </div>
      ))}

      {data.dietaryPhrases.length > 0 && (
        <>
          <h3 className="font-semibold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
            Useful Dining Phrases
          </h3>
          {data.dietaryPhrases.map((p, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)]"
            >
              <p className="font-medium text-[var(--color-primary)]">{p.phrase}</p>
              <p className="text-sm">{p.english}</p>
              <p className="text-xs text-[var(--color-accent)] italic">{p.pronunciation}</p>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function EmergencyTab({ data }: { data: EmergencyInfo }) {
  return (
    <>
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-red-400">Emergency Numbers</h3>
        <div className="grid grid-cols-2 gap-2">
          {data.numbers.map((n, i) => (
            <div key={i} className="bg-[var(--color-surface)] rounded-lg p-3 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">{n.service}</p>
              <p className="text-xl font-bold text-red-400">{n.number}</p>
            </div>
          ))}
        </div>
      </div>

      <h3 className="font-semibold text-sm text-[var(--color-text-muted)] uppercase tracking-wide">
        Emergency Phrases
      </h3>
      {data.phrases.map((p, i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)] space-y-1"
        >
          <p className="font-medium text-lg">{p.phrase}</p>
          <p className="text-sm">{p.english}</p>
          <p className="text-xs text-[var(--color-accent)] italic">{p.pronunciation}</p>
        </div>
      ))}
    </>
  );
}
