#!/bin/bash
# 后端启动脚本
# 用法: bash scripts/start.sh

set -e

echo "=== 安装依赖 ==="
pip install -r requirements.txt

echo ""
echo "=== 启动服务 ==="
# 开发模式（热重载）
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload