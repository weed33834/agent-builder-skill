"""L1 - Gemini Adapter

Implements the LLMAdapter interface to adapt Google Gemini series models.
Uses the OpenAI-compatible API endpoint.
"""

from typing import AsyncIterator, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable

from .base import LLMAdapter


class GeminiAdapter(LLMAdapter):
    """Gemini model adapter

    Supports: Gemini 2.5 Pro / Gemini 2.5 Flash, etc.
    Uses the OpenAI-compatible API: https://generativelanguage.googleapis.com/v1beta/openai
    """

    def __init__(
        self,
        model: str = 'gemini-2.5-flash',
        temperature: float = 0.7,
        max_tokens: int = 4096,
        api_key: Optional[str] = None,
        api_base: str = 'https://generativelanguage.googleapis.com/v1beta/openai',
        **kwargs,
    ):
        self.model_name = model
        self.temperature = temperature
        self.max_tokens = max_tokens

        client_kwargs = {
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "base_url": api_base,
            **kwargs,
        }
        if api_key:
            client_kwargs["api_key"] = api_key

        self._client = ChatOpenAI(**client_kwargs)

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
            "provider": 'gemini',
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "context_window": 1000000,
        }
