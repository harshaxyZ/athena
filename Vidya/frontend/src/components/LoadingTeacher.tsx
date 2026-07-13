"use client";

import { motion } from "framer-motion";

interface LoadingTeacherProps {
  progress?: string;
  step?: number;
}

/**
 * Loading screen shown while the DAG pipeline processes the content.
 * Shows an animated teacher with real progress from the backend when available.
 */
export default function LoadingTeacher({ progress, step = 0 }: LoadingTeacherProps) {
  const stages = [
    { icon: "📄", label: "Reading your document" },
    { icon: "🧠", label: "Understanding concepts" },
    { icon: "📋", label: "Planning your lesson" },
    { icon: "🎨", label: "Creating visual explanations" },
    { icon: "🗣️", label: "Preparing voice narration" },
  ];

  return (
    <div className="text-center px-6">
      {/* Animated teacher silhouette */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mb-8"
      >
        <svg viewBox="0 0 120 140" className="w-32 h-36 mx-auto">
          <circle cx="60" cy="35" r="25" fill="#FCD34D" />
          <motion.g
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <circle cx="50" cy="33" r="3" fill="#1E293B" />
            <circle cx="70" cy="33" r="3" fill="#1E293B" />
          </motion.g>
          <path d="M 50 42 Q 60 50 70 42" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
          <rect x="35" y="60" width="50" height="55" rx="12" fill="#4F46E5" />
          <motion.g
            animate={{ rotate: [0, -10, 0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ transformOrigin: "85px 70px" }}
          >
            <rect x="85" y="65" width="12" height="35" rx="6" fill="#4F46E5" />
          </motion.g>
          <rect x="23" y="65" width="12" height="35" rx="6" fill="#4F46E5" />
        </svg>
      </motion.div>

      <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">
        Your AI Teacher is Getting Ready! 🎓
      </h2>
      <p className="text-slate-500 mb-8">
        {progress || "Preparing a personalized visual lesson for you..."}
      </p>

      {/* Progress steps — now driven by real backend progress */}
      <div className="max-w-md mx-auto space-y-3">
        {stages.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="flex items-center gap-3 text-left"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.15 + 0.1, type: "spring" }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  done ? "bg-green-100" : active ? "bg-vidya-100" : "bg-slate-100"
                }`}
              >
                {s.icon}
              </motion.div>
              <span className={`text-sm ${
                done ? "text-green-600" : active ? "text-slate-800 font-medium" : "text-slate-400"
              }`}>
                {s.label}
              </span>
              {done && <span className="ml-auto text-xs text-green-500">✓</span>}
              {active && (
                <motion.div
                  className="ml-auto"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-xs text-vidya-500">●</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
