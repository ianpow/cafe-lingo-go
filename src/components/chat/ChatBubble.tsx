"use client";

import type { Message } from "@/lib/types";

interface ChatBubbleProps {
  message: Message;
  showTranslation: boolean;
}

export function ChatBubble({ message, showTranslation }: ChatBubbleProps) {
  const isAvatar = message.role === "avatar";

  return (
    <div
      className={`flex ${isAvatar ? "justify-start" : "justify-end"} mb-3`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAvatar
            ? "bg-[var(--color-surface-light)] rounded-bl-sm"
            : "bg-[var(--color-primary)] rounded-br-sm"
        }`}
      >
        <p className="text-sm font-medium">{message.content}</p>
        {showTranslation && message.translation && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1 italic">
            {message.translation}
          </p>
        )}
        {message.pronunciationScore !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            <div
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                message.pronunciationScore >= 80
                  ? "bg-green-500/20 text-green-400"
                  : message.pronunciationScore >= 60
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {message.pronunciationScore}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
