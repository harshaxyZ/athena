# Vidya (विद्या) — AI Visual Learning Platform

## Vision
An AI-powered educational platform for students (Class 1-12) where they upload study material (PDFs, text, images) and receive an interactive, Zoom-like teaching experience. AI agents act as teachers who explain concepts visually on a shared canvas with voice narration — in multiple Indian languages.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14)                       │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Upload   │ │  Canvas       │ │  Avatar  │ │  Chat/Doubt   │  │
│  │  Page     │ │  (HTML Stream)│ │  Widget  │ │  Panel        │  │
│  └──────────┘ └──────────────┘ └──────────┘ └───────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + SSE + WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                    BACKEND (FastAPI)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Multi-Agent DAG Orchestrator                │    │
│  │                                                          │    │
│  │  [Document     [Knowledge     [Lesson                   │    │
│  │   Analyzer]  →  Extractor]  →  Planner]                 │    │
│  │                                     │                    │    │
│  │                     ┌───────────────┼───────────────┐   │    │
│  │                     ▼               ▼               ▼   │    │
│  │              [Visual Gen]    [Speech Gen]    [Q&A Prep] │    │
│  │                     │               │               │   │    │
│  │                     ▼               ▼               ▼   │    │
│  │              [Session Renderer / Assembler]             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │OpenRouter│ │ Sarvam   │ │ File     │ │ Session Store     │   │
│  │(GLM-5.2) │ │ AI (TTS) │ │ Storage  │ │ (Redis/in-memory) │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router) | SSR, streaming, React Server Components |
| **UI** | shadcn/ui + Tailwind CSS | Beautiful, accessible components |
| **Animation** | Framer Motion + Lottie | Smooth avatar animations, page transitions |
| **Canvas** | React + HTML streaming | Render AI-generated HTML visualizations |
| **Avatar** | CSS animations + SVG | Animated teacher avatar (no 3D engine needed) |
| **Backend** | FastAPI (Python 3.11+) | Async, streaming, WebSocket support |
| **LLM** | GLM-5.2 via OpenRouter | 1M context, strong reasoning, OpenAI-compatible |
| **TTS** | Sarvam AI (bulbul:v3) | Multi-Indian-language voice synthesis |
| **PDF Parsing** | PyMuPDF + pdfplumber | Extract text and images from PDFs |
| **DAG Engine** | Custom (asyncio + networkx) | Lightweight, full control, ~150 lines |
| **DB** | SQLite → PostgreSQL | Simple to start, scale later |
| **Cache** | Redis (optional) | Session state, audio caching |

---

## Multi-Agent DAG — Detailed Design

### Agent Definitions

```
Node 1: DocumentAnalyzer (sequential)
  - Input: Raw uploaded file (PDF/image/text)
  - Output: Structured content (text blocks, images, equations)
  - Method: PyMuPDF for PDF text extraction + OCR for images

Node 2: KnowledgeExtractor (sequential, depends on Node 1)
  - Input: Structured content from Node 1
  - Output: Knowledge graph (concepts, relationships, difficulty level)
  - Method: GLM-5.2 with structured JSON output

Node 3: LessonPlanner (sequential, depends on Node 2)
  - Input: Knowledge graph + student class level
  - Output: Ordered lesson steps, each with visual script + speech script
  - Method: GLM-5.2 with structured JSON output

Node 4: VisualContentGenerator (parallel, depends on Node 3)
  - Input: Visual scripts from lesson plan
  - Output: HTML/CSS/SVG content for each step
  - Method: GLM-5.2 generates HTML, sandboxed in iframe
  - Runs in PARALLEL with Node 5 and Node 6

Node 5: SpeechScriptGenerator (parallel, depends on Node 3)
  - Input: Speech scripts from lesson plan
  - Output: Optimized text for TTS, segmented by visual step
  - Method: GLM-5.2 (rewrites for natural speech delivery)
  - Runs in PARALLEL with Node 4 and Node 6

Node 6: QAContentPreparer (parallel, depends on Node 3)
  - Input: Full lesson context + common doubt patterns
  - Output: Pre-computed Q&A pairs, anticipated student questions
  - Method: GLM-5.2
  - Runs in PARALLEL with Node 4 and Node 5

Node 7: SessionAssembler (sequential, depends on Nodes 4,5,6)
  - Input: Visual HTML, speech segments, Q&A content
  - Output: Assembled session timeline with sync points
  - Method: Python logic (no LLM call needed)
```

### DAG Execution Flow

```
[Upload] → Analyzer → Extractor → Planner ─┬─→ Visual Gen ──┐
                                            ├─→ Speech Gen ──┼─→ Assembler → [Session]
                                            └─→ Q&A Prep  ───┘
                                            
            ── sequential ──               ── parallel ──
```

### Parallel Execution Strategy
- Use `asyncio.TaskGroup` (Python 3.11+) for parallel nodes
- Concurrency limiter: `asyncio.Semaphore(3)` to cap simultaneous LLM calls
- Each parallel node gets its own GLM-5.2 streaming call
- Results collected via shared `AgentContext` state dict

---

## Session Experience (The "Zoom-like" Flow)

### Phase 1: Pre-Session (2-5 seconds)
1. Student uploads document or types their doubt
2. DAG runs in background (all agents process content)
3. Frontend shows "Your AI teacher is preparing..." with loading animation

### Phase 2: Teaching Session (3-20 minutes)
```
┌──────────────────────────────────────────────┐
│  ┌─────────────┐  ┌────────────────────────┐ │
│  │   AI Teacher │  │    Visual Canvas        │ │
│  │   Avatar     │  │    (HTML/SVG content)   │ │
│  │   (animated) │  │    Changes with each    │ │
│  │              │  │    lesson step           │ │
│  │  "Hello!"   │  │                          │ │
│  └─────────────┘  └────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  🗣 Voice plays (Sarvam TTS)              │ │
│  │  [🔊 Step 1/8: "Let's understand..."     │ │
│  │   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░]  │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  💬 Doubt Box: "Ask a question anytime!" │ │
│  │  ┌───────────────────────┐ [Send]        │ │
│  │  │ Type your doubt here..│               │ │
│  │  └───────────────────────┘               │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Step-by-step playback:**
1. Avatar appears with greeting animation
2. Speech audio plays via Sarvam TTS (Hindi/English/etc.)
3. Canvas updates with HTML visualization for current step
4. Avatar gestures (pointing, thinking, explaining animations)
5. At sync points, both audio and visual advance together
6. Student can interrupt at any time → session pauses → Q&A agent responds
7. After doubt resolved → session resumes

### Phase 3: Post-Session
1. Summary of key concepts displayed
2. Quiz/practice questions generated
3. Option to replay or go deeper on specific topics

---

## Backend File Structure

```
backend/
├── main.py                    # FastAPI app entry point
├── config.py                  # Settings from .env
├── requirements.txt
│
├── dag/                       # Multi-Agent DAG Engine
│   ├── __init__.py
│   ├── executor.py            # DAGExecutor class (~150 lines)
│   ├── context.py             # AgentContext state dataclass
│   └── graph.py               # DAG definition for our pipeline
│
├── agents/                    # Individual Agent Functions
│   ├── __init__.py
│   ├── document_analyzer.py   # PDF/image/text parsing
│   ├── knowledge_extractor.py # Concept extraction via GLM-5.2
│   ├── lesson_planner.py      # Lesson structure generation
│   ├── visual_generator.py    # HTML/CSS visual content gen
│   ├── speech_generator.py    # TTS script optimization
│   └── qa_handler.py          # Real-time doubt resolution
│
├── services/                  # External Service Integrations
│   ├── __init__.py
│   ├── llm.py                 # OpenRouter/GLM-5.2 client wrapper
│   ├── tts.py                 # Sarvam AI TTS integration
│   └── file_processor.py      # PDF parsing + text extraction
│
├── models/                    # Pydantic Models
│   ├── __init__.py
│   ├── session.py             # Session, Lesson, Step models
│   └── requests.py            # API request/response models
│
├── routers/                   # API Routes
│   ├── __init__.py
│   ├── upload.py              # Document upload endpoint
│   ├── session.py             # Session management + SSE stream
│   └── chat.py                # WebSocket for real-time Q&A
│
└── storage/                   # Data Persistence
    ├── __init__.py
    └── database.py            # SQLite/PostgreSQL setup
```

---

## Frontend File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # Landing page
│   │   ├── upload/
│   │   │   └── page.tsx                 # Document upload page
│   │   └── session/
│   │       └── [id]/
│   │           └── page.tsx             # Live teaching session
│   │
│   ├── components/
│   │   ├── ui/                          # shadcn/ui components
│   │   ├── UploadZone.tsx               # Drag-and-drop upload
│   │   ├── TeachingSession.tsx          # Main session orchestrator
│   │   ├── VisualCanvas.tsx             # HTML content renderer (sandboxed iframe)
│   │   ├── TeacherAvatar.tsx            # Animated SVG avatar
│   │   ├── SpeechPlayer.tsx             # Audio playback + sync
│   │   ├── DoubtBox.tsx                 # Chat/Q&A panel
│   │   ├── LanguageSelector.tsx         # Multi-language picker
│   │   ├── LessonTimeline.tsx           # Progress bar + step indicators
│   │   └── LoadingTeacher.tsx           # "Teacher is preparing" animation
│   │
│   ├── hooks/
│   │   ├── useSSE.ts                    # Server-Sent Events hook
│   │   ├── useWebSocket.ts              # WebSocket for Q&A
│   │   └── useAudioSync.ts             # Audio-visual synchronization
│   │
│   ├── lib/
│   │   ├── api.ts                       # API client
│   │   └── types.ts                     # TypeScript types
│   │
│   └── styles/
│       └── avatar-animations.css        # Avatar CSS animations
│
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## API Endpoints

### REST API
```
POST   /api/upload              → Upload document, returns session_id
GET    /api/session/{id}/status  → DAG processing status
GET    /api/session/{id}/plan    → Get lesson plan (after DAG completes)
POST   /api/session/{id}/start   → Start teaching session
```

### Server-Sent Events (SSE)
```
GET    /api/session/{id}/stream  → Main teaching stream
  Events:
  - dag:progress     → DAG node completion status
  - session:start    → Session playback begins
  - session:step     → New visual step (contains HTML content)
  - session:speech   → Speech text for current step
  - session:avatar   → Avatar gesture/animation command
  - session:sync     → Audio-visual sync point
  - session:end      → Session complete
```

### WebSocket
```
WS     /api/session/{id}/chat    → Real-time Q&A during session
  Messages:
  Client → Server: { type: "question", text: "..." }
  Server → Client: { type: "answer", text: "..." }
  Server → Client: { type: "session_paused" }
  Server → Client: { type: "session_resumed" }
```

---

## Multi-Language Support

**Supported Languages (via Sarvam AI TTS):**
- English (en-IN)
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Kannada (kn-IN)
- Bengali (bn-IN)
- Marathi (mr-IN)
- Gujarati (gu-IN)
- Malayalam (ml-IN)
- Punjabi (pa-IN)

**Implementation:**
1. User selects preferred language on landing page
2. Speech script generator rewrites lesson content in chosen language
3. Sarvam TTS generates audio in the correct voice/language
4. Visual content stays language-agnostic (diagrams, math, animations)
5. Text labels in visuals are translated via LLM

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project scaffolding (FastAPI + Next.js)
- [ ] DAG executor engine (~150 lines)
- [ ] GLM-5.2 client wrapper (OpenAI SDK → OpenRouter)
- [ ] Basic document upload + text extraction
- [ ] Single-agent lesson generation (end-to-end proof of concept)

### Phase 2: Visual Learning (Week 2)
- [ ] Visual content generator agent (HTML/SVG generation)
- [ ] Canvas streaming (SSE → iframe rendering)
- [ ] Avatar component (CSS/SVG animated teacher)
- [ ] Speech generation with Sarvam AI TTS
- [ ] Audio-visual sync system

### Phase 3: Interactive Session (Week 3)
- [ ] Full teaching session player (step-by-step playback)
- [ ] WebSocket-based Q&A panel
- [ ] Session interruption + resume flow
- [ ] Multi-language TTS integration
- [ ] Language selector UI

### Phase 4: Polish & Scale (Week 4)
- [ ] Upload improvements (PDF with images, OCR)
- [ ] Session history + replay
- [ ] Quiz/practice questions generator
- [ ] Loading states, error handling, UX polish
- [ ] Performance optimization (audio caching, pre-generation)

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DAG framework | Custom (asyncio + networkx) | ~150 lines, zero dependencies, full FastAPI integration |
| LLM client | openai AsyncOpenAI | Direct OpenRouter compatibility, streaming built-in |
| Canvas rendering | Sandboxed iframe | Security (XSS prevention), full HTML/CSS support |
| Avatar | CSS/SVG animation | Lightweight, no WebGL/Three.js overhead |
| TTS streaming | Sarvam REST API | Multi-Indian-language, voice quality |
| Session state | In-memory dict → Redis | Start simple, scale when needed |
| Document parsing | PyMuPDF + pdfplumber | Best PDF text extraction in Python |

---

## Risk Mitigation

1. **GLM-5.2 is text-only on OpenRouter** → Use PyMuPDF/pdfplumber for document understanding (no vision needed)
2. **TTS latency** → Pre-generate speech for next step while current step plays
3. **HTML injection in canvas** → Sandboxed iframe with strict CSP headers
4. **Rate limits on OpenRouter** → Semaphore-based concurrency control, request queuing
5. **Audio-visual sync drift** → Use WebSocket heartbeat + timestamp-based sync
