"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface SpeechPlayerProps {
  text: string;
  audioBase64?: string;
  audioUrl?: string;
  isPlaying: boolean;
  onEnded?: () => void;
  fallbackSeconds?: number;
}

/**
 * Audio player bar that plays TTS audio with waveform visualization.
 * Shows the current speech text alongside audio playback.
 * Prefers `audioUrl` (browser streams from the endpoint); falls back to base64.
 */
export default function SpeechPlayer({ text, audioBase64, audioUrl, isPlaying, onEnded, fallbackSeconds = 8 }: SpeechPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);

  const src = audioUrl || (audioBase64 ? `data:audio/wav;base64,${audioBase64}` : "");

  // Keep latest onEnded/fallback for the once-attached listeners.
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const fallbackRef = useRef(fallbackSeconds);
  fallbackRef.current = fallbackSeconds;

  // Fallback: if a step never yields audio (TTS failed / endpoint errors),
  // advance after a timer so playback never stalls waiting for an "ended".
  const erroredRef = useRef(false);
  useEffect(() => {
    if (!isPlaying) return;
    // If there's no source at all, advance on the fallback timer.
    if (!src) {
      const t = setTimeout(() => onEndedRef.current?.(), fallbackSeconds * 1000);
      return () => clearTimeout(t);
    }
  }, [src, isPlaying, fallbackSeconds]);

  // Load the audio source (URL or base64) and auto-play when playing.
  useEffect(() => {
    if (!src) return;
    if (!audioRef.current) audioRef.current = new Audio();
    erroredRef.current = false;
    audioRef.current.src = src;
    audioRef.current.load();
    if (isPlaying && !muted) {
      audioRef.current.play().catch(() => {});
    }
  }, [src, muted]);

  useEffect(() => {
    if (isPlaying && audioRef.current && !muted) {
      audioRef.current.play().catch(() => {});
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, muted]);

  // Track progress + advance on audio end
  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleEnded = () => {
      setPlaying(false);
      onEndedRef.current?.();
    };
    const handlePlay = () => setPlaying(true);
    const handleError = () => {
      // Audio failed to load — don't stall; advance after the fallback delay.
      if (erroredRef.current) return;
      erroredRef.current = true;
      setPlaying(false);
      setTimeout(() => onEndedRef.current?.(), fallbackRef.current * 1000);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700/50 px-6 py-4">
      <div className="flex items-start gap-4">
        {/* Audio controls */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => {
              setMuted(!muted);
              if (audioRef.current) {
                audioRef.current.muted = !muted;
              }
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-vidya-500 hover:bg-vidya-600 flex items-center justify-center transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Audio visualizer */}
          <div className="audio-visualizer">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="audio-bar"
                animate={
                  playing && isPlaying
                    ? { height: [4, Math.random() * 16 + 4, 4] }
                    : { height: 4 }
                }
                transition={{
                  duration: 0.4 + Math.random() * 0.3,
                  repeat: playing ? Infinity : 0,
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        </div>

        {/* Speech text */}
        <div className="flex-1">
          <p className="text-sm text-slate-300 leading-relaxed">
            {text}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-vidya-400 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}
