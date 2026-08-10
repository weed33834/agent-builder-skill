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


class OpenAIWhisperSTTEngine(STTEngine):
    """STT via OpenAI Whisper API (production-ready, no local deps).

    Requires OPENAI_API_KEY. Falls back to a mock echo when unavailable.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "whisper-1", base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.model = model
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    async def transcribe(self, audio_bytes: bytes, *, format: str = "wav") -> str:
        if not self.api_key:
            logger.warning("WhisperSTT: no OPENAI_API_KEY; returning mock echo")
            return ""
        try:
            import httpx

            async with httpx.AsyncClient(timeout=60.0) as client:
                files = {"file": (f"audio.{format}", audio_bytes, f"audio/{format}")}
                data = {"model": self.model}
                resp = await client.post(
                    f"{self.base_url.rstrip('/')}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files=files,
                    data=data,
                )
                resp.raise_for_status()
                return (resp.json().get("text") or "").strip()
        except ImportError:
            logger.warning("httpx not installed; STT unavailable")
            return ""
        except Exception as e:  # noqa: BLE001
            logger.error("WhisperSTT transcription failed: %s", e)
            return ""


class FunASRSTTEngine(STTEngine):
    """Local STT via FunASR / faster-whisper (offline, privacy-friendly).

    Uses faster-whisper if available (CTranslate2, much faster than openai-whisper);
    falls back to a mock echo otherwise.
    """

    def __init__(self, model_size: str = "base", device: str = "auto"):
        self.model_size = model_size
        self.device = device
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            from faster_whisper import WhisperModel  # type: ignore

            self._model = WhisperModel(self.model_size, device=self.device)
        return self._model

    async def transcribe(self, audio_bytes: bytes, *, format: str = "wav") -> str:
        try:
            import io

            import numpy as np
            import soundfile as sf

            audio, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
            if audio.ndim > 1:
                audio = audio.mean(axis=1)  # mono
            model = self._ensure_model()

            def _run():
                segments, _info = model.transcribe(audio, language="zh")
                return "".join(s.text for s in segments).strip()

            return await asyncio.to_thread(_run)
        except ImportError:
            logger.warning("faster-whisper not installed; falling back to mock STT")
            return ""
        except Exception as e:  # noqa: BLE001
            logger.error("FunASRSTT transcription failed: %s", e)
            return ""


class VoiceService:
    """Facade bundling TTS + STT with provider switching.

    STT provider selection (env VISION/STT_ENGINE):
      - "mock"    (default): echo placeholder
      - "whisper"          : OpenAI Whisper API (requires OPENAI_API_KEY)
      - "faster-whisper"   : local faster-whisper (offline)
    """

    def __init__(self, tts: Optional[TTSEngine] = None, stt: Optional[STTEngine] = None):
        self.tts = tts or EdgeTTSEngine()
        engine = os.getenv("STT_ENGINE", "mock").lower()
        if stt is not None:
            self.stt = stt
        elif engine == "whisper":
            self.stt = OpenAIWhisperSTTEngine()
        elif engine in ("faster-whisper", "funasr", "local"):
            self.stt = FunASRSTTEngine()
        else:
            self.stt = MockSTTEngine()

    async def speak(self, text: str, **kwargs) -> bytes:
        return await self.tts.synthesize(text, **kwargs)

    async def listen(self, audio_bytes: bytes, **kwargs) -> str:
        return await self.stt.transcribe(audio_bytes, **kwargs)

    async def speak_to_file(self, text: str, out_path: str, **kwargs) -> str:
        data = await self.speak(text, **kwargs)
        with open(out_path, "wb") as f:
            f.write(data)
        return out_path
