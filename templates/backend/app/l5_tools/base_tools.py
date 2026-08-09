"""L5 - 基础工具定义

提供 Agent 可用的基础工具。
每个工具使用 @tool 装饰器注册，支持 Pydantic 参数校验。
"""

from langchain_core.tools import tool
import httpx
import re
from datetime import datetime


@tool
async def web_search(query: str) -> str:
    """搜索网页获取最新信息
    
    通过 DuckDuckGo 搜索，无需 API Key。
    
    Args:
        query: 搜索关键词
    Returns:
        搜索结果文本
    """
    url = "https://api.duckduckgo.com/"
    params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, params=params, timeout=10.0)
            data = resp.json()
            
            results = []
            if data.get("Abstract"):
                results.append(f"摘要: {data['Abstract']}")
            if data.get("AbstractSource"):
                results.append(f"来源: {data['AbstractSource']}")
            
            for topic in data.get("RelatedTopics", [])[:5]:
                if isinstance(topic, dict) and "Text" in topic:
                    results.append(topic["Text"])
            
            return "\n\n".join(results) if results else "未找到相关结果"
        except Exception as e:
            return f"搜索失败: {str(e)}"


@tool
async def web_fetch(url: str) -> str:
    """获取网页内容
    
    获取指定 URL 的文本内容，自动清理 HTML 标签。
    
    Args:
        url: 网页 URL
    Returns:
        网页文本内容（最多 5000 字符）
    """
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=15.0, follow_redirects=True)
            resp.encoding = resp.charset or "utf-8"
            text = resp.text
            
            # 清理 HTML
            text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            
            return text[:5000]
        except Exception as e:
            return f"获取页面失败: {str(e)}"


@tool
async def current_time() -> str:
    """获取当前日期和时间
    
    Returns:
        当前时间字符串，如 "2026-08-08 10:30:00"
    """
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@tool
async def calculate(expression: str) -> str:
    """执行数学计算
    
    支持基本运算：+ - * / % ( )
    
    Args:
        expression: 数学表达式，如 "2 + 2 * 3"
    Returns:
        计算结果
    """
    # 安全检查：只允许数字和基本运算符
    allowed = set("0123456789.+-*/()% ")
    if not all(c in allowed for c in expression):
        return "错误: 表达式包含非法字符"
    
    try:
        result = eval(expression, {"__builtins__": {}}, {})
        return str(result)
    except Exception as e:
        return f"计算错误: {str(e)}"


# 基础工具列表
BASE_TOOLS = [
    web_search,
    web_fetch,
    current_time,
    calculate,
]