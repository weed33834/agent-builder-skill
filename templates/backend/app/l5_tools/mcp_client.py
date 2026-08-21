"""L5 - MCP Client

High-level MCP (Model Context Protocol) client (M4.16).
Connects to MCP servers (HTTP or stdio transport), discovers and calls tools.

Protocol: MCP JSON-RPC 2.0 (stateless variant, 2026-07-28 spec).
Complements l5_tools/registry.py which provides low-level discovery;
this module adds: multi-server management, tool call routing, caching.

Typical usage:
    client = MCPClient()
    await client.connect_http("http://localhost:8001/mcp", name="search-server")
    await client.connect_stdio("npx", ["-y", "@modelcontextprotocol/server-filesystem", "./"])
    tools = await client.list_all_tools()
    result = await client.call_tool("search-server", "web_search", {"q": "agents"})
    await client.disconnect_all()
"""

import asyncio
import json
import subprocess
from typing import Any, Optional

from .errors import MCPServerError


class MCPServerConnection:
    """A single MCP server connection (one transport)"""

    def __init__(
        self,
        name: str,
        *,
        url: Optional[str] = None,
        command: Optional[str] = None,
        args: Optional[list[str]] = None,
        timeout: float = 30.0,
    ):
        self.name = name
        self.url = url
        self.command = command
        self.args = args or []
        self.timeout = timeout
        self._tools_cache: Optional[list[dict]] = None
        self._process: Optional[asyncio.subprocess.Process] = None

    # ── lifecycle ──────────────────────────────────────────────

    async def connect(self):
        """Establish the connection (for stdio: spawn the subprocess)"""
        if self.command:
            self._process = await asyncio.create_subprocess_exec(
                self.command,
                *self.args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        self._tools_cache = None

    async def disconnect(self):
        """Close the connection"""
        if self._process:
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
            except Exception:
                try:
                    self._process.kill()
                except Exception:
                    pass
            self._process = None

    # ── protocol calls ─────────────────────────────────────────

    async def _request(self, method: str, params: dict, request_id: str) -> dict:
        """Send a JSON-RPC 2.0 request and await the response"""
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": request_id,
        }

        if self.url:
            import httpx
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        self.url,
                        json=payload,
                        timeout=self.timeout,
                        headers={"Content-Type": "application/json"},
                    )
                    resp.raise_for_status()
                    data = resp.json()
            except Exception as e:
                raise MCPServerError(f"MCP HTTP call '{method}' failed on {self.name}: {e}")

        elif self._process:
            try:
                raw = json.dumps(payload).encode()
                stdout, stderr = await asyncio.wait_for(
                    self._process.communicate(input=raw), timeout=self.timeout
                )
                if self._process.returncode != 0:
                    raise MCPServerError(
                        f"MCP stdio process {self.name} exited {self._process.returncode}: {stderr.decode(errors='replace')[:500]}"
                    )
                data = json.loads(stdout.decode(errors="replace"))
            except asyncio.TimeoutError:
                raise MCPServerError(f"MCP stdio call '{method}' timed out on {self.name}")
            except json.JSONDecodeError as e:
                raise MCPServerError(f"MCP stdio invalid response from {self.name}: {e}")
        else:
            raise MCPServerError(f"MCP connection {self.name} is not connected")

        if "error" in data and data["error"]:
            raise MCPServerError(
                f"MCP server {self.name} error: {data['error']}"
            )
        return data.get("result", {})

    # ── tool operations ────────────────────────────────────────

    async def list_tools(self, refresh: bool = False) -> list[dict]:
        """List tools exposed by this server (cached)"""
        if self._tools_cache is None or refresh:
            result = await self._request("tools/list", {}, f"list-{self.name}")
            self._tools_cache = result.get("tools", [])
        return self._tools_cache

    async def call_tool(self, tool_name: str, arguments: dict) -> Any:
        """Call a tool on this server"""
        result = await self._request(
            "tools/call",
            {"name": tool_name, "arguments": arguments},
            f"call-{self.name}-{tool_name}",
        )
        content = result.get("content", [])
        # Extract text content
        texts = [
            item.get("text", "")
            for item in content
            if isinstance(item, dict) and item.get("type") == "text"
        ]
        return "\n".join(texts) if texts else result


class MCPClient:
    """Multi-server MCP client manager (M4.16)"""

    def __init__(self):
        self._connections: dict[str, MCPServerConnection] = {}

    # ── server management ──────────────────────────────────────

    async def connect_http(self, url: str, name: Optional[str] = None) -> str:
        """Connect to an HTTP-transport MCP server.

        Returns the connection name.
        """
        conn_name = name or f"http-{len(self._connections)}"
        conn = MCPServerConnection(conn_name, url=url)
        await conn.connect()
        self._connections[conn_name] = conn
        return conn_name

    async def connect_stdio(self, command: str, args: Optional[list[str]] = None,
                            name: Optional[str] = None) -> str:
        """Connect to a stdio-transport MCP server (subprocess).

        Example:
            await client.connect_stdio("npx", ["-y", "@modelcontextprotocol/server-everything"])
        """
        conn_name = name or f"stdio-{len(self._connections)}"
        conn = MCPServerConnection(conn_name, command=command, args=args)
        await conn.connect()
        self._connections[conn_name] = conn
        return conn_name

    async def disconnect(self, name: str):
        conn = self._connections.pop(name, None)
        if conn:
            await conn.disconnect()

    async def disconnect_all(self):
        for conn in list(self._connections.values()):
            await conn.disconnect()
        self._connections.clear()

    def connected_servers(self) -> list[str]:
        return list(self._connections.keys())

    async def status(self) -> list[dict]:
        """Connection status for all MCP servers (frontend /mcp/status).

        Each entry: {id, name, status, transport, tools, error?}
        """
        result: list[dict] = []
        for name, conn in self._connections.items():
            entry: dict = {
                "id": name,
                "name": name,
                "status": "connected",
                "transport": "http" if conn.url else "stdio",
                "tools": 0,
            }
            try:
                entry["tools"] = len(await conn.list_tools())
            except Exception as exc:  # noqa: BLE001 - surface degraded state
                entry["status"] = "error"
                entry["error"] = str(exc)
            result.append(entry)
        return result

    # ── tool operations ────────────────────────────────────────

    async def list_all_tools(self) -> list[dict]:
        """List tools from all connected servers"""
        all_tools: list[dict] = []
        for name, conn in self._connections.items():
            for tool in await conn.list_tools():
                all_tools.append({**tool, "server": name})
        return all_tools

    async def call_tool(self, server: str, tool_name: str, arguments: dict) -> Any:
        """Call a tool on a specific server"""
        conn = self._connections.get(server)
        if not conn:
            raise MCPServerError(f"MCP server '{server}' not connected")
        return await conn.call_tool(tool_name, arguments)

    async def call_tool_any(self, tool_name: str, arguments: dict) -> Any:
        """Call a tool by name across all servers (first match)"""
        for conn in self._connections.values():
            tools = await conn.list_tools()
            if any(t.get("name") == tool_name for t in tools):
                return await conn.call_tool(tool_name, arguments)
        raise MCPServerError(f"Tool '{tool_name}' not found on any MCP server")


# Global client instance
mcp_client = MCPClient()
