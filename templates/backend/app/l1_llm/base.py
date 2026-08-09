"""L1 - 大模型适配器抽象基类

定义所有 LLM 适配器必须实现的接口。
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable


class LLMAdapter(ABC):
    """LLM 适配器抽象基类
    
    所有模型提供商（OpenAI、Anthropic、DeepSeek、Ollama 等）
    必须实现此接口，确保上层可以统一调用。
    """
    
    @abstractmethod
    async def invoke(self, messages: list, tools: Optional[list] = None) -> AIMessage:
        """同步调用 LLM
        
        Args:
            messages: 消息列表（HumanMessage, SystemMessage 等）
            tools: 可用的工具列表（可选）
        Returns:
            AIMessage: LLM 的响应
        """
        ...
    
    @abstractmethod
    async def stream(self, messages: list, tools: Optional[list] = None) -> AsyncIterator[str]:
        """流式调用 LLM
        
        Args:
            messages: 消息列表
            tools: 可用的工具列表（可选）
        Yields:
            str: 逐片返回的文本内容
        """
        ...
    
    @abstractmethod
    def bind_tools(self, tools: list) -> Runnable:
        """绑定工具到 LLM
        
        Args:
            tools: 工具列表
        Returns:
            Runnable: 绑定工具后的可运行对象
        """
        ...
    
    @abstractmethod
    def get_model_info(self) -> dict:
        """获取模型信息
        
        Returns:
            dict: 包含 provider, model, context_window 等
        """
        ...