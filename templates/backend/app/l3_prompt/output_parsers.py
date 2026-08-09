"""L3 - 输出解析器

将 LLM 的非结构化输出解析为结构化数据。
"""

from typing import TypeVar, Generic, Optional
from pydantic import BaseModel
import json
import re

T = TypeVar("T", bound=BaseModel)


class OutputParser(Generic[T]):
    """输出解析器基类
    
    将 LLM 的文本输出解析为 Pydantic 模型。
    """
    
    def __init__(self, model_class: type[T]):
        self.model_class = model_class
    
    def parse(self, text: str) -> Optional[T]:
        """解析文本为结构化数据
        
        支持多种格式：
        - 纯 JSON
        - Markdown 代码块中的 JSON
        - 带前缀的 JSON
        """
        # 尝试提取 JSON
        json_str = self._extract_json(text)
        if json_str:
            try:
                data = json.loads(json_str)
                return self.model_class(**data)
            except (json.JSONDecodeError, ValueError) as e:
                pass
        
        return None
    
    def _extract_json(self, text: str) -> Optional[str]:
        """从文本中提取 JSON 字符串"""
        # 尝试 Markdown 代码块
        code_block = re.search(
            r'```(?:json)?\s*\n?(.*?)\n?```',
            text,
            re.DOTALL,
        )
        if code_block:
            return code_block.group(1).strip()
        
        # 尝试直接解析 JSON
        text = text.strip()
        if text.startswith("{") and text.endswith("}"):
            return text
        if text.startswith("[") and text.endswith("]"):
            return text
        
        return None


class SimpleParser:
    """简单解析器
    
    提供常用的文本解析方法。
    """
    
    @staticmethod
    def extract_code(text: str, language: Optional[str] = None) -> list[str]:
        """提取代码块"""
        pattern = r"```(\w+)?\n(.*?)```"
        matches = re.findall(pattern, text, re.DOTALL)
        
        if language:
            return [code for lang, code in matches if lang == language]
        return [code for _, code in matches]
    
    @staticmethod
    def extract_list(text: str) -> list[str]:
        """提取列表项"""
        items = re.findall(r"^[-*]\s+(.+)$", text, re.MULTILINE)
        if not items:
            items = re.findall(r"^\d+[.)]\s+(.+)$", text, re.MULTILINE)
        return items
    
    @staticmethod
    def extract_key_value(text: str) -> dict[str, str]:
        """提取键值对"""
        pairs = re.findall(r"^[-*]\s*(.+?):\s*(.+)$", text, re.MULTILINE)
        return {key.strip(): value.strip() for key, value in pairs}