"""L5 - Tool Registry

Global tool registry center, managing the registration, discovery, and execution of all tools.
Supports MCP (Model Context Protocol) tool discovery and registration.
"""

import json
from typing import Any, Optional
from langchain_core.tools import BaseTool


_registry_instance: Optional["ToolRegistry"] = None


def get_registry() -> "ToolRegistry":
    """Get the global ToolRegistry singleton (L5 public factory)."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = ToolRegistry()
    return _registry_instance


class ToolRegistry:
    """Global tool registry

    All tools must be registered before they can be used by the Agent.
    Supports runtime registration, unregistration, and querying.
    Supports automatic tool discovery and registration from MCP servers.
    """

    _tools: dict[str, BaseTool] = {}
    _categories: dict[str, list[str]] = {}

    @classmethod
    def register(cls, tool: BaseTool, category: str = "general", override: bool = False):
        """Register a tool

        Args:
            tool: Tool instance
            category: Tool category
            override: Whether to override an existing tool with the same name
        Raises:
            ValueError: Tool name already exists and override=False
        """
        if tool.name in cls._tools and not override:
            raise ValueError(f"Tool '{tool.name}' already exists")

        cls._tools[tool.name] = tool
        if category not in cls._categories:
            cls._categories[category] = []
        if tool.name not in cls._categories[category]:
            cls._categories[category].append(tool.name)

    @classmethod
    def unregister(cls, name: str):
        """Unregister a tool"""
        if name in cls._tools:
            del cls._tools[name]
            for category in cls._categories.values():
                if name in category:
                    category.remove(name)

    @classmethod
    def get(cls, name: str) -> BaseTool:
        """Get a tool

        Args:
            name: Tool name
        Returns:
            BaseTool: Tool instance
        Raises:
            KeyError: Tool does not exist
        """
        if name not in cls._tools:
            raise KeyError(f"Tool '{name}' does not exist")
        return cls._tools[name]

    @classmethod
    def get_all(cls) -> list[BaseTool]:
        """Get all tools"""
        return list(cls._tools.values())

    @classmethod
    def get_by_category(cls, category: str) -> list[BaseTool]:
        """Get tools by category"""
        return [
            cls._tools[name]
            for name in cls._categories.get(category, [])
            if name in cls._tools
        ]

    @classmethod
    def list_categories(cls) -> list[str]:
        """List all categories"""
        return list(cls._categories.keys())

    @classmethod
    def list_tools(cls) -> list[dict]:
        """List information for all tools"""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "category": next(
                    (cat for cat, names in cls._categories.items() if tool.name in names),
                    "general",
                ),
            }
            for tool in cls._tools.values()
        ]

    @classmethod
    def get_callables(cls) -> dict[str, Any]:
        """Get a name -> async callable map (framework-agnostic runtimes, e.g. 'bare').

        Each callable accepts keyword arguments and returns the tool result.
        """
        def _make_callable(tool: BaseTool):
            async def _call(**kwargs) -> Any:
                return await tool.ainvoke(kwargs)
            return _call

        return {tool.name: _make_callable(tool) for tool in cls._tools.values()}

    @classmethod
    async def execute(cls, name: str, args: dict) -> Any:
        """Execute a tool

        Args:
            name: Tool name
            args: Tool arguments
        Returns:
            Any: Tool execution result
        Raises:
            KeyError: Tool does not exist
            Exception: Tool execution exception
        """
        tool = cls.get(name)
        return await tool.ainvoke(args)

    @classmethod
    def clear(cls):
        """Clear all tools"""
        cls._tools.clear()
        cls._categories.clear()

    # ── MCP tool discovery ──────────────────────────────────────

    @classmethod
    async def discover_mcp_tools(
        cls,
        server_url: Optional[str] = None,
        command: Optional[str] = None,
        args: Optional[list[str]] = None,
    ) -> list[dict]:
        """Discover tools from an MCP server

        Supports two MCP transport modes:
        1. HTTP transport: connect via server_url
        2. stdio transport: start a subprocess via command + args

        Args:
            server_url: HTTP endpoint of the MCP server (HTTP transport)
            command: MCP server startup command (stdio transport)
            args: MCP server startup arguments (stdio transport)

        Returns:
            list[dict]: List of discovered tools, each item contains name, description, input_schema
        """
        if server_url:
            return await cls._discover_mcp_http(server_url)
        elif command:
            return await cls._discover_mcp_stdio(command, args or [])
        return []

    @classmethod
    async def _discover_mcp_http(cls, server_url: str) -> list[dict]:
        """Discover MCP tools via HTTP transport

        Calls the MCP server's tools/list endpoint to get the list of available tools.
        """
        import httpx

        payload = {
            "jsonrpc": "2.0",
            "method": "tools/list",
            "params": {},
            "id": "discover",
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    server_url,
                    json=payload,
                    timeout=10.0,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
                data = resp.json()

                if "error" in data:
                    raise Exception(f"MCP server error: {data['error']}")

                return data.get("result", {}).get("tools", [])

            except Exception as e:
                raise Exception(f"MCP HTTP discovery failed: {e}")

    @classmethod
    async def _discover_mcp_stdio(cls, command: str, args: list[str]) -> list[dict]:
        """Discover MCP tools via stdio transport

        Starts an MCP server subprocess and communicates via standard input/output.
        """
        import asyncio
        import json

        request = json.dumps({
            "jsonrpc": "2.0",
            "method": "tools/list",
            "params": {},
            "id": "discover",
        })

        try:
            process = await asyncio.create_subprocess_exec(
                command,
                *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(input=request.encode()),
                timeout=10.0,
            )

            if process.returncode != 0:
                raise Exception(f"MCP process exit code {process.returncode}: {stderr.decode()}")

            data = json.loads(stdout.decode())
            if "error" in data:
                raise Exception(f"MCP server error: {data['error']}")

            return data.get("result", {}).get("tools", [])

        except asyncio.TimeoutError:
            raise Exception("MCP stdio discovery timed out")
        except Exception as e:
            raise Exception(f"MCP stdio discovery failed: {e}")

    @classmethod
    async def register_from_mcp(
        cls,
        server_url: Optional[str] = None,
        command: Optional[str] = None,
        args: Optional[list[str]] = None,
        category: str = "mcp",
        override: bool = False,
    ) -> list[str]:
        """Discover and register tools from an MCP server

        One-stop method: discovers MCP tools and automatically registers them as LangChain BaseTool-compatible tools.

        Args:
            server_url: MCP server HTTP endpoint
            command: MCP server startup command
            args: MCP server startup arguments
            category: Tool category
            override: Whether to override existing tools

        Returns:
            list[str]: List of registered tool names
        """
        tools = await cls.discover_mcp_tools(server_url=server_url, command=command, args=args)
        registered_names = []

        for tool_def in tools:
            name = tool_def.get("name", "")
            description = tool_def.get("description", "")
            input_schema = tool_def.get("input_schema", {})

            if not name:
                continue

            # Create MCP tool proxy
            mcp_tool = cls._create_mcp_tool_proxy(
                name=name,
                description=description,
                input_schema=input_schema,
                server_url=server_url,
                command=command,
                args=args,
            )

            try:
                cls.register(mcp_tool, category=category, override=override)
                registered_names.append(name)
            except ValueError:
                if override:
                    cls.unregister(name)
                    cls.register(mcp_tool, category=category, override=True)
                    registered_names.append(name)

        return registered_names

    @classmethod
    def _create_mcp_tool_proxy(
        cls,
        name: str,
        description: str,
        input_schema: dict,
        server_url: Optional[str] = None,
        command: Optional[str] = None,
        args: Optional[list[str]] = None,
    ) -> BaseTool:
        """Create an MCP tool proxy

        Wraps an MCP tool as a LangChain BaseTool-compatible interface.
        Tool calls are forwarded to the MCP server via JSON-RPC 2.0.
        """
        from langchain_core.tools import BaseTool
        from pydantic import BaseModel, Field, create_model
        from typing import Optional as T_Optional

        # Build Pydantic parameter model from input_schema
        fields: dict[str, Any] = {}
        properties = input_schema.get("properties", {})
        required_params = input_schema.get("required", [])

        for param_name, param_def in properties.items():
            param_type = param_def.get("type", "string")
            type_map = {
                "string": str,
                "integer": int,
                "number": float,
                "boolean": bool,
                "array": list,
                "object": dict,
            }
            ptype = type_map.get(param_type, str)
            if param_name not in required_params:
                ptype = T_Optional[ptype]  # type: ignore
            fields[param_name] = (ptype, Field(
                description=param_def.get("description", ""),
                default=... if param_name in required_params else None,
            ))

        ArgsModel = create_model(f"{name}Args", **fields)  # type: ignore

        class MCPToolProxy(BaseTool):
            """MCP tool proxy"""
            name: str = name
            description: str = description
            args_schema: type[BaseModel] = ArgsModel
            _server_url: T_Optional[str] = server_url
            _command: T_Optional[str] = command
            _args: T_Optional[list[str]] = args

            async def _arun(self, **kwargs) -> str:
                if self._server_url:
                    return await self._call_http(**kwargs)
                elif self._command:
                    return await self._call_stdio(**kwargs)
                return "Error: MCP server not configured"

            async def _call_http(self, **kwargs) -> str:
                import httpx

                payload = {
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "params": {
                        "name": self.name,
                        "arguments": kwargs,
                    },
                    "id": "call",
                }

                async with httpx.AsyncClient() as client:
                    try:
                        resp = await client.post(
                            self._server_url,  # type: ignore
                            json=payload,
                            timeout=30.0,
                            headers={"Content-Type": "application/json"},
                        )
                        resp.raise_for_status()
                        data = resp.json()

                        if "error" in data:
                            return f"MCP call error: {data['error']}"

                        result = data.get("result", {})
                        content = result.get("content", [])
                        return "\n".join(
                            item.get("text", "") for item in content if item.get("type") == "text"
                        )

                    except Exception as e:
                        return f"MCP HTTP call failed: {e}"

            async def _call_stdio(self, **kwargs) -> str:
                import asyncio
                import json

                payload = json.dumps({
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "params": {
                        "name": self.name,
                        "arguments": kwargs,
                    },
                    "id": "call",
                })

                try:
                    process = await asyncio.create_subprocess_exec(
                        self._command,  # type: ignore
                        *self._args or [],  # type: ignore
                        stdin=asyncio.subprocess.PIPE,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )

                    stdout, stderr = await asyncio.wait_for(
                        process.communicate(input=payload.encode()),
                        timeout=30.0,
                    )

                    if process.returncode != 0:
                        return f"MCP process error: {stderr.decode()}"

                    data = json.loads(stdout.decode())
                    if "error" in data:
                        return f"MCP call error: {data['error']}"

                    result = data.get("result", {})
                    content = result.get("content", [])
                    return "\n".join(
                        item.get("text", "") for item in content if item.get("type") == "text"
                    )

                except Exception as e:
                    return f"MCP stdio call failed: {e}"

            def _run(self, **kwargs) -> str:
                raise NotImplementedError("MCP tools only support async invocation")

        return MCPToolProxy()  # type: ignore
