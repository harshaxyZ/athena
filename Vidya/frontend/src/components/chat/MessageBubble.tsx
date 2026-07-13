"use client";

import { useState, useMemo } from "react";
import { Message } from "@/lib/types";
import { User, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AnimationCanvas from "@/components/canvas/AnimationCanvas";

interface Props {
  message: Message;
}

function stripCodeBlocks(text: string): string {
  return text
    // Code blocks
    .replace(/```[\s\S]*?```/g, "")
    // HTML
    .replace(/<!DOCTYPE[\s\S]*?<\/html>/gi, "")
    .replace(/<html[\s\S]*?<\/html>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // LaTeX
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$]+?\$/g, "")
    .replace(/\\[a-zA-Z]+/g, (m) => {
      const r: Record<string, string> = {
        '\\alpha':'alpha','\\beta':'beta','\\gamma':'gamma','\\omega':'w',
        '\\sigma':'sigma','\\delta':'delta','\\theta':'theta','\\lambda':'lambda',
        '\\pi':'pi','\\infty':'infinity','\\int':'integral','\\frac':'/',
        '\\sqrt':'sqrt','\\sum':'sum','\\cdot':'*','\\times':'x','\\pm':'+/-',
      };
      return r[m] || '';
    })
    // ALL emojis in one pass — covers all Unicode emoji ranges
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, "")
    // Clean up
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function MessageBubble({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const jsCode = message.animationData?.code || "";
  const hasAnimation = message.hasAnimation && jsCode;

  // Strip code blocks from content if animation is present
  const displayContent = useMemo(() => {
    if (!message.content) return message.content;
    if (jsCode) {
      return stripCodeBlocks(message.content);
    }
    return message.content;
  }, [message.content, jsCode]);

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Athena avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-surface-600 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
          <img src="/athena-logo.png" alt="Athena" className="w-6 h-6 object-contain" />
        </div>
      )}

      <div className={`max-w-[90%] sm:max-w-[85%] ${isUser ? "order-1" : ""} min-w-0`}>
        {/* Message content */}
        {displayContent && (
          <div className={isUser ? "msg-user" : "msg-assistant"}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <div className="markdown-content text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayContent || (message.isStreaming ? "" : "Thinking...")}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="typing-cursor inline-block w-0.5 h-4 bg-athena-400 ml-0.5" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Copy button */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-1 mt-1.5">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-stone-600 hover:text-stone-300 hover:bg-surface-600 transition-all"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* User timestamp */}
        {isUser && (
          <div className="text-xs text-stone-600 mt-1 text-right">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-surface-500 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-5 h-5 text-stone-300" />
        </div>
      )}

      {/* Animation canvas — inline */}
      {hasAnimation && !isUser && (
        <div id={`animation-${message.id}`} className="w-full mt-3">
          <AnimationCanvas jsCode={jsCode} />
        </div>
      )}
    </div>
  );
}
