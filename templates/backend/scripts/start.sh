#!/bin/bash
# Backend startup script
# Usage: bash scripts/start.sh

set -e

echo "=== Installing dependencies ==="
pip install -r requirements.txt

echo ""
echo "=== Starting service ==="
# Development mode (hot reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
