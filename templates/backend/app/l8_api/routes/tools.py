"""L8 - Tools & MCP Management API

Tool registry endpoints (M7.5):
- GET  /api/tools            list registered tools
- GET  /api/tools/{name}     tool detail
- POST /api/tools/mcp/connect   connect an MCP server & import its tools (M4.16)
- POST /api/tools/mcp/disconnect
- GET  /api/tools/mcp/servers   list connected MCP servers
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..schemas import ToolInfo
from ...l5_tools.registry import ToolRegistry
from ...l5_tools.mcp_client import mcp_client
from ...l10_infra.errors import ToolNotFoundError, MCPServerError

router = APIRouter()


class MCPConnectRequest(BaseModel):
    """MCP server connection request (M4.16)"""
    server_url: Optional[str] = Field(None, description="HTTP MCP endpoint")
    command: Optional[str] = Field(None, description="stdio MCP command")
    args: Optional[list[str]] = Field(default_factory=list, description="stdio args")
    name: Optional[str] = Field(None, description="server name")
    category: str = Field(default="mcp", description="tool category")
    import_tools: bool = Field(default=True, description="auto-import tools")


class MCPDisconnectRequest(BaseModel):
    name: str = Field(..., description="MCP server name")


@router.get("/tools", response_model=list[ToolInfo])
async def list_tools():
    """List all registered tools (M7.5)"""
    return ToolRegistry.list_tools()


@router.get("/tools/{name}", response_model=ToolInfo)
async def get_tool(name: str):
    """Get tool detail"""
    tool = ToolRegistry.get(name)
    category = next(
        (c for c, names in ToolRegistry._categories.items() if name in names),
        "general",
    )
    return ToolInfo(name=tool.name, description=tool.description, category=category)


@router.get("/tools/mcp/servers")
async def list_mcp_servers():
    """List connected MCP servers (M4.16)"""
    return {"servers": mcp_client.connected_servers()}


@router.get("/mcp/tools")
async def discover_mcp_tools():
    """Discover all tools exposed by connected MCP servers (frontend discoverMCPTools)"""
    try:
        tools = await mcp_client.list_all_tools()
    except Exception as exc:  # noqa: BLE001 - degraded discovery
        return {"tools": [], "error": str(exc)}
    return {"tools": tools}


@router.get("/mcp/status")
async def mcp_status():
    """Connection status of all MCP servers (frontend getMCPStatus)"""
    return {"servers": await mcp_client.status()}


@router.post("/tools/mcp/connect")
async def connect_mcp(req: MCPConnectRequest):
    """Connect an MCP server and optionally import its tools (M4.16/M4.17)"""
    if not req.server_url and not req.command:
        raise HTTPException(status_code=422, detail="Provide server_url (HTTP) or command (stdio)")

    try:
        if req.server_url:
            name = await mcp_client.connect_http(req.server_url, name=req.name)
        else:
            name = await mcp_client.connect_stdio(req.command, req.args, name=req.name)

        imported = []
        if req.import_tools:
            tools = await mcp_client.list_all_tools()
            imported = [t.get("name") for t in tools if t.get("server") == name]

        return {
            "connected": True,
            "server": name,
            "tool_count": len(imported),
            "tools": imported,
            "hint": "Tools are available via ToolRegistry / MCPClient.call_tool",
        }
    except MCPServerError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MCP connect failed: {e}")


@router.post("/tools/mcp/disconnect")
async def disconnect_mcp(req: MCPDisconnectRequest):
    """Disconnect an MCP server"""
    await mcp_client.disconnect(req.name)
    return {"disconnected": True, "server": req.name}
