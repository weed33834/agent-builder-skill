"""L8 - Voice API (M12 语音)

- POST /api/voice/transcribe   multipart audio -> text (STT)
- GET  /api/voice/speak        text -> audio bytes (TTS)
- GET  /api/voice/engines      当前启用的 TTS/STT 引擎信息（管理界面用）

Uses l10_infra/voice.VoiceService:
  - TTS: EdgeTTSEngine (edge-tts, free) 或自定义
  - STT: 由 STT_ENGINE 环境变量切换（mock / whisper / faster-whisper）
"""

import logging
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from ...l10_infra.voice import VoiceService

logger = logging.getLogger(__name__)

router = APIRouter()

voice_service = VoiceService()


@router.post("/voice/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """STT: transcribe uploaded audio to text"""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty audio file")
    fmt = file.filename.split(".")[-1].lower() if file.filename else "wav"
    try:
        text = await voice_service.listen(data, format=fmt)
    except Exception as exc:  # noqa: BLE001
        logger.exception("STT failed (fmt=%s, %d bytes)", fmt, len(data))
        raise HTTPException(status_code=500, detail=f"STT failed: {exc}")
    return {"text": text, "engine": voice_service.stt.__class__.__name__}


@router.get("/voice/speak")
async def speak(text: str, voice: str = ""):
    """TTS: synthesize text into audio (returns mp3 bytes)"""
    if not text:
        raise HTTPException(status_code=400, detail="empty text")
    try:
        audio = await voice_service.speak(text, voice=voice)
    except Exception as exc:  # noqa: BLE001
        logger.exception("TTS failed (voice=%s)", voice)
        raise HTTPException(status_code=500, detail=f"TTS failed: {exc}")
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="speech.mp3"'},
    )


@router.get("/voice/engines")
async def engines():
    """Report the active TTS/STT engines (used by the admin console M12)"""
    return {
        "tts": voice_service.tts.__class__.__name__,
        "stt": voice_service.stt.__class__.__name__,
        "stt_engine_env": voice_service.stt.__class__.__name__.lower(),
    }
