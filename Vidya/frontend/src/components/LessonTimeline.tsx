"use client";

import { motion } from "framer-motion";

interface LessonTimelineProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Bottom timeline bar showing lesson progress with step indicators.
 */
export default function LessonTimeline({ currentStep, totalSteps }: LessonTimelineProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="bg-slate-800 border-t border-slate-700/50 px-6 py-3">
      <div className="flex items-center gap-4">
        {/* Progress text */}
        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
          {currentStep + 1}/{totalSteps}
        </span>

        {/* Step indicators */}
        <div className="flex-1 flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 group relative">
              {/* Connector line */}
              {i < totalSteps - 1 && (
                <div
                  className={`absolute top-1/2 left-1/2 h-0.5 -translate-y-1/2 ${
                    i < currentStep ? "bg-vidya-500" : "bg-slate-600"
                  }`}
                  style={{ width: "100%" }}
                />
              )}

              {/* Dot */}
              <motion.div
                className={`relative z-10 w-3 h-3 rounded-full mx-auto cursor-pointer transition-colors ${
                  i < currentStep
                    ? "bg-vidya-500"
                    : i === currentStep
                    ? "bg-vidya-400 ring-2 ring-vidya-400/50"
                    : "bg-slate-600"
                }`}
                animate={
                  i === currentStep
                    ? { scale: [1, 1.3, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 1, repeat: i === currentStep ? Infinity : 0 }}
              />
            </div>
          ))}
        </div>

        {/* Progress percentage */}
        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-vidya-500 to-vidya-400 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
