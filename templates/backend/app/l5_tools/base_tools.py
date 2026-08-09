"""L5 - Base Tool Definitions

Provides the base tools available to the Agent.
Each tool is registered with the @tool decorator, supporting Pydantic parameter validation.

Includes:
  - Built-in tools: web_search, web_fetch, current_time, calculate
  - MCP tools list: can store tools discovered from MCP servers
  - register_base_tools(): one-click registration of all base tools
"""

from langchain_core.tools import tool
import httpx
import re
from datetime import datetime


@tool
async def web_search(query: str) -> str:
    """Search the web for the latest information

    Searches via DuckDuckGo, no API Key required.

    Args:
        query: Search keywords
    Returns:
        Search result text
    """
    url = "https://api.duckduckgo.com/"
    params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params, timeout=10.0)
            data = resp.json()

            results = []
            if data.get("Abstract"):
                results.append(f"Summary: {data['Abstract']}")
            if data.get("AbstractSource"):
                results.append(f"Source: {data['AbstractSource']}")

            for topic in data.get("RelatedTopics", [])[:5]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append(topic["Text"])

            return "\n\n".join(results) if results else "No relevant results found"
        except Exception as e:
            return f"Search failed: {str(e)}"


@tool
async def web_fetch(url: str) -> str:
    """Fetch web page content

    Fetches the text content of the specified URL, automatically cleaning HTML tags.

    Args:
        url: Web page URL
    Returns:
        Web page text content (up to 5000 characters)
    """
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=15.0, follow_redirects=True)
            resp.encoding = resp.charset or "utf-8"
            text = resp.text

            # Clean HTML
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()

            return text[:5000]
        except Exception as e:
            return f"Failed to fetch page: {str(e)}"


@tool
async def current_time() -> str:
    """Get the current date and time

    Returns:
        Current time string, e.g. "2026-08-08 10:30:00"
    """
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@tool
async def calculate(expression: str) -> str:
    """Perform mathematical calculations

    Supports basic operations: + - * / % ( )

    Args:
        expression: Mathematical expression, e.g. "2 + 2 * 3"
    Returns:
        Calculation result
    """
    # Safety check: only allow digits and basic operators
    allowed = set("0123456789.+-*/()% ")
    if not all(c in allowed for c in expression):
        return "Error: expression contains illegal characters"

    try:
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"Calculation error: {str(e)}"


# Base tools list (built-in tools)
BASE_TOOLS = [
    web_search,
    web_fetch,
    current_time,
    calculate,
]

# MCP tools list (tools discovered and registered from MCP servers)
# Type: list[langchain_core.tools.BaseTool]
# These tools are auto-populated via ToolRegistry.register_from_mcp()
MCP_TOOLS: list = []


def register_base_tools():
    """Register all base tools to the global ToolRegistry

    One-click registration of all built-in base tools.
    Should be called at application startup.
    """
    from .registry import ToolRegistry

    for tool in BASE_TOOLS:
        ToolRegistry.register(tool, category="base", override=True)
