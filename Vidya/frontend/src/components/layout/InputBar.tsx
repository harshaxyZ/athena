"use client";

import { useState, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { chatStream } from "@/lib/api";
import { Message, AnimationData } from "@/lib/types";
import { Send, Paperclip, X, Zap } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";

const TEST_PROMPTS = [
  "Explain quantum entanglement with an animation showing two entangled particles — measuring one instantly affects the other, regardless of distance. Show the Bell state equation and how spin measurement works.",
  "Animate the process of CRISPR-Cas9 gene editing: show the guide RNA finding the target DNA sequence, the Cas9 enzyme cutting the double helix, and the cell's repair mechanism inserting the new gene.",
  "Visualize how a black hole warps spacetime — show the fabric of spacetime bending around the singularity, the event horizon, Hawking radiation escaping, and time dilation near the horizon.",
  "Create an animation of the Indian monsoon system: show warm air rising from the Indian Ocean, moisture being carried by the southwest monsoon winds, hitting the Western Ghats, causing orographic rainfall.",
  "Explain Fourier Transform with an animation: show a complex waveform being decomposed into simple sine and cosine waves of different frequencies.",
  "Animate plate tectonics showing the Indian plate colliding with the Eurasian plate over millions of years — the gradual uplift forming the Himalayas, with force vectors and pressure indicators.",
  "Show how a four-stroke internal combustion engine works: intake stroke, compression stroke, power stroke, and exhaust stroke with animated pistons and valves.",
  "Explain eigenvalues and eigenvectors with an animation: show a 2D matrix transforming a grid of vectors, highlighting which vectors only get scaled.",
  "Animate the entire protein folding process: show the amino acid chain emerging from the ribosome, collapsing into alpha helices and beta sheets, and folding into the 3D protein shape.",
  "Visualize the Doppler effect: show a sound source moving toward and away from an observer, with wavefronts compressing and stretching, explaining why an ambulance siren changes pitch.",
];

export default function InputBar() {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<{ close: () => void } | null>(null);

  const {
    currentConversationId, setCurrentConversation,
    addMessage, updateLastMessage, setStreaming,
    language, secondaryLanguage, setCurrentCost,
    isStreaming,
  } = useStore();

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput("");
    setStreaming(true);

    // Add placeholder assistant message
    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    addMessage(assistantMsg);

    const convId = currentConversationId || "";

    abortRef.current = chatStream(
      text,
      convId,
      language,
      secondaryLanguage,
      attachedFile,
      // onText
      (token) => updateLastMessage(token),
      // onAnimation — receives { type: "js_scene", code: "..." }
      (data: AnimationData) => {
        useStore.setState((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              hasAnimation: true,
              animationData: data,
            };
          }
          return { messages: msgs };
        });
      },
      // onAudio
      (base64) => {
        try {
          const audio = new Audio(`data:audio/wav;base64,${base64}`);
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch {}
      },
      // onCost
      (data) => setCurrentCost(data),
      // onDone
      (convId) => {
        setCurrentConversation(convId);
        setStreaming(false);
        setStatus("");
        setAttachedFile(null);
        useStore.setState((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, isStreaming: false };
          }
          return { messages: msgs };
        });
      },
      // onError
      (err) => {
        setStreaming(false);
        setStatus("");
        updateLastMessage(`\n\nError: ${err}`);
        useStore.setState((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, isStreaming: false };
          }
          return { messages: msgs };
        });
      },
      // onStatus
      (statusText) => {
        setStatus(statusText);
      },
    );
  }, [input, isStreaming, currentConversationId, language, secondaryLanguage, attachedFile, addMessage, updateLastMessage, setStreaming, setCurrentConversation, setCurrentCost]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    abortRef.current?.close();
    setStreaming(false);
  };

  const handleTestTopic = () => {
    const randomIdx = Math.floor(Math.random() * TEST_PROMPTS.length);
    setInput(TEST_PROMPTS[randomIdx]);
  };

  return (
    <div className="border-t p-4" style={{background: '#050505', borderColor: 'rgba(255,255,255,0.06)'}}>
      <div className="max-w-5xl mx-auto">
        {/* Attached file */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 bg-surface-700 rounded-lg px-3 py-2 text-sm">
            <Paperclip className="w-4 h-4 text-athena-400" />
            <span className="text-stone-200 flex-1 truncate">{attachedFile.name}</span>
            <span className="text-stone-500 text-xs">{(attachedFile.size / 1024).toFixed(0)}KB</span>
            <button
              onClick={() => setAttachedFile(null)}
              className="text-stone-500 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-2 rounded-2xl border p-2 focus-within:border-athena-500/50 transition-colors" style={{background: '#111', borderColor: 'rgba(255,255,255,0.08)'}}>
          {/* File attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-300 hover:bg-surface-600 transition-all flex-shrink-0"
            title="Attach PDF or text file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size <= 20 * 1024 * 1024) setAttachedFile(f);
            }}
            className="hidden"
          />

          {/* Test animation */}
          <button
            onClick={handleTestTopic}
            className="p-2 rounded-xl text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all flex-shrink-0"
            title="Load a tough animation test topic"
          >
            <Zap className="w-5 h-5" />
          </button>

          {/* Text input */}
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Athena anything..."
            minRows={1}
            maxRows={8}
            className="flex-1 bg-transparent text-stone-100 placeholder:text-stone-500 resize-none outline-none py-2 px-1 text-sm leading-relaxed"
          />

          {/* Send / Stop */}
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex-shrink-0"
              title="Stop generating"
            >
              <div className="w-4 h-4 bg-red-400 rounded-sm" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-athena-600 text-white hover:bg-athena-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-2 text-center text-xs text-stone-600">
          {status ? (
            <span className="text-athena-400">{status}</span>
          ) : (
            "Enter to send, Shift+Enter for new line"
          )}
        </div>
      </div>
    </div>
  );
}
