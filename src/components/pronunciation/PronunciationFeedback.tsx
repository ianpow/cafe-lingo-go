"use client";

import { motion } from "framer-motion";
import type { PronunciationResult } from "@/lib/types/pronunciation";

interface PronunciationFeedbackProps {
  result: PronunciationResult;
}

export function PronunciationFeedback({
  result,
}: PronunciationFeedbackProps) {
  const scoreColor =
    result.overallScore >= 80
      ? "text-[var(--color-success)]"
      : result.overallScore >= 60
        ? "text-[var(--color-warning)]"
        : "text-[var(--color-error)]";

  const ringColor =
    result.overallScore >= 80
      ? "stroke-[var(--color-success)]"
      : result.overallScore >= 60
        ? "stroke-[var(--color-warning)]"
        : "stroke-[var(--color-error)]";

  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - result.overallScore / 100);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 mx-4 mb-4">
      <div className="flex items-center gap-6">
        {/* Score ring */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--color-surface-light)"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              className={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${scoreColor}`}>
              {result.overallScore}
            </span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="flex-1 space-y-2">
          <SubScore label="Accuracy" score={result.accuracyScore} />
          <SubScore label="Fluency" score={result.fluencyScore} />
          <SubScore label="Completeness" score={result.completenessScore} />
        </div>
      </div>

      {/* Word-level scores */}
      {result.words.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--color-surface-light)]">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Word Scores
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {result.words.map((word, i) => {
              const color =
                word.accuracyScore >= 80
                  ? "bg-[color-mix(in_srgb,var(--color-success)_20%,transparent)] text-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]"
                  : word.accuracyScore >= 60
                    ? "bg-[color-mix(in_srgb,var(--color-warning)_20%,transparent)] text-[var(--color-warning)] border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]"
                    : "bg-[color-mix(in_srgb,var(--color-error)_20%,transparent)] text-[var(--color-error)] border-[color-mix(in_srgb,var(--color-error)_30%,transparent)]";
              return (
                <span
                  key={i}
                  className={`text-sm px-2 py-1 rounded-lg border ${color}`}
                >
                  {word.word}{" "}
                  <span className="text-xs opacity-75">
                    {word.accuracyScore}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SubScore({ label, score }: { label: string; score: number }) {
  const barColor =
    score >= 80
      ? "bg-[var(--color-success)]"
      : score >= 60
        ? "bg-[var(--color-warning)]"
        : "bg-[var(--color-error)]";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-text-muted)] w-24">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-[var(--color-surface-light)] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}</span>
    </div>
  );
}
