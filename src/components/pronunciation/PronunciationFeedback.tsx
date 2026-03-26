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
      ? "text-green-400"
      : result.overallScore >= 60
        ? "text-yellow-400"
        : "text-red-400";

  const ringColor =
    result.overallScore >= 80
      ? "stroke-green-400"
      : result.overallScore >= 60
        ? "stroke-yellow-400"
        : "stroke-red-400";

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
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : word.accuracyScore >= 60
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30";
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
      ? "bg-green-400"
      : score >= 60
        ? "bg-yellow-400"
        : "bg-red-400";

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
