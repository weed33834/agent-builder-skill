"""L5 - Base Tool Definitions

Provides the base tools available to the Agent.
Each tool is registered with the @tool decorator, supporting Pydantic parameter validation.

Includes:
  - Built-in tools: web_search, web_fetch, current_time, calculate
  - MCP tools list: can store tools discovered from MCP servers
  - register_base_tools(): one-click registration of all base tools
"""

import ast
import ipaddress
import socket
from urllib.parse import urlparse

from langchain_core.tools import tool
import httpx
import re
from datetime import datetime

# Hosts / networks web_fetch must never touch (SSRF guard).
_BLOCKED_NETS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local incl. cloud metadata
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _assert_public_http_url(url: str) -> None:
    """Reject non-http(s) schemes and loopback/private/link-local targets."""
    parsed = urlparse(url or "")
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError(f"only http(s) URLs are allowed: {url!r}")
    hostname = parsed.hostname
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"cannot resolve host {hostname!r}: {exc}") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if any(ip in net for net in _BLOCKED_NETS):
            raise ValueError(f"access to private/reserved address is blocked: {hostname}")


def _safe_eval_math(expression: str):
    """Evaluate a arithmetic-only AST — no names, no calls, no ** power bombs.

    `eval` with a character allowlist still permits CPU bombs like
    ``9**9**9**9`` which block the event loop (CPU-bound work cannot be
    preempted by asyncio timeouts). Walking the AST with explicit operator
    support keeps the surface to + - * / // % and bounded **.
    """
    if len(expression) > 200:
        raise ValueError("expression too long")

    allowed_bins = {
        ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod,
    }
    max_power = 1000

    def _ev(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return _ev(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp):
            left, right = _ev(node.left), _ev(node.right)
            if isinstance(node.op, ast.Pow):
                # bound exponentiation: both operand magnitude and result size
                if abs(right) > 64 or abs(left) > 1e9:
                    raise ValueError("exponent too large")
                result = left**right
                if abs(result) > 1e300:
                    raise ValueError("result too large")
                return result
            if type(node.op) not in allowed_bins:
                raise ValueError("operator not allowed")
            if isinstance(node.op, ast.Div) and right == 0:
                raise ZeroDivisionError
            if isinstance(node.op, ast.Mod) and right == 0:
                raise ZeroDivisionError
            if isinstance(node.op, ast.FloorDiv) and right == 0:
                raise ZeroDivisionError
            return {
                ast.Add: lambda: left + right,
                ast.Sub: lambda: left - right,
                ast.Mult: lambda: left * right,
                ast.Div: lambda: left / right,
                ast.FloorDiv: lambda: left // right,
                ast.Mod: lambda: left % right,
            }[type(node.op)]()
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = _ev(node.operand)
            return value if isinstance(node.op, ast.UAdd) else -value
        raise ValueError(f"unsupported syntax: {type(node).__name__}")

    tree = ast.parse(expression, mode="eval")
    for node in ast.walk(tree):
        if isinstance(node, ast.Pow):
            continue
    return _ev(tree)


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
    Only public http(s) URLs are allowed — loopback, private networks and
    cloud-metadata addresses are rejected (SSRF guard).

    Args:
        url: Web page URL
    Returns:
        Web page text content (up to 5000 characters)
    """
    try:
        _assert_public_http_url(url)
    except ValueError as e:
        return f"Blocked: {e}"

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=15.0, follow_redirects=False)
            # Follow same-origin redirects manually so each hop re-checks.
            hops = 0
            while resp.is_redirect and hops < 3:
                nxt = resp.headers.get("location", "")
                if not nxt:
                    break
                _assert_public_http_url(nxt)
                resp = await client.get(nxt, timeout=15.0, follow_redirects=False)
                hops += 1
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

    Supports basic operations: + - * / % // and bounded ** (power)

    Args:
        expression: Mathematical expression, e.g. "2 + 2 * 3"
    Returns:
        Calculation result
    """
    try:
        # AST-walk evaluation: no eval(), no name/call access, bounded **.
        # A naive eval() with a character allowlist still permits CPU bombs
        # like 9**9**9**9 that block the event loop.
        return str(_safe_eval_math(expression))
    except Exception as e:  # noqa: BLE001
        return f"Calculation error: {e}"


# Base tools list (built-in tools)
BASE_TOOLS = [
    web_search,
    web_fetch,
    current_time,
    calculate,
]

# Subset the agent is allowed to call. In generated products generate.py
# writes the explicit list from agent.yaml `tools.enabled`; in the template
# dev environment everything is enabled.
ENABLED_TOOL_NAMES = [t.name for t in BASE_TOOLS]

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
