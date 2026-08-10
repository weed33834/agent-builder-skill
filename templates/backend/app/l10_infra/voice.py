"""M12 - Voice Capabilities (语音能力)

TTS / STT 统一接口，对齐生产规范：
- 接口抽象（可替换任意供应商）
- 流式与文件输出
- 中文优先的默认实现（edge-tts 免 key；无依赖时降级）
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)


class TTSEngine(ABC):
    """Text-to-Speech engine interface"""

    @abstractmethod
    async def synthesize(self, text: str, *, voice: str = "", format: str = "mp3") -> bytes:
        """Synthesize text into audio bytes"""
        ...


class STTEngine(ABC):
    """Speech-to-Text engine interface"""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, *, format: str = "wav") -> str:
        """Transcribe audio bytes into text"""
        ...


class EdgeTTSEngine(TTSEngine):
    """TTS via edge-tts (free, no API key, good Chinese voices).

    Falls back to a stub that echoes metadata if edge_tts is not installed.
    """

    def __init__(self, default_voice: str = "zh-CN-XiaoxiaoNeural"):
        self.default_voice = default_voice

    async def synthesize(self, text: str, *, voice: str = "", format: str = "mp3") -> bytes:
        voice = voice or self.default_voice
        try:
            import edge_tts

            communicate = edge_tts.Communicate(text, voice)
            chunks: list[bytes] = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])
            return b"".join(chunks)
        except ImportError:
            logger.warning("edge_tts not installed; returning placeholder audio marker")
            payload = f"{{'engine':'edge-tts','voice':{voice!r},'text_len':{len(text)}}}"
            return base64.b64encode(payload.encode("utf-8"))


class MockSTTEngine(STTEngine):
    """STT placeholder — replace with Whisper / FunASR / cloud API in production"""

    async def transcribe(self, audio_bytes: bytes, *, format: str = "wav") -> str:
        logger.info("STT received %d bytes (%s); no real engine configured", len(audio_bytes), format)
        return ""


class VoiceService:
    """Facade bundling TTS + STT with provider switching"""

    def __init__(self, tts: Optional[TTSEngine] = None, stt: Optional[STTEngine] = None):
        self.tts = tts or EdgeTTSEngine()
        self.stt = stt or MockSTTEngine()

    async def speak(self, text: str, **kwargs) -> bytes:
        return await self.tts.synthesize(text, **kwargs)

    async def listen(self, audio_bytes: bytes, **kwargs) -> str:
        return await self.stt.transcribe(audio_bytes, **kwargs)

    async def speak_to_file(self, text: str, out_path: str, **kwargs) -> str:
        data = await self.speak(text, **kwargs)
        with open(out_path, "wb") as f:
            f.write(data)
        return out_path
