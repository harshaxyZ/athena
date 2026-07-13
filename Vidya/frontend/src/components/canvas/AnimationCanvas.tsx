"use client";

import { useRef, useState } from "react";

interface Props {
  jsCode: string;
}

export default function AnimationCanvas({ jsCode }: Props) {
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!jsCode) return null;

  // Use srcDoc — same origin as parent, so /vendor/ scripts load correctly
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; overflow: hidden; }
  #stage { width: 1600px; height: 900px; position: relative; background: #1a1a2e; }
  canvas { display: block; }
</style>
</head>
<body>
  <div id="stage">
    <canvas id="board" width="1600" height="900"></canvas>
  </div>
  <script src="/vendor/rough.js"></script>
  <script src="/vendor/gsap.min.js"></script>
  <script src="/vendor/p5.min.js"></script>
  <script src="/vendor/anime.min.js"></script>
  <script src="/vendor/fabric.min.js"></script>
  <script src="/vendor/paper-full.min.js"></script>
  <script>
    var board = document.getElementById('board');
    var ctx = board.getContext('2d');
    var rc = rough.canvas(board);
    var stage = document.getElementById('stage');
    try { paper.setup(board); } catch(e) {}
    try {
      ${jsCode}
    } catch(e) {
      ctx.font = 'bold 48px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Error: ' + e.message, 80, 450);
      console.error('Scene error:', e);
    }
  </script>
</body>
</html>`;

  const reloadAnimation = () => {
    if (iframeRef.current) {
      // Force reload by setting srcdoc again
      const src = html;
      iframeRef.current.srcdoc = "";
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = src;
      });
    }
  };

  return (
    <>
      {/* Inline preview */}
      <div
        className={`rounded-xl overflow-hidden my-3 cursor-pointer transition-all ${
          expanded ? "fixed inset-4 z-50" : ""
        }`}
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Canvas */}
        <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#1a1a2e" }}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
            title="Animation"
          />
        </div>

        {/* Controls bar */}
        <div
          className="flex items-center gap-3 px-3 py-2"
          style={{ background: "#111" }}
        >
          {/* Restart */}
          <button
            onClick={(e) => { e.stopPropagation(); reloadAnimation(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Replay"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>

          <div className="flex-1" />

          {/* Expand/Minimize */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={expanded ? "Minimize" : "Fullscreen"}
          >
            {expanded ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/80 z-40"
          onClick={() => setExpanded(false)}
        />
      )}
    </>
  );
}
