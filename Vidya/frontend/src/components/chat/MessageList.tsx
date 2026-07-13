"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import MessageBubble from "./MessageBubble";

const SUGGESTIONS = [
  "Explain how a rocket reaches orbit",
  "How does CRISPR gene editing work?",
  "What is the Fourier Transform?",
  "Explain Indian monsoon formation",
];

export default function MessageList() {
  const { messages, isStreaming } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden mb-5">
          <img src="/athena-logo.png" alt="Athena" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-xl font-semibold text-stone-200 mb-2 text-center">
          What do you want to learn?
        </h2>
        <p className="text-stone-500 text-center max-w-sm text-sm mb-8">
          Ask anything — I teach with explanations, animations, and voice.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
          {SUGGESTIONS.map((text, i) => (
            <button
              key={i}
              onClick={() => {
                const textarea = document.querySelector("textarea");
                if (textarea) {
                  const setter = Object.getOwnPropertyDescriptor(
                    window.HTMLTextAreaElement.prototype, "value"
                  )?.set;
                  setter?.call(textarea, text);
                  textarea.dispatchEvent(new Event("input", { bubbles: true }));
                }
              }}
              className="p-3 rounded-xl border text-left transition-all hover:border-athena-500/30"
              style={{background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.06)'}}
            >
              <span className="text-sm text-stone-400 group-hover:text-stone-200">
                {text}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs text-stone-600">
          Attach a PDF using the paperclip button below
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-stone-500 text-sm">
            <div className="w-2 h-2 bg-athena-500 rounded-full animate-pulse" />
            Athena is working...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
