"""L1 - Anthropic Adapter

Implements the LLMAdapter interface to adapt Anthropic Claude series models.
"""

from typing import AsyncIterator, Optional
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable

from .base import LLMAdapter


class AnthropicAdapter(LLMAdapter):
    """Anthropic Claude model adapter

    Supports: Claude 3.5 Sonnet, Claude 3 Haiku, etc.
    """

    def __init__(
        self,
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        **kwargs,
    ):
        self.model_name = model
        self.temperature = temperature
        self.max_tokens = max_tokens

        client_kwargs = {
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }
        if api_key:
            client_kwargs["api_key"] = api_key
        if api_base:
            client_kwargs["base_url"] = api_base

        self._client = ChatAnthropic(**client_kwargs)

    async def invoke(self, messages: list, tools: Optional[list] = None) -> AIMessage:
        if tools:
            llm = self._client.bind_tools(tools)
        else:
            llm = self._client
        return await llm.ainvoke(messages)

    async def stream(self, messages: list, tools: Optional[list] = None) -> AsyncIterator[str]:
        if tools:
            llm = self._client.bind_tools(tools)
        else:
            llm = self._client
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content

    def bind_tools(self, tools: list) -> Runnable:
        return self._client.bind_tools(tools)

    def get_model_info(self) -> dict:
        return {
            "provider": "anthropic",
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "context_window": 200000,
        }
