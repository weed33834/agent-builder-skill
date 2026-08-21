"""L2 - Streaming Processing Wrapper

Provides unified streaming processing capabilities, including event callbacks, buffering, etc.
"""

from typing import AsyncIterator, Callable, Awaitable, Optional
import asyncio
import json


class StreamManager:
    """Stream manager

    Wraps the LLM streaming output and supports event callbacks.
    """

    def __init__(self, buffer_size: int = 10):
        self._buffer_size = buffer_size
        self._callbacks: list[Callable[[str], None]] = []

    def add_callback(self, callback: Callable[[str], None]):
        """Add a streaming callback"""
        self._callbacks.append(callback)

    async def stream(
        self,
        stream_func: Callable[..., Awaitable[AsyncIterator[str]]],
        *args,
        **kwargs,
    ) -> AsyncIterator[str]:
        """Invoke streaming and process

        Args:
            stream_func: Streaming function
            *args, **kwargs: Arguments passed to the streaming function
        Yields:
            str: Processed text chunks
        """
        buffer = []

        async for chunk in stream_func(*args, **kwargs):
            if chunk:
                buffer.append(chunk)
                for cb in self._callbacks:
                    cb(chunk)
                yield chunk

                # Buffer control
                if len(buffer) >= self._buffer_size:
                    buffer.pop(0)

    async def collect_stream(
        self,
        stream_func: Callable[..., Awaitable[AsyncIterator[str]]],
        *args,
        **kwargs,
    ) -> str:
        """Collect the full streaming output as a string"""
        parts = []
        async for chunk in self.stream(stream_func, *args, **kwargs):
            parts.append(chunk)
        return "".join(parts)


class StreamingCallback:
    """Streaming callback handler

    Used to trigger various events during streaming output.
    """

    def __init__(self):
        self.on_token: Optional[Callable[[str], None]] = None
        self.on_start: Optional[Callable[[], None]] = None
        self.on_end: Optional[Callable[[str], None]] = None
        self.on_error: Optional[Callable[[Exception], None]] = None

    def token_callback(self, token: str):
        """Token-level callback"""
        if self.on_token:
            self.on_token(token)

    def start(self):
        """Stream start callback"""
        if self.on_start:
            self.on_start()

    def end(self, full_text: str):
        """Stream end callback"""
        if self.on_end:
            self.on_end(full_text)

    def error(self, e: Exception):
        """Error callback"""
        if self.on_error:
            self.on_error(e)
