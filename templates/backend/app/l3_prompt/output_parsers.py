"""L3 - Output Parsers

Parses the LLM's unstructured output into structured data.
"""

from typing import TypeVar, Generic, Optional
from pydantic import BaseModel
import json
import re

T = TypeVar("T", bound=BaseModel)


class OutputParser(Generic[T]):
    """Output parser base class

    Parses the LLM's text output into a Pydantic model.
    """

    def __init__(self, model_class: type[T]):
        self.model_class = model_class

    def parse(self, text: str) -> Optional[T]:
        """Parse text into structured data

        Supports multiple formats:
        - Plain JSON
        - JSON inside Markdown code blocks
        - JSON with a prefix
        """
        # Try to extract JSON
        json_str = self._extract_json(text)
        if json_str:
            try:
                data = json.loads(json_str)
                return self.model_class(**data)
            except (json.JSONDecodeError, ValueError) as e:
                pass

        return None

    def _extract_json(self, text: str) -> Optional[str]:
        """Extract a JSON string from text"""
        # Try Markdown code block
        code_block = re.search(
            r'```(?:json)?\s*\n?(.*?)\n?```',
            text,
            re.DOTALL,
        )
        if code_block:
            return code_block.group(1).strip()

        # Try to parse JSON directly
        text = text.strip()
        if text.startswith("{") and text.endswith("}"):
            return text
        if text.startswith("[") and text.endswith("]"):
            return text

        return None


class SimpleParser:
    """Simple parser

    Provides commonly used text parsing methods.
    """

    @staticmethod
    def extract_code(text: str, language: Optional[str] = None) -> list[str]:
        """Extract code blocks"""
        pattern = r"```(\w+)?\n(.*?)```"
        matches = re.findall(pattern, text, re.DOTALL)

        if language:
            return [code for lang, code in matches if lang == language]
        return [code for _, code in matches]

    @staticmethod
    def extract_list(text: str) -> list[str]:
        """Extract list items"""
        items = re.findall(r"^[-*]\s+(.+)$", text, re.MULTILINE)
        if not items:
            items = re.findall(r"^\d+[.)]\s+(.+)$", text, re.MULTILINE)
        return items

    @staticmethod
    def extract_key_value(text: str) -> dict[str, str]:
        """Extract key-value pairs"""
        pairs = re.findall(r"^[-*]\s*(.+?):\s*(.+)$", text, re.MULTILINE)
        return {key.strip(): value.strip() for key, value in pairs}
