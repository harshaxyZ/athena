"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { createSessionStream, createChatSocket, stepAudioUrl, getSessionStatus } from "@/lib/api";
import type { SSEHandle, WSHandle } from "@/lib/api";
import VisualCanvas from "@/components/VisualCanvas";
import SpeechPlayer from "@/components/SpeechPlayer";
import DoubtBox from "@/components/DoubtBox";
import LessonTimeline from "@/components/LessonTimeline";
import LoadingTeacher from "@/components/LoadingTeacher";
import { useLessonRecorder } from "@/lib/useLessonRecorder";
import { LANGUAGES, type SSEStepData } from "@/lib/types";

type ConnStatus = "connected" | "reconnecting" | "lost";

interface CostData {
  total_cost_usd: number;
  total_tokens: number;
  cached_tokens: number;
  cache_hit_rate: number;
  total_calls: number;
  agents: Record<string, { calls: number; total_tokens: number; cost_usd: number }>;
}

export default function SessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const studentClass = Number(searchParams.get("class")) || 5;
  const language = searchParams.get("lang") || "hi-IN";

  const [phase, setPhase] = useState<"loading" | "ready" | "playing" | "paused" | "ended">("loading");
  const [topic, setTopic] = useState("");
  const [currentStep, setCurrentStep] = useState<SSEStepData | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [waitDuration, setWaitDuration] = useState(0);
  const [firstSceneReady, setFirstSceneReady] = useState(false);
  const [error, setError] = useState("");
  const [doubtAnswer, setDoubtAnswer] = useState<string | null>(null);

  // Connection status
  const [sseStatus, setSseStatus] = useState<ConnStatus>("connected");
  const [wsStatus, setWsStatus] = useState<ConnStatus>("connected");

  // Real progress during loading
  const [loadingProgress, setLoadingProgress] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  // Mobile DoubtBox modal
  const [doubtBoxOpen, setDoubtBoxOpen] = useState(false);

  // Cost tracking
  const [costData, setCostData] = useState<CostData | null>(null);
  const [costOpen, setCostOpen] = useState(false);

  const sseRef = useRef<SSEHandle | null>(null);
  const wsRef = useRef<WSHandle | null>(null);
  const streamDoneRef = useRef(false);

  const recorder = useLessonRecorder(topic || "vidya-lesson");

  // Progressive part buffering
  const bufferRef = useRef<(SSEStepData | null)[]>([]);
  const playIndexRef = useRef(0);
  const startedRef = useRef(false);
  const waitingRef = useRef(false);
  const allReceivedRef = useRef(false);
  const totalStepsRef = useRef(0);

  const setWaiting = useCallback((v: boolean) => {
    waitingRef.current = v;
    setWaitingForNext(v);
    if (v) setWaitDuration(0);
  }, []);

  const playStep = useCallback((index: number) => {
    const step = bufferRef.current[index];
    if (!step) return false;
    playIndexRef.current = index;
    startedRef.current = true;
    setCurrentStep(step);
    setCurrentStepIndex(index);
    setWaiting(false);
    return true;
  }, [setWaiting]);

  const handleStepEnded = useCallback(() => {
    const next = playIndexRef.current + 1;
    if (next >= totalStepsRef.current) {
      if (allReceivedRef.current) setPhase("ended");
      else setWaiting(true);
      return;
    }
    if (!playStep(next)) setWaiting(true);
  }, [playStep, setWaiting]);

  const handleStartLesson = useCallback(() => {
    setPhase("playing");
    playStep(0);
  }, [playStep]);

  // Auto-finalize recording
  useEffect(() => {
    if (phase === "ended" && recorder.recording) recorder.stop();
  }, [phase, recorder.recording, recorder.stop]);

  // Waiting timeout
  useEffect(() => {
    if (!waitingForNext) { setWaitDuration(0); return; }
    const interval = setInterval(() => setWaitDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [waitingForNext]);

  // Real progress polling during loading
  useEffect(() => {
    if (phase !== "loading") return;
    const stages = ["Uploading...", "Analyzing document...", "Extracting concepts...", "Planning lesson...", "Generating visuals..."];
    let step = 0;
    const poll = setInterval(async () => {
      try {
        const status = await getSessionStatus(sessionId);
        if (status.status === "ready" || status.status === "playing") {
          setLoadingProgress("Lesson ready!"); setLoadingStep(stages.length); clearInterval(poll); return;
        }
        if (status.status === "error") { setError("Failed to generate lesson"); clearInterval(poll); return; }
        const stageIdx = status.status === "processing" ? Math.min(step, stages.length - 1) : 0;
        setLoadingProgress(stages[stageIdx]); setLoadingStep(stageIdx); step++;
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(poll);
  }, [phase, sessionId]);

  // Fetch cost data periodically
  useEffect(() => {
    if (phase === "loading") return;
    const fetchCost = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/usage`);
        if (res.ok) setCostData(await res.json());
      } catch { /* ignore */ }
    };
    fetchCost();
    const interval = setInterval(fetchCost, 10000);
    return () => clearInterval(interval);
  }, [phase, sessionId]);

  // SSE connection
  useEffect(() => {
    const sse = createSessionStream(sessionId, (event, data) => {
      switch (event) {
        case "session:start":
          setTopic(data.topic); setTotalSteps(data.total_steps);
          totalStepsRef.current = data.total_steps;
          bufferRef.current = new Array(data.total_steps).fill(null);
          setPhase("ready"); break;
        case "session:step": {
          const idx = data.step_id - 1;
          bufferRef.current[idx] = data;
          if (idx === 0) setFirstSceneReady(true);
          if (startedRef.current && waitingRef.current && idx === playIndexRef.current + 1) playStep(idx);
          break;
        }
        case "session:pause": setPhase("paused"); break;
        case "session:resume": setPhase("playing"); setDoubtAnswer(null); break;
        case "session:end":
          allReceivedRef.current = true;
          // If the final scene's audio already ended and we parked in the
          // waiting state (allReceived was still false then), release it now
          // that every step has arrived — otherwise playback stalls on
          // "preparing next" forever.
          if (waitingRef.current && playIndexRef.current + 1 >= totalStepsRef.current) {
            setWaiting(false);
            setPhase("ended");
          }
          // Defer close so React state updates from this event process first
          setTimeout(() => {
            streamDoneRef.current = true;
            sseRef.current?.close();
          }, 50);
          break;
        case "error": setError(data.message); break;
      }
    }, (err) => {
      // Backup: if the stream closes naturally (server done) without session:end
      // reaching us, finish the lesson instead of showing an error
      if (!streamDoneRef.current) {
        streamDoneRef.current = true;
        allReceivedRef.current = true;
        // If we were playing/waiting and all steps were received, end the lesson
        if (playIndexRef.current + 1 >= totalStepsRef.current) {
          setPhase("ended");
        }
      }
    }, setSseStatus);
    sseRef.current = sse;
    return () => sse.close();
  }, [sessionId]);

  // WebSocket connection
  useEffect(() => {
    const ws = createChatSocket(sessionId,
      (msg) => {
        if (msg.type === "answer") setDoubtAnswer(msg.text);
        else if (msg.type === "session_paused") setPhase("paused");
        else if (msg.type === "session_resumed") setPhase("playing");
      },
      () => {}, () => {},
      (err) => console.error("WS error:", err),
      setWsStatus
    );
    wsRef.current = ws;
    return () => ws.close();
  }, [sessionId]);

  const handleAskDoubt = useCallback((question: string) => {
    wsRef.current?.send(JSON.stringify({ type: "question", text: question }));
  }, []);

  const handleRetry = useCallback(() => {
    setError(""); sseRef.current?.reconnect(); wsRef.current?.reconnect();
  }, []);

  const overallStatus: ConnStatus =
    sseStatus === "lost" || wsStatus === "lost" ? "lost"
    : sseStatus === "reconnecting" || wsStatus === "reconnecting" ? "reconnecting"
    : "connected";

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* ── Top Bar (responsive) ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-3 sm:px-6 py-2.5 flex items-center justify-between safe-bottom">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 bg-vidya-500 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">V</div>
          <span className="font-display font-semibold text-sm truncate">{topic || "Vidya"}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {overallStatus !== "connected" && phase !== "ended" && (
            <span className={`text-xs font-medium rounded-full px-2 sm:px-3 py-1 border ${
              overallStatus === "reconnecting"
                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300 animate-pulse"
                : "bg-red-500/20 border-red-500/50 text-red-300"
            }`}>
              {overallStatus === "reconnecting" ? "🔄 Reconnecting..." : "⚠️ Disconnected"}
            </span>
          )}
          {/* Language — hidden on very small screens */}
          <span className="hidden sm:inline text-xs text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1">
            🗣️ {LANGUAGES[language] || language}
          </span>
          {/* Chat status */}
          <span className={`text-xs rounded-full px-2 py-0.5 ${wsStatus === "connected" ? "text-green-400" : "text-slate-500"}`}
            title={wsStatus === "connected" ? "Doubt chat active" : "Doubt chat unavailable"}>💬</span>
          {/* Record — hidden on mobile */}
          {recorder.supported && (
            <button onClick={() => (recorder.recording ? recorder.stop() : recorder.start())}
              className={`hidden sm:block text-xs font-medium rounded-full px-3 py-1 border transition-colors ${
                recorder.recording
                  ? "bg-red-500/20 border-red-500/50 text-red-300 animate-pulse"
                  : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-white"
              }`}>
              {recorder.recording ? "■ Stop" : "● Record"}
            </button>
          )}
          {/* Cost badge */}
          {costData && costData.total_cost_usd > 0 && (
            <button onClick={() => setCostOpen(!costOpen)}
              className="text-xs text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/50 rounded-full px-2 py-0.5 transition-colors">
              ${costData.total_cost_usd.toFixed(3)}
            </button>
          )}
          {phase === "paused" && <span className="text-saffron-400 text-xs sm:text-sm font-medium animate-pulse">⏸️ Doubt</span>}
          {phase === "playing" && <span className="text-green-400 text-sm">●</span>}
        </div>
      </div>

      {/* ── Cost Overlay ── */}
      <AnimatePresence>
        {costOpen && costData && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 right-3 sm:right-6 z-50 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl w-72">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Session Cost</h3>
              <button onClick={() => setCostOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Total Cost</span><span className="text-white font-mono">${costData.total_cost_usd.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Total Tokens</span><span className="text-white font-mono">{(costData.total_tokens / 1000).toFixed(1)}k</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Cached Tokens</span><span className="text-green-400 font-mono">{costData.cache_hit_rate}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">API Calls</span><span className="text-white font-mono">{costData.total_calls}</span></div>
              {Object.entries(costData.agents).map(([name, a]) => (
                <div key={name} className="flex justify-between border-t border-slate-700 pt-1">
                  <span className="text-slate-500 truncate">{name}</span>
                  <span className="text-slate-300 font-mono">{(a.total_tokens / 1000).toFixed(1)}k · ${a.cost_usd.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="pt-12 sm:pt-14 h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {phase === "loading" && !error && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center px-4">
              <LoadingTeacher progress={loadingProgress} step={loadingStep} />
            </motion.div>
          )}

          {phase === "ready" && !error && (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center px-4">
              <div className="text-center max-w-md px-4">
                <div className="text-5xl sm:text-6xl mb-4">{firstSceneReady ? "🎬" : "✨"}</div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">{topic || "Your lesson"}</h2>
                <p className="text-slate-400 mb-8 text-sm sm:text-base">
                  {firstSceneReady ? "Your lesson is ready. The rest keeps preparing while you watch." : "Preparing the first scene..."}
                </p>
                <button onClick={handleStartLesson} disabled={!firstSceneReady}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-vidya-500 hover:bg-vidya-600 rounded-xl font-display font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]">
                  {firstSceneReady ? "▶ Start lesson" : "Preparing..."}
                </button>
              </div>
            </motion.div>
          )}

          {(phase === "playing" || phase === "paused") && currentStep && !error && (
            <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col lg:flex-row gap-0 min-h-0">
              {/* Main video stage */}
              <div className="flex-1 flex flex-col min-w-0 bg-slate-950 min-h-0">
                <div className="flex-1 relative bg-slate-950 overflow-hidden min-h-0">
                  <AnimatePresence mode="wait">
                    <motion.div key={currentStep.step_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }} className="absolute inset-0">
                      <VisualCanvas htmlContent={currentStep.html_content} fallbackText={currentStep.speech_script} />
                    </motion.div>
                  </AnimatePresence>

                  {/* Scene counter */}
                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 text-[10px] sm:text-xs text-slate-300 bg-slate-900/70 rounded-full px-2 sm:px-3 py-0.5 sm:py-1">
                    {currentStep.step_id}/{totalSteps}
                  </div>

                  {/* Waiting overlay */}
                  {waitingForNext && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                      <div className="text-center text-slate-300 px-4">
                        <div className="text-2xl sm:text-3xl mb-2 animate-pulse">✏️</div>
                        {waitDuration < 30 ? <p className="text-sm">Preparing next part...</p>
                          : waitDuration < 60 ? <p className="text-sm text-yellow-300">Still working on the next scene...</p>
                          : <div><p className="text-sm text-orange-300 mb-1">Taking longer than expected.</p>
                              <p className="text-xs text-slate-500">You can keep watching or refresh.</p></div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Narration + audio */}
                <SpeechPlayer key={currentStep.step_id} text={currentStep.speech_script}
                  audioUrl={stepAudioUrl(sessionId, currentStep.step_id)} audioBase64={currentStep.audio_b64}
                  isPlaying={phase === "playing"} onEnded={handleStepEnded}
                  fallbackSeconds={currentStep.duration_estimate || 8} />
              </div>

              {/* Desktop: DoubtBox sidebar */}
              <div className="hidden lg:flex lg:w-80 bg-slate-800/30 border-l border-slate-700/30 flex-col">
                <DoubtBox onAsk={handleAskDoubt} answer={doubtAnswer} isPaused={phase === "paused"} />
              </div>
            </motion.div>
          )}

          {phase === "ended" && !error && (
            <motion.div key="ended" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex items-center justify-center px-4">
              <div className="text-center">
                <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Lesson Complete!</h2>
                <p className="text-slate-400 mb-8 text-sm sm:text-base">
                  Great job learning about <span className="text-vidya-400">{topic}</span>
                </p>
                <button onClick={() => window.location.href = "/"}
                  className="px-6 py-3 bg-vidya-500 hover:bg-vidya-600 rounded-xl font-medium transition-colors min-h-[48px]">
                  Learn Something New
                </button>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center px-4">
              <div className="text-center text-red-400 max-w-md px-4">
                <p className="text-lg sm:text-xl mb-2">⚠️ Something went wrong</p>
                <p className="text-sm text-slate-500 mb-6">{error}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button onClick={handleRetry}
                    className="w-full sm:w-auto px-6 py-3 bg-vidya-500 hover:bg-vidya-600 text-white rounded-xl font-medium transition-colors text-sm min-h-[44px]">
                    🔄 Retry Connection
                  </button>
                  <button onClick={() => window.location.reload()}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors text-sm min-h-[44px]">
                    ↻ Refresh Page
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Timeline */}
        {totalSteps > 0 && <LessonTimeline currentStep={currentStepIndex} totalSteps={totalSteps} />}
      </div>

      {/* ── Mobile DoubtBox FAB + Modal ── */}
      {(phase === "playing" || phase === "paused") && !error && (
        <>
          {/* FAB — visible only on mobile */}
          <button onClick={() => setDoubtBoxOpen(true)}
            className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-vidya-500 hover:bg-vidya-600 shadow-lg shadow-vidya-500/30 flex items-center justify-center transition-all min-w-[56px] min-h-[56px]">
            <MessageCircle className="w-6 h-6 text-white" />
          </button>

          {/* Slide-up modal */}
          <AnimatePresence>
            {doubtBoxOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                <div className="absolute inset-0 bg-black/50" onClick={() => setDoubtBoxOpen(false)} />
                <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative bg-slate-800 rounded-t-2xl max-h-[70vh] flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30">
                    <span className="text-sm font-semibold text-slate-300">Ask a Doubt</span>
                    <button onClick={() => setDoubtBoxOpen(false)} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white min-w-[44px] min-h-[44px]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden min-h-0">
                    <DoubtBox onAsk={handleAskDoubt} answer={doubtAnswer} isPaused={phase === "paused"} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
