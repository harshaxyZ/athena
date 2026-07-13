"use client";

import { motion } from "framer-motion";

interface TeacherAvatarProps {
  gesture: string;
  speaking: boolean;
}

/**
 * Animated SVG teacher avatar.
 * Changes pose/expression based on the gesture and speaking state.
 */
export default function TeacherAvatar({ gesture, speaking }: TeacherAvatarProps) {
  const gestureConfig: Record<string, { mouthOpen: boolean; armAngle: number; bodyTilt: number }> = {
    explain: { mouthOpen: true, armAngle: 0, bodyTilt: 0 },
    point: { mouthOpen: true, armAngle: -30, bodyTilt: 5 },
    think: { mouthOpen: false, armAngle: 20, bodyTilt: -5 },
    celebrate: { mouthOpen: true, armAngle: -45, bodyTilt: 0 },
    wave: { mouthOpen: true, armAngle: -60, bodyTilt: 0 },
  };

  const config = gestureConfig[gesture] || gestureConfig.explain;

  return (
    <div className="relative">
      <motion.svg
        viewBox="0 0 200 280"
        className="w-48 h-64"
        animate={{
          rotate: [0, config.bodyTilt, 0],
          y: speaking ? [0, -3, 0] : 0,
        }}
        transition={{
          rotate: { duration: 0.5, ease: "easeInOut" },
          y: speaking
            ? { duration: 0.3, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 },
        }}
      >
        {/* Body */}
        <rect x="60" y="120" width="80" height="100" rx="15" fill="#4F46E5" />
        {/* Shirt collar */}
        <path d="M 80 120 L 100 145 L 120 120" fill="none" stroke="#818CF8" strokeWidth="3" />

        {/* Head */}
        <circle cx="100" cy="80" r="40" fill="#FCD34D" />

        {/* Hair */}
        <path d="M 60 70 Q 60 30 100 35 Q 140 30 140 70" fill="#1E293B" />

        {/* Eyes */}
        <g>
          <ellipse cx="85" cy="78" rx="5" ry="6" fill="#1E293B" />
          <ellipse cx="115" cy="78" rx="5" ry="6" fill="#1E293B" />
          {/* Eye shine */}
          <circle cx="87" cy="76" r="2" fill="white" />
          <circle cx="117" cy="76" r="2" fill="white" />
        </g>

        {/* Eyebrows */}
        <motion.path
          d={gesture === "think" ? "M 78 68 L 92 70" : "M 78 70 L 92 68"}
          stroke="#1E293B"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <motion.path
          d={gesture === "think" ? "M 108 70 L 122 68" : "M 108 68 L 122 70"}
          stroke="#1E293B"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Mouth */}
        {config.mouthOpen && speaking ? (
          <motion.ellipse
            cx="100"
            cy="95"
            rx="8"
            initial={{ ry: 3 }}
            fill="#DC2626"
            animate={{ ry: [3, 6, 3] }}
            transition={{ duration: 0.2, repeat: Infinity }}
          />
        ) : config.mouthOpen ? (
          <path d="M 90 92 Q 100 102 110 92" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
        ) : (
          <line x1="92" y1="95" x2="108" y2="95" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Glasses (optional — makes teacher look smart) */}
        <circle cx="85" cy="78" r="10" fill="none" stroke="#64748B" strokeWidth="1.5" />
        <circle cx="115" cy="78" r="10" fill="none" stroke="#64748B" strokeWidth="1.5" />
        <line x1="95" y1="78" x2="105" y2="78" stroke="#64748B" strokeWidth="1.5" />

        {/* Arm */}
        <motion.g
          animate={{ rotate: config.armAngle }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ transformOrigin: "140px 150px" }}
        >
          <rect x="140" y="130" width="15" height="60" rx="7" fill="#4F46E5" />
          {/* Hand */}
          <circle cx="147" cy="195" r="10" fill="#FCD34D" />
        </motion.g>

        {/* Left arm (static) */}
        <rect x="45" y="130" width="15" height="55" rx="7" fill="#4F46E5" />
        <circle cx="52" cy="190" r="10" fill="#FCD34D" />

        {/* Celebrate sparkles */}
        {gesture === "celebrate" && (
          <>
            <motion.text
              x="40" y="50" fontSize="16"
              animate={{ opacity: [0, 1, 0], y: [50, 30] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            >⭐</motion.text>
            <motion.text
              x="150" y="40" fontSize="14"
              animate={{ opacity: [0, 1, 0], y: [40, 20] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            >✨</motion.text>
            <motion.text
              x="100" y="25" fontSize="18"
              animate={{ opacity: [0, 1, 0], y: [25, 5] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
            >🎉</motion.text>
          </>
        )}
      </motion.svg>

      {/* Speaking indicator */}
      {speaking && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-vidya-400 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
