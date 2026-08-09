"""L2 - 流式处理封装

提供统一的流式处理能力，包括事件回调、缓冲等。
"""

from typing import AsyncIterator, Callable, Awaitable, Optional
import asyncio
import json


class StreamManager:
    """流式管理器
    
    封装 LLM 的流式输出，支持事件回调。
    """
    
    def __init__(self, buffer_size: int = 10):
        self._buffer_size = buffer_size
        self._callbacks: list[Callable[[str], None]] = []
    
    def add_callback(self, callback: Callable[[str], None]):
        """添加流式回调"""
        self._callbacks.append(callback)
    
    async def stream(
        self,
        stream_func: Callable[..., Awaitable[AsyncIterator[str]]],
        *args,
        **kwargs,
    ) -> AsyncIterator[str]:
        """流式调用并处理
        
        Args:
            stream_func: 流式函数
            *args, **kwargs: 传递给流式函数的参数
        Yields:
            str: 处理后的文本片段
        """
        buffer = []
        
        async for chunk in await stream_func(*args, **kwargs):
            if chunk:
                buffer.append(chunk)
                for cb in self._callbacks:
                    cb(chunk)
                yield chunk
                
                # 缓冲控制
                if len(buffer) >= self._buffer_size:
                    buffer.pop(0)
    
    async def collect_stream(
        self,
        stream_func: Callable[..., Awaitable[AsyncIterator[str]]],
        *args,
        **kwargs,
    ) -> str:
        """收集完整流式输出为字符串"""
        parts = []
        async for chunk in self.stream(stream_func, *args, **kwargs):
            parts.append(chunk)
        return "".join(parts)


class StreamingCallback:
    """流式回调处理器
    
    用于在流式输出过程中触发各种事件。
    """
    
    def __init__(self):
        self.on_token: Optional[Callable[[str], None]] = None
        self.on_start: Optional[Callable[[], None]] = None
        self.on_end: Optional[Callable[[str], None]] = None
        self.on_error: Optional[Callable[[Exception], None]] = None
    
    def token_callback(self, token: str):
        """Token 级别回调"""
        if self.on_token:
            self.on_token(token)
    
    def start(self):
        """流开始回调"""
        if self.on_start:
            self.on_start()
    
    def end(self, full_text: str):
        """流结束回调"""
        if self.on_end:
            self.on_end(full_text)
    
    def error(self, e: Exception):
        """错误回调"""
        if self.on_error:
            self.on_error(e)