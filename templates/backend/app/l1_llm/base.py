"""L1 - LLM Adapter Abstract Base Class

Defines the interface that all LLM adapters must implement.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable


class LLMAdapter(ABC):
    """LLM adapter abstract base class

    All model providers (OpenAI, Anthropic, DeepSeek, Ollama, etc.)
    must implement this interface to ensure unified invocation from upper layers.
    """

    @abstractmethod
    async def invoke(self, messages: list, tools: Optional[list] = None) -> AIMessage:
        """Invoke the LLM synchronously

        Args:
            messages: List of messages (HumanMessage, SystemMessage, etc.)
            tools: List of available tools (optional)
        Returns:
            AIMessage: The LLM response
        """
        ...

    @abstractmethod
    async def stream(self, messages: list, tools: Optional[list] = None) -> AsyncIterator[str]:
        """Invoke the LLM in streaming mode

        Args:
            messages: List of messages
            tools: List of available tools (optional)
        Yields:
            str: Text content returned chunk by chunk
        """
        ...

    @abstractmethod
    def bind_tools(self, tools: list) -> Runnable:
        """Bind tools to the LLM

        Args:
            tools: List of tools
        Returns:
            Runnable: A runnable object with tools bound
        """
        ...

    @abstractmethod
    def get_model_info(self) -> dict:
        """Get model information

        Returns:
            dict: Contains provider, model, context_window, etc.
        """
        ...
