@echo off
echo ====================================================
echo Starting ArchMind AI (TCS AI Engineering Hackathon)
echo ====================================================

REM Check for .env file
if not exist .env (
    echo [NOTICE] .env not found. Copying .env.example to .env...
    copy .env.example .env
    echo Please configure your GEMINI_API_KEY in .env
)

echo Starting Backend API on http://localhost:8000...
start "ArchMind Backend" cmd /k "set PYTHONPATH=backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak > nul

echo Starting Frontend Web App on http://localhost:3000...
start "ArchMind Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================
echo ArchMind AI is launching!
echo App: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo ====================================================

