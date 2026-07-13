# 🎓 Vidya — AI Visual Learning Platform

An AI-powered educational platform for K-12 students (Class 1-12) where they upload study material and receive an interactive, Zoom-like teaching experience with:

- 🎨 **Visual Learning** — AI-generated HTML/SVG diagrams and animations
- 🗣️ **Voice Teacher** — Multi-Indian-language TTS via Sarvam AI
- 💬 **Real-time Q&A** — Ask doubts mid-lesson via WebSocket
- 🤖 **Multi-Agent DAG** — Custom Python DAG orchestrator for content processing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, Framer Motion |
| Backend | FastAPI (Python 3.11+) |
| LLM | GLM-5.2 via OpenRouter (1M context) |
| TTS | Sarvam AI (bulbul:v3) — 10 Indian languages |
| DAG Engine | Custom asyncio + networkx |
| Canvas | Sandboxed iframe with AI-generated HTML |

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

Or start manually:

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
Student uploads document
        │
        ▼
  [DocumentAnalyzer] → [KnowledgeExtractor] → [LessonPlanner]
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                            [VisualContent]  [SpeechScript]   [QAContent]
                                    │               │               │
                                    └───────────────┼───────────────┘
                                                    ▼
                                            [SessionAssembler]
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  Live Session (SSE + WS)      │
                                    │  Avatar + Canvas + Voice + Q&A│
                                    └───────────────────────────────┘
```

## API Endpoints

- `POST /api/upload` — Upload document and start pipeline
- `POST /api/ask` — Ask a direct question (no file needed)
- `GET /api/session/{id}/status` — Check processing status
- `GET /api/session/{id}/plan` — Get generated lesson plan
- `GET /api/session/{id}/stream` — SSE stream for teaching session
- `GET /api/session/{id}/audio/{step_id}` — TTS audio for a step
- `WS /ws/session/{id}/chat` — WebSocket for real-time Q&A

## Supported Languages

English, Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi

## Environment Variables

See `.env` for API keys (OpenRouter, Sarvam AI).
