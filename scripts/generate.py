#!/usr/bin/env python3
"""Agent 代码生成器

根据 agent.yaml 配置文件生成完整的 Agent 项目代码。

用法:
    python scripts/generate.py agent.yaml ./output_dir

该脚本将 agent.yaml 中的配置映射到各层代码：
    L1 → app/l1_llm/factory.py
    L2 → app/l2_interface/chat_interface.py
    L3 → app/l3_prompt/system_prompts.py
    L4 → app/l4_agent/graph.py
    L5 → app/l5_tools/registry.py + base_tools.py
    L6 → app/l6_memory/
    L7 → app/l7_orchestrator/
    L8 → app/l8_api/routes/
    L9 → frontend/src/
    L10 → docker-compose.yml, .env, Dockerfile
"""

import os
import sys
import shutil
import yaml
from pathlib import Path
from typing import Any, Optional

# ============================================================
# 模板路径
# ============================================================
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

# ============================================================
# 工具函数
# ============================================================

def ensure_dir(path: str):
    """确保目录存在"""
    os.makedirs(path, exist_ok=True)

def write_file(filepath: str, content: str):
    """写入文件"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  ✓ 生成: {filepath}")

def copy_template(src: str, dst: str):
    """复制模板文件"""
    shutil.copy2(src, dst)
    print(f"  ✓ 复制: {src} → {dst}")

def load_config(config_path: str) -> dict:
    """加载 YAML 配置"""
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    return config


# ============================================================
# 各层生成器
# ============================================================

def generate_l1_llm(config: dict, output_dir: str):
    """生成 L1 大模型层代码"""
    llm_config = config.get("llm", {})
    provider = llm_config.get("provider", "openai")
    model = llm_config.get("model", "gpt-4o")
    temperature = llm_config.get("temperature", 0.7)
    max_tokens = llm_config.get("max_tokens", 4096)
    api_base = llm_config.get("api_base", "")

    # 生成 system_prompts.py
    prompt_config = config.get("prompt", {})
    system_prompt = prompt_config.get("system_prompt", "你是一个智能助手。")
    write_file(
        f"{output_dir}/app/l3_prompt/system_prompts.py",
        f'''"""L3 - 系统提示词定义（由 generate.py 自动生成）"""

DEFAULT_SYSTEM_PROMPT = """{system_prompt}"""


def get_default_prompt() -> str:
    return DEFAULT_SYSTEM_PROMPT
'''.strip()
    )

    # 生成 factory.py
    provider_imports = {
        "openai": "from .openai_adapter import OpenAIAdapter",
        "anthropic": "from .anthropic_adapter import AnthropicAdapter",
        "deepseek": "from .deepseek_adapter import DeepSeekAdapter",
        "ollama": "from .ollama_adapter import OllamaAdapter",
    }
    provider_create = {
        "openai": f'return OpenAIAdapter(model="{model}", temperature={temperature}, max_tokens={max_tokens})',
        "anthropic": f'return AnthropicAdapter(model="{model}", temperature={temperature}, max_tokens={max_tokens})',
        "deepseek": f'return DeepSeekAdapter(model="{model}", temperature={temperature}, max_tokens={max_tokens})',
        "ollama": f'return OllamaAdapter(model="{model}", temperature={temperature}, max_tokens={max_tokens})',
    }

    imports = provider_imports.get(provider, provider_imports["openai"])
    create = provider_create.get(provider, provider_create["openai"])

    if api_base:
        # 带 api_base 的第三方兼容服务
        imports = "from .openai_adapter import OpenAIAdapter"
        create = f'return OpenAIAdapter(model="{model}", api_base="{api_base}", temperature={temperature}, max_tokens={max_tokens})'

    write_file(
        f"{output_dir}/app/l1_llm/factory.py",
        f'''"""L1 - LLM 工厂方法（由 generate.py 自动生成）

根据配置创建 LLM 适配器实例。
提供商: {provider}
模型: {model}
"""

{imports}
from .base import LLMAdapter


def create_llm() -> LLMAdapter:
    """创建 LLM 适配器实例"""
    {create}
'''.strip()
    )

    # 生成 l1_llm/__init__.py
    write_file(
        f"{output_dir}/app/l1_llm/__init__.py",
        '''"""L1 - 大模型层"""
from .base import LLMAdapter
from .factory import create_llm
'''.strip()
    )


def generate_l3_prompt(config: dict, output_dir: str):
    """生成 L3 提示工程层代码"""
    prompt_config = config.get("prompt", {})
    system_prompt = prompt_config.get("system_prompt", "你是一个智能助手。")
    role_template = prompt_config.get("role_template", "default")
    output_format = prompt_config.get("output_format", "text")

    write_file(
        f"{output_dir}/app/l3_prompt/role_templates.py",
        f'''"""L3 - 角色模板（由 generate.py 自动生成）"""

ROLE_TEMPLATES = {{
    "{role_template}": {{
        "system_prompt": """{system_prompt}""",
        "description": "由 {role_template} 角色模板生成",
        "output_format": "{output_format}",
    }},
    "default": {{
        "system_prompt": "你是一个智能助手。请用简洁、准确的语言回答用户的问题。",
        "description": "默认角色",
        "output_format": "text",
    }},
}}


def get_role_prompt(role_name: str) -> str | None:
    """获取角色模板的系统提示词"""
    template = ROLE_TEMPLATES.get(role_name)
    if template:
        return template["system_prompt"]
    return None
'''.strip()
    )


def generate_l4_agent(config: dict, output_dir: str):
    """生成 L4 Agent 框架层代码"""
    framework = config.get("agent_framework", {})
    graph_type = framework.get("graph_type", "single")
    max_iterations = framework.get("max_iterations", 10)

    orchestrator = config.get("orchestration", {})
    orchestration_mode = orchestrator.get("mode", "single")

    if graph_type == "single" or orchestration_mode == "single":
        # 单 Agent 图
        write_file(
            f"{output_dir}/app/l4_agent/graph.py",
            f'''"""L4 - Agent 图定义（由 generate.py 自动生成）

图类型: {graph_type}
最大迭代次数: {max_iterations}
"""

from typing import Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import AgentState
from .nodes import agent_node, tool_node, router_node


def build_single_agent_graph() -> StateGraph:
    """构建单 Agent 图"""
    workflow = StateGraph(AgentState)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges(
        "agent",
        router_node,
        {{
            "tools": "tools",
            END: END,
        }},
    )
    workflow.add_edge("tools", "agent")
    return workflow


def compile_graph(graph: StateGraph) -> StateGraph:
    """编译图，添加检查点支持"""
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


_graph = None


def get_graph() -> StateGraph:
    """获取全局图实例"""
    global _graph
    if _graph is None:
        graph = build_single_agent_graph()
        _graph = compile_graph(graph)
    return _graph
'''.strip()
        )
    else:
        # 多 Agent 图
        agents = orchestrator.get("agents", [])
        agent_names = [a.get("name", f"agent_{i}") for i, a in enumerate(agents)]

        write_file(
            f"{output_dir}/app/l4_agent/graph.py",
            f'''"""L4 - Agent 图定义（由 generate.py 自动生成）

图类型: {graph_type}
子 Agent: {', '.join(agent_names)}
"""

from typing import Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import AgentState
from .nodes import agent_node, tool_node, router_node


def build_multi_agent_graph() -> StateGraph:
    """构建多 Agent 编排图"""
    workflow = StateGraph(AgentState)

    # 监督 Agent
    workflow.add_node("supervisor", agent_node)

    # 子 Agent
    {''.join(f'    workflow.add_node("{name}", agent_node)\\n' for name in agent_names)}

    # 汇总 Agent
    workflow.add_node("aggregator", agent_node)

    workflow.set_entry_point("supervisor")

    # 条件路由
    workflow.add_conditional_edges(
        "supervisor",
        router_node,
        {{
            {', '.join(f'"{name}": "{name}"' for name in agent_names)},
            END: END,
        }},
    )

    # 子 Agent → 汇总
    for name in [{', '.join(f'"{name}"' for name in agent_names)}]:
        workflow.add_edge(name, "aggregator")

    workflow.add_edge("aggregator", END)
    return workflow


def compile_graph(graph: StateGraph) -> StateGraph:
    """编译图，添加检查点支持"""
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


_graph = None


def get_graph() -> StateGraph:
    """获取全局图实例"""
    global _graph
    if _graph is None:
        graph = build_multi_agent_graph()
        _graph = compile_graph(graph)
    return _graph
'''.strip()
        )


def generate_l5_tools(config: dict, output_dir: str):
    """生成 L5 工具执行层代码"""
    tools_config = config.get("tools", {})
    enabled_tools = tools_config.get("enabled", [])
    custom_tools = tools_config.get("custom", [])

    # 生成 base_tools.py - 只包含启用的工具
    tool_definitions = []

    if "web_search" in enabled_tools:
        tool_definitions.append('''
@tool
async def web_search(query: str) -> str:
    """搜索网页获取最新信息"""
    import httpx
    url = "https://api.duckduckgo.com/"
    params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params, timeout=10.0)
            data = resp.json()
            results = []
            if data.get("Abstract"):
                results.append(f"摘要: {data['Abstract']}")
            for topic in data.get("RelatedTopics", [])[:5]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append(topic["Text"])
            return "\\n\\n".join(results) if results else "未找到相关结果"
        except Exception as e:
            return f"搜索失败: {str(e)}"
''')

    if "web_fetch" in enabled_tools:
        tool_definitions.append('''
@tool
async def web_fetch(url: str) -> str:
    """获取网页内容"""
    import httpx, re
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=15.0, follow_redirects=True)
            resp.encoding = resp.charset or "utf-8"
            text = resp.text
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\\s+', ' ', text).strip()
            return text[:5000]
        except Exception as e:
            return f"获取页面失败: {str(e)}"
''')

    if "current_time" in enabled_tools:
        tool_definitions.append('''
@tool
async def current_time() -> str:
    """获取当前日期和时间"""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
''')

    if "calculate" in enabled_tools:
        tool_definitions.append('''
@tool
async def calculate(expression: str) -> str:
    """执行数学计算"""
    allowed = set("0123456789.+-*/()% ")
    if not all(c in allowed for c in expression):
        return "错误: 表达式包含非法字符"
    try:
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"计算错误: {str(e)}"
''')

    # 自定义工具
    custom_tool_defs = []
    for ct in custom_tools:
        name = ct.get("name", "custom_tool")
        desc = ct.get("description", "自定义工具")
        params = ct.get("parameters", {})
        param_docs = "\\n".join(f"        {k}: {v.get('description', '')}" for k, v in params.items())
        param_str = ", ".join(f"{k}: str" for k in params.keys())

        custom_tool_defs.append(f'''
@tool
async def {name}({param_str}) -> str:
    """{desc}

    {param_docs}
    """
    # TODO: 实现自定义工具逻辑
    return f"工具 {name} 已执行"
''')

    # 基础工具列表
    base_tools_list = "\n    ".join(f"{t}," for t in enabled_tools) if enabled_tools else "# 无基础工具"

    # 自定义工具列表
    custom_tools_list = "\n    ".join(f"{ct.get('name', 'custom_tool')}," for ct in custom_tools) if custom_tools else "# 无自定义工具"

    write_file(
        f"{output_dir}/app/l5_tools/base_tools.py",
        f'''"""L5 - 基础工具定义（由 generate.py 自动生成）

启用的工具: {', '.join(enabled_tools) if enabled_tools else '无'}
"""

from langchain_core.tools import tool

{''.join(tool_definitions)}

# 基础工具列表
BASE_TOOLS = [
    {base_tools_list}
]
'''.strip()
    )

    # 生成 custom_tools.py
    write_file(
        f"{output_dir}/app/l5_tools/custom_tools.py",
        f'''"""L5 - 自定义工具（由 generate.py 自动生成）

自定义工具: {', '.join(ct.get('name', 'custom_tool') for ct in custom_tools) if custom_tools else '无'}
"""

from langchain_core.tools import tool

{''.join(custom_tool_defs)}

# 自定义工具列表
CUSTOM_TOOLS = [
    {custom_tools_list}
]
'''.strip()
    )


def generate_l8_api(config: dict, output_dir: str):
    """生成 L8 API 服务层代码"""
    api_config = config.get("api", {})
    auth_enabled = api_config.get("auth_enabled", False)
    cors_origins = api_config.get("cors_origins", ["http://localhost:5173"])
    ui_config = config.get("ui", {})
    agent_name = config.get("agent", {}).get("name", "Agent")

    # 生成 main.py
    write_file(
        f"{output_dir}/app/main.py",
        f'''"""L8+L10 - 应用入口（由 generate.py 自动生成）
应用名称: {agent_name}
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .l8_api.routes.chat import router as chat_router
from .l8_api.routes.health import router as health_router
from .l5_tools.registry import ToolRegistry
from .l5_tools.base_tools import BASE_TOOLS
from .l10_infra.config import settings


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用"""
    app = FastAPI(
        title="{agent_name}",
        version="1.0.0",
        description="由 Agent Builder 自动生成的 Agent 应用",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins={cors_origins},
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 路由
    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(chat_router, prefix="/api", tags=["chat"])

    @app.on_event("startup")
    async def startup():
        """初始化各层"""
        # L5: 注册工具
        for tool in BASE_TOOLS:
            ToolRegistry.register(tool, category="general")
        print(f"  ✓ 已注册 {{len(ToolRegistry.get_all())}} 个工具")

        # L4: 初始化 Agent 图
        from .l4_agent.graph import get_graph
        graph = get_graph()
        print(f"  ✓ Agent 图已初始化 (LLM: {{settings.LLM_PROVIDER}}/{{settings.LLM_MODEL}})")

    @app.on_event("shutdown")
    async def shutdown():
        ToolRegistry.clear()

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
'''.strip()
    )

    # 生成 config.py (L10)
    llm_config = config.get("llm", {})
    write_file(
        f"{output_dir}/app/l10_infra/config.py",
        f'''"""L10 - 配置管理（由 generate.py 自动生成）"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置"""

    # 应用信息
    APP_NAME: str = "{agent_name}"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: list[str] = {cors_origins}

    # L1: LLM 配置
    LLM_PROVIDER: str = "{llm_config.get("provider", "openai")}"
    LLM_MODEL: str = "{llm_config.get("model", "gpt-4o")}"
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = "{llm_config.get("api_base", "")}"
    LLM_TEMPERATURE: float = {llm_config.get("temperature", 0.7)}
    LLM_MAX_TOKENS: int = {llm_config.get("max_tokens", 4096)}

    # L2: 模型接口配置
    LLM_RETRY_COUNT: int = 3
    LLM_RETRY_DELAY: float = 1.0
    MODEL_FALLBACK_ENABLED: bool = False

    # L5: 工具配置
    MAX_TOOL_CALLS: int = 10
    TOOL_TIMEOUT: int = 30

    # L6: 记忆配置
    MEMORY_TYPE: str = "{config.get("memory", {}).get("type", "buffer")}"
    MEMORY_MAX_MESSAGES: int = {config.get("memory", {}).get("max_messages", 50)}

    # L8: API 配置
    API_KEY: str = ""
    RATE_LIMIT: int = 60

    # L10: 基础设施
    LOG_LEVEL: str = "{config.get("deployment", {}).get("log_level", "INFO")}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
'''.strip()
    )


def generate_l10_infra(config: dict, output_dir: str):
    """生成 L10 基础设施层代码"""
    deployment = config.get("deployment", {})
    deploy_type = deployment.get("type", "docker")
    agent_config = config.get("agent", {})
    agent_name = agent_config.get("name", "agent")
    llm_config = config.get("llm", {})

    # 生成 .env.example
    write_file(
        f"{output_dir}/.env.example",
        f"""# ============================================================
# {agent_name} 环境变量配置
# 复制此文件为 .env 并填入实际值
# ============================================================

# L1: LLM 配置
LLM_PROVIDER={llm_config.get("provider", "openai")}
LLM_MODEL={llm_config.get("model", "gpt-4o")}
LLM_API_KEY=your-api-key-here
LLM_API_BASE=
LLM_TEMPERATURE={llm_config.get("temperature", 0.7)}
LLM_MAX_TOKENS={llm_config.get("max_tokens", 4096)}

# L2: 接口配置
LLM_RETRY_COUNT=3
LLM_RETRY_DELAY=1.0

# L5: 工具配置
MAX_TOOL_CALLS=10
TOOL_TIMEOUT=30

# L6: 记忆配置
MEMORY_TYPE={config.get("memory", {}).get("type", "buffer")}
MEMORY_MAX_MESSAGES={config.get("memory", {}).get("max_messages", 50)}

# L8: API 配置
API_KEY=

# L10: 日志
LOG_LEVEL=INFO
LOG_FORMAT=json
""".strip()
    )

    # 生成 requirements.txt
    write_file(
        f"{output_dir}/requirements.txt",
        """# Python 依赖
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
langchain-core>=0.3.0
langgraph>=1.0.0
httpx>=0.27.0
pyyaml>=6.0
python-dotenv>=1.0.0
""".strip()
    )

    # 生成 Dockerfile
    write_file(
        f"{output_dir}/Dockerfile",
        """FROM python:3.12-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 启动
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
""".strip()
    )

    # 生成 docker-compose.yml
    if deploy_type == "docker":
        write_file(
            f"{output_dir}/docker-compose.yml",
            f"""version: "3.8"

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    environment:
      - VITE_API_BASE=http://localhost:8000/api
    restart: unless-stopped
""".strip()
        )

    # 生成 start.sh
    write_file(
        f"{output_dir}/scripts/start.sh",
        """#!/bin/bash
# 启动脚本

echo "=== 启动 Agent 应用 ==="

# 检查 .env
if [ ! -f .env ]; then
    echo "⚠  .env 文件不存在，正在从 .env.example 复制..."
    cp .env.example .env
    echo "⚠  请编辑 .env 文件填入你的 API Key"
    exit 1
fi

# 安装依赖
echo "安装 Python 依赖..."
pip install -r requirements.txt -q

# 启动后端
echo "启动后端服务..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
""".strip()
    )
    os.chmod(f"{output_dir}/scripts/start.sh", 0o755)


def generate_frontend(config: dict, output_dir: str):
    """生成 L9 前端代码"""
    ui_config = config.get("ui", {})
    ui_type = ui_config.get("type", "chat")
    features = ui_config.get("features", [])
    agent_config = config.get("agent", {})
    agent_name = agent_config.get("name", "Agent")

    # 生成 package.json
    write_file(
        f"{output_dir}/frontend/package.json",
        '''{
  "name": "agent-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
'''.strip()
    )

    # 生成 index.html
    write_file(
        f"{output_dir}/frontend/index.html",
        '''<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>''' + agent_name + '''</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'''.strip()
    )

    # 生成 main.tsx
    write_file(
        f"{output_dir}/frontend/src/main.tsx",
        '''import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
'''.strip()
    )

    # 生成 types/index.ts
    write_file(
        f"{output_dir}/frontend/src/types/index.ts",
        '''export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  toolCalls?: ToolCallInfo[]
}

export interface ToolCallInfo {
  tool: string
  input: string
  output?: string
  status: 'running' | 'completed' | 'error'
  error?: string
}

export interface SSEEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'thinking' | 'done' | 'error' | 'node_start' | 'node_end'
  content?: string
  thread_id?: string
  tool_calls?: number
  tool?: string
  input?: string
  output?: string
  node?: string
}

export interface AgentConfig {
  name: string
  type: string
  description: string
  ui: {
    type: string
    title: string
    features: string[]
  }
}
'''.strip()
    )

    # 生成 API 客户端
    write_file(
        f"{output_dir}/frontend/src/l8_api/api.ts",
        '''import type { SSEEvent, AgentConfig } from '../types'

const API_BASE = '/api'

export async function* streamChat(
  message: string,
  threadId?: string
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, thread_id: threadId }),
  })

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6)) as SSEEvent
          yield data
        } catch { /* skip malformed lines */ }
      }
    }
  }
}

export async function getAgentConfig(): Promise<AgentConfig> {
  const response = await fetch(`${API_BASE}/config`)
  if (!response.ok) {
    return {
      name: "''' + agent_name + '''",
      type: "''' + config.get("agent", {}).get("type", "chat") + '''",
      description: "''' + config.get("agent", {}).get("description", "") + '''",
      ui: {
        type: "''' + ui_type + '''",
        title: "''' + ui_config.get("title", agent_name) + '''",
        features: ''' + str(features) + ''',
      },
    }
  }
  return response.json()
}
'''.strip()
    )

    # 生成 App.tsx
    features_str = str(features)
    write_file(
        f"{output_dir}/frontend/src/App.tsx",
        f'''import {{ useState, useEffect }} from 'react'
import {{ Header }} from './l9_ui/layout/Header'
import {{ Sidebar }} from './l9_ui/layout/Sidebar'
import {{ ChatWindow }} from './l9_ui/chat/ChatWindow'
import {{ ErrorBoundary }} from './l9_ui/shared/ErrorBoundary'
import {{ getAgentConfig }} from './l8_api/api'
import type {{ AgentConfig }} from './types'

export interface Session {{
  id: string
  title: string
  createdAt: Date
}}

export function App() {{
  const [sessions, setSessions] = useState<Session[]>([
    {{ id: 'default', title: '新会话', createdAt: new Date() }},
  ])
  const [activeSession, setActiveSession] = useState('default')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [config, setConfig] = useState<AgentConfig | null>(null)

  useEffect(() => {{
    getAgentConfig().then(setConfig).catch(() => {{
      // 如果 API 不可用，使用默认配置
      setConfig({{
        name: "{agent_name}",
        type: "{config.get('agent', {{}}).get('type', 'chat')}",
        description: "{config.get('agent', {{}}).get('description', '')}",
        ui: {{ type: "{ui_type}", title: "{ui_config.get('title', agent_name)}", features: {features_str} }},
      }})
    }})
  }}, [])

  const features = config?.ui?.features || {features_str}
  const showToolViz = features.includes('tool_visualization')
  const showFileUpload = features.includes('file_upload')
  const showChartDisplay = features.includes('chart_display')

  const createSession = () => {{
    const id = crypto.randomUUID()
    setSessions(prev => [...prev, {{ id, title: `会话 ${{prev.length + 1}}`, createdAt: new Date() }}])
    setActiveSession(id)
  }}

  const deleteSession = (id: string) => {{
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSession === id) {{
      setActiveSession(sessions[0]?.id || 'default')
    }}
  }}

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Header
          onToggleSidebar={{() => setSidebarOpen(!sidebarOpen)}}
          sessionTitle={{sessions.find(s => s.id === activeSession)?.title || config?.ui?.title || '{agent_name}'}}
        />
        <div className="app-body">
          <Sidebar
            sessions={{sessions}}
            activeSession={{activeSession}}
            onSelect={{setActiveSession}}
            onCreate={{createSession}}
            onDelete={{deleteSession}}
            isOpen={{sidebarOpen}}
            onClose={{() => setSidebarOpen(false)}}
          />
          <main className="main-content">
            <ChatWindow
              key={{activeSession}}
              sessionId={{activeSession}}
              showToolViz={{showToolViz}}
              showFileUpload={{showFileUpload}}
              showChartDisplay={{showChartDisplay}}
            />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}}
'''.strip()
    )

    # 生成 ChatWindow.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/chat/ChatWindow.tsx",
        '''import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { ToolCall } from './ToolCall'
import { streamChat } from '../../l8_api/api'
import type { Message, ToolCallInfo } from '../../types'

interface ChatWindowProps {
  sessionId: string
  showToolViz?: boolean
  showFileUpload?: boolean
  showChartDisplay?: boolean
}

export function ChatWindow({ sessionId: _sessionId, showToolViz = true, showFileUpload = false, showChartDisplay = false }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是智能助手。请告诉我你需要什么帮助？',
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(), role: 'user', content, timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    const assistantMessage: Message = {
      id: assistantId, role: 'assistant', content: '', timestamp: new Date(),
      isStreaming: true, toolCalls: [],
    }
    setMessages(prev => [...prev, assistantMessage])
    let currentToolCalls: ToolCallInfo[] = []

    try {
      for await (const event of streamChat(content, threadId)) {
        switch (event.type) {
          case 'token':
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, content: m.content + (event.content || '') } : m)
            )
            break
          case 'tool_start':
            if (showToolViz) {
              const toolCall: ToolCallInfo = { tool: event.tool || '', input: event.input || '', status: 'running' }
              currentToolCalls = [...currentToolCalls, toolCall]
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, toolCalls: [...currentToolCalls] } : m)
              )
            }
            break
          case 'tool_end':
            if (showToolViz) {
              currentToolCalls = currentToolCalls.map(tc =>
                tc.tool === event.tool ? { ...tc, output: event.output, status: 'completed' as const } : tc
              )
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, toolCalls: [...currentToolCalls] } : m)
              )
            }
            break
          case 'done':
            if (event.thread_id) setThreadId(event.thread_id)
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
            )
            setIsLoading(false)
            break
        }
      }
    } catch (error) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: m.content || `连接错误: ${error}`, isStreaming: false } : m)
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map(msg => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="tool-calls-container">
                {msg.toolCalls.map((tc, i) => <ToolCall key={i} info={tc} />)}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={isLoading} showFileUpload={showFileUpload} />
    </div>
  )
}
'''.strip()
    )

    # 生成 ChatInput.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/chat/ChatInput.tsx",
        '''import { useState, useRef } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled: boolean
  showFileUpload?: boolean
}

export function ChatInput({ onSend, disabled, showFileUpload = false }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="chat-input-container">
      {showFileUpload && (
        <button className="file-upload-btn" title="上传文件">
          📎
        </button>
      )}
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        rows={1}
        disabled={disabled}
      />
      <button
        className="send-btn"
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
      >
        {disabled ? '⏳' : '发送'}
      </button>
    </div>
  )
}
'''.strip()
    )

    # 生成 MessageBubble.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/chat/MessageBubble.tsx",
        '''import type { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">{isUser ? '👤' : '🤖'}</div>
      <div className="message-content">
        <div className="message-text">
          {message.content || (message.isStreaming ? '...' : '')}
          {message.isStreaming && message.content && <span className="cursor-blink">|</span>}
        </div>
        <div className="message-time">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
'''.strip()
    )

    # 生成 ToolCall.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/chat/ToolCall.tsx",
        '''import { useState } from 'react'
import type { ToolCallInfo } from '../../types'

interface ToolCallProps {
  info: ToolCallInfo
}

export function ToolCall({ info }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = info.status === 'running'

  return (
    <div className={`tool-call ${info.status}`}>
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-icon">🔧</span>
        <span className="tool-name">{info.tool}</span>
        {isRunning && <span className="tool-spinner" />}
        {info.status === 'completed' && <span className="tool-check">✓</span>}
        {info.status === 'error' && <span className="tool-error">✗</span>}
        <span className="tool-expand">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <div className="tool-call-details">
          <div className="tool-detail-section">
            <div className="detail-label">输入</div>
            <pre className="detail-content">{info.input}</pre>
          </div>
          {info.output && (
            <div className="tool-detail-section">
              <div className="detail-label">输出</div>
              <pre className="detail-content">{info.output}</pre>
            </div>
          )}
          {info.error && (
            <div className="tool-detail-section error">
              <div className="detail-label">错误</div>
              <pre className="detail-content">{info.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
'''.strip()
    )

    # 生成 Header.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/layout/Header.tsx",
        '''interface HeaderProps {
  onToggleSidebar: () => void
  sessionTitle: string
}

export function Header({ onToggleSidebar, sessionTitle }: HeaderProps) {
  return (
    <header className="app-header">
      <button className="sidebar-toggle" onClick={onToggleSidebar}>
        ☰
      </button>
      <h1 className="header-title">{sessionTitle}</h1>
    </header>
  )
}
'''.strip()
    )

    # 生成 Sidebar.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/layout/Sidebar.tsx",
        '''import type { Session } from '../../App'

interface SidebarProps {
  sessions: Session[]
  activeSession: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ sessions, activeSession, onSelect, onCreate, onDelete, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>会话</h2>
          <button className="new-chat-btn" onClick={onCreate}>+ 新会话</button>
        </div>
        <div className="session-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-item ${session.id === activeSession ? 'active' : ''}`}
              onClick={() => onSelect(session.id)}
            >
              <span className="session-title">{session.title}</span>
              <button
                className="session-delete"
                onClick={e => { e.stopPropagation(); onDelete(session.id) }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
'''.strip()
    )

    # 生成 Loading.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/shared/Loading.tsx",
        '''export function Loading() {
  return (
    <div className="loading">
      <div className="loading-spinner" />
      <span>加载中...</span>
    </div>
  )
}
'''.strip()
    )

    # 生成 ErrorBoundary.tsx
    write_file(
        f"{output_dir}/frontend/src/l9_ui/shared/ErrorBoundary.tsx",
        '''import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>出错了</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>重试</button>
        </div>
      )
    }
    return this.props.children
  }
}
'''.strip()
    )

    # 生成 styles/index.css
    write_file(
        f"{output_dir}/frontend/src/styles/index.css",
        '''* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.app-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.sidebar-toggle {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  margin-right: 12px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

/* 侧边栏 */
.sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.3s;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-header h2 {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.new-chat-btn {
  width: 100%;
  padding: 8px;
  background: #0070f3;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2px;
}

.session-item:hover { background: #f0f0f0; }
.session-item.active { background: #e3f2fd; }

.session-delete {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
}

/* 聊天窗口 */
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message-bubble {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-bubble.user { flex-direction: row-reverse; }

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #f0f0f0;
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
}

.message-text {
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.5;
  font-size: 14px;
  white-space: pre-wrap;
}

.user .message-text {
  background: #0070f3;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.assistant .message-text {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  padding: 0 4px;
}

.cursor-blink {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 输入框 */
.chat-input-container {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  resize: none;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  min-height: 40px;
  max-height: 120px;
}

.chat-input:focus { border-color: #0070f3; }

.send-btn {
  padding: 8px 20px;
  background: #0070f3;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.send-btn:disabled { background: #ccc; cursor: not-allowed; }

/* 工具调用 */
.tool-calls-container {
  margin-left: 44px;
  margin-bottom: 12px;
}

.tool-call {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 4px;
  overflow: hidden;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}

.tool-call.completed .tool-call-header { background: #f0fdf4; }
.tool-call.running .tool-call-header { background: #fff7ed; }

.tool-icon { font-size: 14px; }
.tool-name { flex: 1; }
.tool-check { color: #22c55e; }
.tool-error { color: #ef4444; }
.tool-expand { color: #999; font-size: 10px; }

.tool-call-details {
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
}

.tool-detail-section { margin-bottom: 8px; }
.detail-label { color: #666; margin-bottom: 4px; font-weight: 500; }
.detail-content {
  background: #f9f9f9;
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 56px;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
  }
  .sidebar.open { transform: translateX(0); }
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 99;
  }
  .message-content { max-width: 85%; }
}
'''.strip()
    )

    # 生成 vite.config.ts
    write_file(
        f"{output_dir}/frontend/vite.config.ts",
        '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
'''.strip()
    )

    # 生成 tsconfig.json
    write_file(
        f"{output_dir}/frontend/tsconfig.json",
        '''{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
'''.strip()
    )


def copy_static_templates(output_dir: str):
    """复制不需要修改的静态模板文件"""
    # 复制 L1 基础文件
    for f in ["base.py", "openai_adapter.py", "anthropic_adapter.py", "deepseek_adapter.py", "ollama_adapter.py"]:
        src = TEMPLATES_DIR / "backend" / "app" / "l1_llm" / f
        if src.exists():
            dst = f"{output_dir}/app/l1_llm/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L2 接口层
    src_dir = TEMPLATES_DIR / "backend" / "app" / "l2_interface"
    for f in os.listdir(str(src_dir)):
        src = src_dir / f
        if src.is_file():
            dst = f"{output_dir}/app/l2_interface/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L3 其他文件
    for f in ["prompt_builder.py", "output_parsers.py", "__init__.py"]:
        src = TEMPLATES_DIR / "backend" / "app" / "l3_prompt" / f
        if src.exists():
            dst = f"{output_dir}/app/l3_prompt/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L4 其他文件
    for f in ["state.py", "nodes.py", "router.py", "__init__.py"]:
        src = TEMPLATES_DIR / "backend" / "app" / "l4_agent" / f
        if src.exists():
            dst = f"{output_dir}/app/l4_agent/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L5 其他文件
    for f in ["registry.py", "executor.py", "__init__.py"]:
        src = TEMPLATES_DIR / "backend" / "app" / "l5_tools" / f
        if src.exists():
            dst = f"{output_dir}/app/l5_tools/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L6 记忆层
    src_dir = TEMPLATES_DIR / "backend" / "app" / "l6_memory"
    for f in os.listdir(str(src_dir)):
        src = src_dir / f
        if src.is_file():
            dst = f"{output_dir}/app/l6_memory/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L7 编排层
    src_dir = TEMPLATES_DIR / "backend" / "app" / "l7_orchestrator"
    for f in os.listdir(str(src_dir)):
        src = src_dir / f
        if src.is_file():
            dst = f"{output_dir}/app/l7_orchestrator/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L8 其他文件
    for f in ["schemas.py", "__init__.py"]:
        src = TEMPLATES_DIR / "backend" / "app" / "l8_api" / f
        if src.exists():
            dst = f"{output_dir}/app/l8_api/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L8 路由和中间件
    src_dir = TEMPLATES_DIR / "backend" / "app" / "l8_api" / "routes"
    for f in os.listdir(str(src_dir)):
        src = src_dir / f
        if src.is_file():
            dst = f"{output_dir}/app/l8_api/routes/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    src_dir = TEMPLATES_DIR / "backend" / "app" / "l8_api" / "middleware"
    for f in os.listdir(str(src_dir)):
        src = src_dir / f
        if src.is_file():
            dst = f"{output_dir}/app/l8_api/middleware/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)

    # 复制 L10 其他文件
    for f in ["logging.py", "__init__.py"]:
        src = TEMPLATES_DIR / "backend" / "app" / "l10_infra" / f
        if src.exists():
            dst = f"{output_dir}/app/l10_infra/{f}"
            ensure_dir(os.path.dirname(dst))
            copy_template(str(src), dst)


# ============================================================
# 主入口
# ============================================================

def main():
    if len(sys.argv) < 3:
        print("用法: python scripts/generate.py <config.yaml> <output_dir>")
        print("")
        print("示例:")
        print("  python scripts/generate.py agent.yaml ./generated_agent")
        sys.exit(1)

    config_path = sys.argv[1]
    output_dir = sys.argv[2]

    if not os.path.exists(config_path):
        print(f"错误: 配置文件不存在: {config_path}")
        sys.exit(1)

    print(f"加载配置: {config_path}")
    config = load_config(config_path)

    agent_name = config.get("agent", {}).get("name", "Agent")
    agent_type = config.get("agent", {}).get("type", "chat")
    print(f"Agent: {agent_name} ({agent_type})")
    print("")

    # 清空并创建输出目录
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    # 复制配置文件和需求文档到输出目录
    shutil.copy2(config_path, f"{output_dir}/agent.yaml")
    print(f"  ✓ 复制: {config_path} → {output_dir}/agent.yaml")

    print("")
    print("=== 开始生成代码 ===")
    print("")

    # 按 L1 → L10 顺序逐层生成
    print("[L1] 大模型层...")
    generate_l1_llm(config, output_dir)

    print("[L3] 提示工程层...")
    generate_l3_prompt(config, output_dir)

    print("[L4] Agent 框架层...")
    generate_l4_agent(config, output_dir)

    print("[L5] 工具执行层...")
    generate_l5_tools(config, output_dir)

    print("[L8] API 服务层 + [L10] 基础设施层...")
    generate_l8_api(config, output_dir)
    generate_l10_infra(config, output_dir)

    print("[L9] 前端展示层...")
    generate_frontend(config, output_dir)

    print("")
    print("=== 复制静态模板文件 ===")
    copy_static_templates(output_dir)

    print("")
    print(f"=== 生成完成! ===")
    print(f"输出目录: {output_dir}")
    print("")
    print("启动方式:")
    print(f"  cd {output_dir}")
    print("  cp .env.example .env  # 编辑填入 API Key")
    print("  pip install -r requirements.txt")
    print("  uvicorn app.main:app --reload --port 8000")
    print("")
    print("  cd frontend")
    print("  npm install && npm run dev")
    print("")
    print("  # 或使用 Docker:")
    print("  docker-compose up --build")


if __name__ == "__main__":
    main()