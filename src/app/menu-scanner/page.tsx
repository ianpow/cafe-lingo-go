"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store/user-store";
import { useTripStore } from "@/lib/store/trip-store";
import { getLanguage } from "@/lib/config/language-registry";

interface MenuItem {
  original: string;
  translation: string;
  description: string;
  price: string | null;
  dietary: string[];
  recommendation: "recommended" | "caution" | "neutral";
  recommendationReason: string;
}

interface MenuResult {
  restaurantName: string | null;
  items: MenuItem[];
  summary: string;
}

const dietaryIcons: Record<string, string> = {
  vegetarian: "🥬",
  vegan: "🌱",
  "contains-nuts": "🥜",
  "contains-gluten": "🌾",
  "contains-dairy": "🥛",
  "contains-seafood": "🐟",
  spicy: "🌶️",
};

export default function MenuScannerPage() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const activeTrip = useTripStore((s) => s.getActiveTrip)();

  const language = activeTrip?.language || "es";
  const langConfig = getLanguage(language);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MenuResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "recommended" | "caution">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const scanMenu = async () => {
    if (!imageBase64 || !activeTrip) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/menu-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          language,
          languageName: langConfig.name,
          city: activeTrip.destinationCity,
          foodPreferences: activeTrip.foodPreferences || [],
        }),
      });
      if (!res.ok) throw new Error("Failed to scan menu");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to read the menu. Try a clearer photo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = result?.items.filter((item) => {
    if (filter === "all") return true;
    return item.recommendation === filter;
  });

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
          <h1 className="text-lg font-bold">Menu Scanner</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Snap a menu, get instant translations
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Camera / Upload section */}
        {!result && (
          <div className="px-4 pt-6 space-y-4">
            <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-surface-light)] overflow-hidden">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Menu preview"
                    className="w-full max-h-80 object-contain bg-black"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-16 flex flex-col items-center gap-4 cursor-pointer hover:bg-[var(--color-surface-light)]/30 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--color-primary)">
                      <circle cx="12" cy="12" r="3.2" />
                      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Take a photo of the menu</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      or upload an image from your gallery
                    </p>
                  </div>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />

            {imagePreview && (
              <button
                onClick={scanMenu}
                disabled={isProcessing}
                className="w-full py-3 bg-[var(--color-primary)] rounded-xl text-white font-medium cursor-pointer disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Reading menu...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                    </svg>
                    Translate Menu
                  </>
                )}
              </button>
            )}

            {!imagePreview && (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Point your camera at any {langConfig.name} menu and we&apos;ll translate every dish with cultural context
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 pt-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setImagePreview(null);
                  setImageBase64(null);
                }}
                className="mt-2 text-sm text-[var(--color-primary)] cursor-pointer hover:underline"
              >
                Try another photo
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="px-4 py-4 space-y-4">
            {/* Summary */}
            <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-surface-light)]">
              {result.restaurantName && (
                <h2 className="font-bold text-lg mb-1">{result.restaurantName}</h2>
              )}
              <p className="text-sm text-[var(--color-text-muted)]">{result.summary}</p>
              <button
                onClick={() => {
                  setResult(null);
                  setImagePreview(null);
                  setImageBase64(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-3 text-sm text-[var(--color-primary)] cursor-pointer hover:underline"
              >
                Scan another menu
              </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {(["all", "recommended", "caution"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    filter === f
                      ? f === "recommended"
                        ? "bg-green-500/20 text-green-400"
                        : f === "caution"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-surface-light)]"
                  }`}
                >
                  {f === "all"
                    ? `All (${result.items.length})`
                    : f === "recommended"
                    ? `Try these (${result.items.filter((i) => i.recommendation === "recommended").length})`
                    : `Caution (${result.items.filter((i) => i.recommendation === "caution").length})`}
                </button>
              ))}
            </div>

            {/* Menu items */}
            <div className="space-y-3">
              {filteredItems?.map((item, i) => (
                <div
                  key={i}
                  className={`bg-[var(--color-surface)] rounded-xl p-4 border-l-4 border border-[var(--color-surface-light)] ${
                    item.recommendation === "recommended"
                      ? "border-l-green-500"
                      : item.recommendation === "caution"
                      ? "border-l-red-500"
                      : "border-l-[var(--color-surface-light)]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{item.original}</p>
                      <p className="text-sm text-[var(--color-primary)]">
                        {item.translation}
                      </p>
                    </div>
                    {item.price && (
                      <span className="text-sm font-medium text-[var(--color-text-muted)] ml-2">
                        {item.price}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    {item.description}
                  </p>

                  {/* Dietary flags */}
                  {item.dietary.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.dietary.map((d) => (
                        <span
                          key={d}
                          className="text-xs bg-[var(--color-surface-light)] px-2 py-0.5 rounded-full"
                        >
                          {dietaryIcons[d] || "📌"} {d.replace("contains-", "")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recommendation */}
                  {item.recommendation !== "neutral" && (
                    <p
                      className={`text-xs mt-2 font-medium ${
                        item.recommendation === "recommended"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {item.recommendation === "recommended" ? "★" : "⚠️"}{" "}
                      {item.recommendationReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
