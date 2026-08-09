#!/bin/bash
# 万能 Agent 构建器 - 一键启动脚本
# 用法: bash scripts/run.sh

set -e

echo "╔══════════════════════════════════════════╗"
echo "║     万能 Agent 构建器 - 启动脚本        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python3，请先安装 Python 3.10+"
    exit 1
fi

echo "✅ Python $(python3 --version 2>&1)"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 文件，正在从模板创建..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请编辑配置你的 API Key"
    echo ""
    echo "请编辑 .env 文件，设置 LLM_API_KEY 等配置"
    echo "然后重新运行此脚本"
    exit 0
fi

# 安装依赖
echo ""
echo "📦 安装依赖..."
pip install -r requirements.txt -q

# 启动服务
echo ""
echo "🚀 启动后端服务..."
echo "   地址: http://localhost:8000"
echo "   API:  http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload