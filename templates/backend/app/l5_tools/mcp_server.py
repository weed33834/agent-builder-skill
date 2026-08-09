"""L5 - MCP Server

A lightweight stateless server based on the 2026-07-28 MCP spec.
Each request is self-contained, requiring no handshake/session/initialization.

Supports two transport modes:
  - stdio: JSON-RPC 2.0 communication via standard input/output
  - HTTP: JSON-RPC 2.0 communication via HTTP POST

Provided tools:
  - web_search: Search the web
  - web_fetch: Fetch web page content
  - calculate: Mathematical calculations
  - current_time: Current time
"""

import json
import re
import sys
from datetime import datetime
from typing import Any

import httpx


# ── Tool implementations ────────────────────────────────────────────────

async def _web_search(query: str) -> str:
    """Search the web for the latest information"""
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


async def _web_fetch(url: str) -> str:
    """Fetch web page content"""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=15.0, follow_redirects=True)
            resp.encoding = resp.charset or "utf-8"
            text = resp.text

            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()

            return text[:5000]
        except Exception as e:
            return f"Failed to fetch page: {str(e)}"


async def _calculate(expression: str) -> str:
    """Perform mathematical calculations"""
    allowed = set("0123456789.+-*/()% ")
    if not all(c in allowed for c in expression):
        return "Error: expression contains illegal characters"

    try:
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"Calculation error: {str(e)}"


async def _current_time() -> str:
    """Get the current date and time"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ── Tool definitions ────────────────────────────────────────────────

TOOLS = [
    {
        "name": "web_search",
        "description": "Search the web for the latest information. Searches via DuckDuckGo, no API Key required.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search keywords",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "web_fetch",
        "description": "Fetch the text content of the specified URL, automatically cleaning HTML tags.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Web page URL",
                },
            },
            "required": ["url"],
        },
    },
    {
        "name": "calculate",
        "description": "Perform mathematical calculations. Supports basic operations: + - * / % ( )",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression, e.g. '2 + 2 * 3'",
                },
            },
            "required": ["expression"],
        },
    },
    {
        "name": "current_time",
        "description": "Get the current date and time.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]

TOOL_HANDLERS = {
    "web_search": _web_search,
    "web_fetch": _web_fetch,
    "calculate": _calculate,
    "current_time": _current_time,
}


# ── JSON-RPC 2.0 handling ──────────────────────────────────────

def _make_error(code: int, message: str, request_id: Any = None) -> dict:
    return {
        "jsonrpc": "2.0",
        "error": {"code": code, "message": message},
        "id": request_id,
    }


def _make_success(result: Any, request_id: Any = None) -> dict:
    return {
        "jsonrpc": "2.0",
        "result": result,
        "id": request_id,
    }


async def _handle_request(request: dict) -> dict:
    """Handle a single JSON-RPC 2.0 request"""
    request_id = request.get("id")
    method = request.get("method", "")
    params = request.get("params", {})

    if method == "tools/list":
        return _make_success({"tools": TOOLS}, request_id)

    elif method == "tools/call":
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        if tool_name not in TOOL_HANDLERS:
            return _make_error(-32601, f"Tool does not exist: {tool_name}", request_id)

        try:
            handler = TOOL_HANDLERS[tool_name]
            result = await handler(**arguments)
            return _make_success({
                "content": [{"type": "text", "text": str(result)}],
            }, request_id)
        except Exception as e:
            return _make_error(-32000, f"Tool execution failed: {e}", request_id)

    elif method == "server/discover":
        return _make_success({
            "name": "mindmirror-mcp-server",
            "version": "1.0.0",
            "description": "MindMirror MCP server, providing search, web fetch, calculation, and time tools",
            "tools": [t["name"] for t in TOOLS],
        }, request_id)

    else:
        return _make_error(-32601, f"Method does not exist: {method}", request_id)


# ── Transport layer ──────────────────────────────────────────────────

async def handle_stdio():
    """Handle JSON-RPC 2.0 requests via standard input/output (stdio transport)

    Usage:
        echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python mcp_server.py
    """
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            response = _make_error(-32700, "Parse error: invalid JSON")
            print(json.dumps(response), flush=True)
            continue

        if isinstance(request, list):
            # Batch request
            responses = []
            for req in request:
                resp = await _handle_request(req)
                if resp is not None:
                    responses.append(resp)
            if responses:
                print(json.dumps(responses), flush=True)
        else:
            response = await _handle_request(request)
            if response is not None:
                print(json.dumps(response), flush=True)


async def handle_http_request(body: bytes) -> bytes:
    """Handle a single HTTP request body (HTTP transport)

    Args:
        body: Request body bytes (JSON-RPC 2.0 request)

    Returns:
        bytes: Response body bytes
    """
    try:
        request = json.loads(body.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        return json.dumps(_make_error(-32700, "Parse error: invalid JSON")).encode()

    if isinstance(request, list):
        responses = []
        for req in request:
            resp = await _handle_request(req)
            if resp is not None:
                responses.append(resp)
        return json.dumps(responses).encode()
    else:
        response = await _handle_request(request)
        return json.dumps(response).encode() if response is not None else b""


# ── Entry point ──────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio

    asyncio.run(handle_stdio())
