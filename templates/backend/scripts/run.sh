#!/bin/bash
# Universal Agent Builder - one-click startup script
# Usage: bash scripts/run.sh

set -e

echo "╔══════════════════════════════════════════╗"
echo "║     Universal Agent Builder - Startup    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 not found, please install Python 3.10+ first"
    exit 1
fi

echo "✅ Python $(python3 --version 2>&1)"

# Check .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  .env file not found, creating from template..."
    cp .env.example .env
    echo "✅ .env file created, please edit to configure your API Key"
    echo ""
    echo "Please edit the .env file and set LLM_API_KEY and other configurations"
    echo "Then re-run this script"
    exit 0
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

# Start service
echo ""
echo "🚀 Starting backend service..."
echo "   URL: http://localhost:8000"
echo "   API:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
