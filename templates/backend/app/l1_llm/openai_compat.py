"""L1 - OpenAI-Compatible Adapter Base

DeepSeek / GLM / Kimi / Qwen (and OpenAI itself) all speak the OpenAI chat
protocol. This base class holds the single implementation of
invoke/stream/bind_tools/get_chat_model; concrete providers only declare
their defaults. Previously this ~50-line body was copy-pasted across five
adapters (~250 lines of drift-prone duplication).
"""

from typing import AsyncIterator, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable

from .base import LLMAdapter


class OpenAICompatAdapter(LLMAdapter):
    """Base adapter for every OpenAI-protocol-compatible provider."""

    provider_name: str = "openai"
    default_model: str = "gpt-4o"
    default_api_base: str = ""
    context_window: int = 128000

    def __init__(
        self,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        **kwargs,
    ):
        self.model_name = model or self.default_model
        self.temperature = temperature
        self.max_tokens = max_tokens

        client_kwargs: dict = {
            "model": self.model_name,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs,
        }
        api_base = api_base or self.default_api_base
        if api_base:
            client_kwargs["base_url"] = api_base
        if api_key:
            client_kwargs["api_key"] = api_key

        self._client = ChatOpenAI(**client_kwargs)

    async def invoke(self, messages: list, tools: Optional[list] = None) -> AIMessage:
        llm = self._client.bind_tools(tools) if tools else self._client
        return await llm.ainvoke(messages)

    async def stream(self, messages: list, tools: Optional[list] = None) -> AsyncIterator[str]:
        llm = self._client.bind_tools(tools) if tools else self._client
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content

    def bind_tools(self, tools: list) -> Runnable:
        return self._client.bind_tools(tools)

    def get_chat_model(self):
        """Expose the underlying LangChain chat model."""
        return self._client

    def get_model_info(self) -> dict:
        return {
            "provider": self.provider_name,
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "context_window": self.context_window,
        }
