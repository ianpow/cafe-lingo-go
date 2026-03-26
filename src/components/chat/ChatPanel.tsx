"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "./ChatBubble";
import type { Message } from "@/lib/types";

interface ChatPanelProps {
  messages: Message[];
  showTranslation: boolean;
}

export function ChatPanel({ messages, showTranslation }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messages.length === 0 && (
        <p className="text-center text-[var(--color-text-muted)] text-sm mt-8">
          The conversation will appear here...
        </p>
      )}
      {messages.map((message, index) => (
        <ChatBubble
          key={index}
          message={message}
          showTranslation={showTranslation}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
