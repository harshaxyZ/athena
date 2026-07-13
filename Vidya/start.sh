#!/bin/bash
# Vidya AI Learning Platform — Start both backend and frontend
# Run this from the project root: /mnt/c/Projects/Learner

set -e
cd /mnt/c/Projects/Learner

echo "🎓 Starting Vidya AI Learning Platform..."
echo ""

# ─── Backend ───
VENV_DIR="venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install -r backend/requirements.txt -q 2>/dev/null

echo "🚀 Starting FastAPI backend on port 8000..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ─── Frontend ───
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Vidya is running!"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend:  http://localhost:8000"
echo "   📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
