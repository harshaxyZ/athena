"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, HelpCircle } from "lucide-react";

interface DoubtBoxProps {
  onAsk: (question: string) => void;
  answer: string | null;
  isPaused: boolean;
}

/**
 * Chat-like doubt resolution panel.
 * Students can type questions during the teaching session.
 */
export default function DoubtBox({ onAsk, answer, isPaused }: DoubtBoxProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "student" | "teacher"; text: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add answer to messages when received
  useEffect(() => {
    if (answer) {
      setMessages((prev) => [...prev, { role: "teacher", text: answer }]);
    }
  }, [answer]);

  const handleSend = () => {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "student", text: question }]);
    onAsk(question);
    setQuestion("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-vidya-400" />
          <span className="text-sm font-semibold text-slate-300">Ask a Doubt</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {isPaused
            ? "⏸️ Teacher is answering your doubt..."
            : "Type anytime to interrupt the lesson"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-y-touch">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              Confused about something? Just type your doubt below!
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "student"
                    ? "bg-vidya-500 text-white rounded-br-sm"
                    : "bg-slate-700 text-slate-200 rounded-bl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isPaused && !answer && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-slate-400 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/30">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your doubt..."
            className="flex-1 bg-slate-700/50 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-vidya-400/50 placeholder:text-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={!question.trim()}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-vidya-500 hover:bg-vidya-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
