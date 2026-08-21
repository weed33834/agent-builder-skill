"""L1 - Ollama Adapter

Implements the LLMAdapter interface to adapt local Ollama models.
Suitable for local deployment and data security scenarios.
"""

from typing import AsyncIterator, Optional
from langchain_ollama import ChatOllama
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable

from .base import LLMAdapter


class OllamaAdapter(LLMAdapter):
    """Ollama local model adapter

    Supports: Qwen2.5, Llama3.1, Mistral and other local models
    Requires installing Ollama and pulling the model first
    """

    def __init__(
        self,
        model: str = "qwen2.5:7b",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        api_base: str = "http://localhost:11434",
        **kwargs,
    ):
        self.model_name = model
        self.temperature = temperature
        self.max_tokens = max_tokens

        self._client = ChatOllama(
            model=model,
            temperature=temperature,
            num_predict=max_tokens,
            base_url=api_base,
            **kwargs,
        )

    async def invoke(self, messages: list, tools: Optional[list] = None) -> AIMessage:
        # Ollama local models have limited tool call support
        # Use prompts to simulate tool calls
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
            "provider": "ollama",
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "context_window": 32768,
        }
