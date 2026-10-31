#!/bin/bash
echo "===================================================="
echo "Starting ArchMind AI (TCS AI Engineering Hackathon)"
echo "===================================================="

if [ ! -f .env ]; then
    echo "[NOTICE] .env not found. Copying .env.example to .env..."
    cp .env.example .env
    echo "Please configure your GEMINI_API_KEY in .env"
fi

export PYTHONPATH=backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "ArchMind AI is running!"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop both services."

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait

