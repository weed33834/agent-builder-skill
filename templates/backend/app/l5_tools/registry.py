"""L5 - 工具注册表

全局工具注册中心，管理所有工具的注册、发现和执行。
"""

from typing import Any
from langchain_core.tools import BaseTool


class ToolRegistry:
    """全局工具注册表
    
    所有工具必须在注册后才能被 Agent 使用。
    支持运行时注册、注销和查询。
    """
    
    _tools: dict[str, BaseTool] = {}
    _categories: dict[str, list[str]] = {}
    
    @classmethod
    def register(cls, tool: BaseTool, category: str = "general", override: bool = False):
        """注册工具
        
        Args:
            tool: 工具实例
            category: 工具分类
            override: 是否覆盖已存在的同名工具
        Raises:
            ValueError: 工具名已存在且 override=False
        """
        if tool.name in cls._tools and not override:
            raise ValueError(f"工具 '{tool.name}' 已存在")
        
        cls._tools[tool.name] = tool
        if category not in cls._categories:
            cls._categories[category] = []
        if tool.name not in cls._categories[category]:
            cls._categories[category].append(tool.name)
    
    @classmethod
    def unregister(cls, name: str):
        """注销工具"""
        if name in cls._tools:
            del cls._tools[name]
            for category in cls._categories.values():
                if name in category:
                    category.remove(name)
    
    @classmethod
    def get(cls, name: str) -> BaseTool:
        """获取工具
        
        Args:
            name: 工具名称
        Returns:
            BaseTool: 工具实例
        Raises:
            KeyError: 工具不存在
        """
        if name not in cls._tools:
            raise KeyError(f"工具 '{name}' 不存在")
        return cls._tools[name]
    
    @classmethod
    def get_all(cls) -> list[BaseTool]:
        """获取所有工具"""
        return list(cls._tools.values())
    
    @classmethod
    def get_by_category(cls, category: str) -> list[BaseTool]:
        """按分类获取工具"""
        return [
            cls._tools[name]
            for name in cls._categories.get(category, [])
            if name in cls._tools
        ]
    
    @classmethod
    def list_categories(cls) -> list[str]:
        """列出所有分类"""
        return list(cls._categories.keys())
    
    @classmethod
    def list_tools(cls) -> list[dict]:
        """列出所有工具信息"""
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
    async def execute(cls, name: str, args: dict) -> Any:
        """执行工具
        
        Args:
            name: 工具名称
            args: 工具参数
        Returns:
            Any: 工具执行结果
        Raises:
            KeyError: 工具不存在
            Exception: 工具执行异常
        """
        tool = cls.get(name)
        return await tool.ainvoke(args)
    
    @classmethod
    def clear(cls):
        """清空所有工具"""
        cls._tools.clear()
        cls._categories.clear()