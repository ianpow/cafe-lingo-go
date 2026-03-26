"use client";

import { motion } from "framer-motion";

interface RecordButtonProps {
  isRecording: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}

export function RecordButton({
  isRecording,
  isDisabled,
  onToggle,
}: RecordButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        onClick={onToggle}
        onTouchEnd={(e) => {
          // Ensure touch works on mobile — prevent default to avoid ghost clicks
          e.preventDefault();
          if (!isDisabled) onToggle();
        }}
        disabled={isDisabled}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
          isRecording
            ? "bg-red-500 hover:bg-red-600"
            : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
        } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        style={{ zIndex: 50 }}
        whileTap={isDisabled ? {} : { scale: 0.95 }}
        animate={
          isRecording
            ? {
                boxShadow: [
                  "0 0 0 0 rgba(239, 68, 68, 0.4)",
                  "0 0 0 12px rgba(239, 68, 68, 0)",
                ],
              }
            : {}
        }
        transition={
          isRecording
            ? { duration: 1.2, repeat: Infinity, ease: "easeOut" }
            : {}
        }
      >
        {isRecording ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </motion.button>
      <span className="text-sm text-[var(--color-text-muted)]">
        {isRecording ? "Tap to stop" : isDisabled ? "Processing..." : "Tap to speak"}
      </span>
    </div>
  );
}
