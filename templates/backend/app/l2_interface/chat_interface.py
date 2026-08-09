"""L2 - Unified Chat Interface

Encapsulates the differences between L1 adapters and provides a unified chat invocation method.
"""

from typing import AsyncIterator, Optional
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage, HumanMessage

from ..l1_llm.factory import create_llm
from ..l1_llm.base import LLMAdapter
from .streaming import StreamManager
from .retry import RetryHandler


class ChatInterface:
    """Unified chat interface

    Shields the differences between LLM providers and provides a consistent invocation method.
    """

    def __init__(
        self,
        provider: str = "openai",
        model: str = "gpt-4o",
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ):
        self._llm: LLMAdapter = create_llm(
            provider=provider,
            model=model,
            api_key=api_key,
            api_base=api_base,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        self._stream_manager = StreamManager()
        self._retry_handler = RetryHandler()

    async def chat(
        self,
        messages: list[dict],
        tools: Optional[list] = None,
    ) -> AIMessage:
        """Synchronous chat

        Args:
            messages: List of messages, format: [{"role": "user", "content": "..."}]
            tools: Optional list of tools
        Returns:
            AIMessage: LLM response
        """
        langchain_messages = self._convert_messages(messages)
        return await self._retry_handler.execute_with_retry(
            self._llm.invoke,
            langchain_messages,
            tools,
        )

    async def chat_stream(
        self,
        messages: list[dict],
        tools: Optional[list] = None,
    ) -> AsyncIterator[str]:
        """Streaming chat

        Args:
            messages: List of messages
            tools: Optional list of tools
        Yields:
            str: Text content chunk by chunk
        """
        langchain_messages = self._convert_messages(messages)
        async for chunk in self._stream_manager.stream(
            self._llm.stream,
            langchain_messages,
            tools,
        ):
            yield chunk

    def bind_tools(self, tools: list):
        """Bind tools to the current LLM"""
        return self._llm.bind_tools(tools)

    def get_model_info(self) -> dict:
        """Get current model information"""
        return self._llm.get_model_info()

    def _convert_messages(self, messages: list[dict]) -> list[BaseMessage]:
        """Convert API message format to LangChain message format"""
        converted = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                converted.append(SystemMessage(content=content))
            elif role == "user":
                converted.append(HumanMessage(content=content))
            elif role == "assistant":
                converted.append(AIMessage(content=content))
        return converted
