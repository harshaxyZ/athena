"use client";

import { useEffect, useRef } from "react";

interface VisualCanvasProps {
  htmlContent: string;      // JS scene program OR legacy HTML/SVG
  fallbackText?: string;    // shown if the program errors out
}

/**
 * Sandboxed "whiteboard" iframe.
 *
 * The AI authors either:
 *   A) A JavaScript program that draws on a 1600×900 <canvas> via rough.js / p5.js /
 *      fabric.js / paper.js / anime.js / gsap.
 *   B) An HTML/SVG fragment (for complex diagrams like ERDs, flowcharts) rendered
 *      directly as markup inside the stage div.
 *
 * Both are injected via doc.write() inside a sandboxed iframe.
 */
export default function VisualCanvas({ htmlContent, fallbackText = "" }: VisualCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current || !htmlContent) return;

    const origin = window.location.origin;
    const W = 1600, H = 900;

    const srcdoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: white; color: #1e293b;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    #viewport {
      position: relative; width: 100%; height: 100%;
      overflow: hidden; background: white;
    }
    #stage {
      position: absolute; top: 0; left: 0;
      width: ${W}px; height: ${H}px;
      transform-origin: 0 0;
      background: white;
      overflow: hidden;
    }
    #board { display: block; width: ${W}px; height: ${H}px; }
    svg { max-width: 100%; height: auto; }
    h1, h2, h3 { font-family: 'Poppins', system-ui, sans-serif; }
  </style>
  <script src="${origin}/vendor/rough.js"></script>
  <script src="${origin}/vendor/p5.min.js"></script>
  <script src="${origin}/vendor/fabric.min.js"></script>
  <script src="${origin}/vendor/paper-full.min.js"></script>
  <script src="${origin}/vendor/anime.min.js"></script>
  <script src="${origin}/vendor/gsap.min.js"></script>
</head>
<body>
  <div id="viewport">
    <div id="stage">
      <canvas id="board" width="${W}" height="${H}"></canvas>
    </div>
  </div>
  <script>
    window.__PROGRAM__ = ${JSON.stringify(htmlContent).replace(/</g, "\\u003c")};
    window.__FALLBACK__ = ${JSON.stringify(fallbackText).replace(/</g, "\\u003c")};
  </script>
  <script>
  (function () {
    var W = ${W}, H = ${H};
    var vp = document.getElementById('viewport');
    var stage = document.getElementById('stage');

    /* ── Fit: scale + center the ${W}×${H} stage inside the viewport ── */
    function fit() {
      var vw = vp.clientWidth, vh = vp.clientHeight;
      if (vw < 2 || vh < 2) return;
      var s = Math.min(vw / W, vh / H);
      var tx = (vw - W * s) / 2, ty = (vh - H * s) / 2;
      stage.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    }
    fit();
    window.addEventListener('resize', fit);

    /* Poll rAF to catch layout changes that don't fire resize
       (SpeechPlayer claiming space, step remount, animation settle). */
    var lastW = 0, lastH = 0;
    (function watch() {
      var w = vp.clientWidth, h = vp.clientHeight;
      if (w > 1 && h > 1 && (w !== lastW || h !== lastH)) {
        lastW = w; lastH = h; fit();
      }
      requestAnimationFrame(watch);
    })();

    /* ── Fallback card (shown when JS errors or content is empty) ── */
    function renderFallback() {
      var board = document.getElementById('board');
      if (board) board.style.display = 'none';
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:64px;overflow:auto;background:linear-gradient(135deg,#f0f7ff 0%,#e0effe 100%)';
      var icon = document.createElement('div');
      icon.style.cssText = 'font-size:3rem;margin-bottom:20px';
      icon.textContent = '\\u{1F3A8}';
      var p = document.createElement('p');
      p.style.cssText = 'font-size:1.8rem;line-height:1.5;font-weight:500;color:#1e293b;max-width:1200px';
      p.textContent = window.__FALLBACK__ || 'Visual unavailable';
      d.appendChild(icon); d.appendChild(p);
      stage.appendChild(d);
    }

    /* ── Detect content type and render ── */
    function boot() {
      var program = (window.__PROGRAM__ || '').trim();
      if (!program) { renderFallback(); return; }

      // HTML/SVG content — inject directly into the stage div
      if (program.charAt(0) === '<') {
        // Hide the canvas, show HTML in the stage
        var board = document.getElementById('board');
        if (board) board.style.display = 'none';
        stage.innerHTML = program;
        fit();
        return;
      }

      // JavaScript program — execute on the canvas
      try {
        var board = document.getElementById('board');
        var ctx = board.getContext('2d');
        var rc = (window.rough && window.rough.canvas) ? window.rough.canvas(board) : null;
        if (window.paper) { window.paper.setup(board); }
        var fn = new Function(
          'rough','p5','fabric','paper','anime','gsap',
          'board','ctx','rc','stage',
          program
        );
        fn(
          window.rough, window.p5, window.fabric,
          window.paper, window.anime, window.gsap,
          board, ctx, rc, stage
        );
      } catch (e) {
        console.error('Scene program error:', e);
        renderFallback();
      }
    }

    /* ── Boot after fonts load (measureText needs real metrics) ── */
    var booted = false;
    function bootOnce() { if (booted) return; booted = true; fit(); boot(); }
    function whenReady() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(bootOnce);
        setTimeout(bootOnce, 1500);
      } else {
        bootOnce();
      }
    }
    if (document.readyState === 'complete') whenReady();
    else window.addEventListener('load', whenReady);
  })();
  </script>
</body>
</html>`;

    iframeRef.current.srcdoc = srcdoc;
  }, [htmlContent, fallbackText]);

  // Only show the React fallback panel for EMPTY content.
  // HTML/SVG content (including stored lessons with fallback cards) renders inside the iframe.
  const isEmpty = !htmlContent || htmlContent.trim().length === 0;

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="relative w-full h-full shadow-2xl overflow-hidden bg-white">
        {!isEmpty ? (
          <iframe
            ref={iframeRef}
            title="Visual Canvas"
            sandbox="allow-scripts allow-same-origin"
            className="absolute inset-0 w-full h-full"
            style={{ border: "none" }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6"
               style={{background: 'linear-gradient(135deg, #f0f7ff 0%, #e0effe 100%)'}}>
            <div className="text-5xl mb-4">🎨</div>
            <p className="text-slate-500 text-lg">Loading visualization...</p>
          </div>
        )}
      </div>
    </div>
  );
}
