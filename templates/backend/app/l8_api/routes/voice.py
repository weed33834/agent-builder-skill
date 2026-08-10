"""L8 - Voice API (M12 语音)

- POST /api/voice/transcribe   multipart audio -> text (STT)
- GET  /api/voice/speak        text -> audio bytes (TTS)

Uses l10_infra/voice.VoiceService (edge-tts fallback / pluggable engines).
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response

from ...l10_infra.voice import VoiceService

router = APIRouter()

voice_service = VoiceService()


@router.post("/voice/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """STT: transcribe uploaded audio to text"""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty audio file")
    try:
        text = await voice_service.listen(data, format=file.filename.split(".")[-1] or "wav")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"STT failed: {exc}")
    return {"text": text, "engine": voice_service.stt.__class__.__name__}


@router.get("/voice/speak")
async def speak(text: str, voice: str = ""):
    """TTS: synthesize text into audio"""
    if not text:
        raise HTTPException(status_code=400, detail="empty text")
    try:
        audio = await voice_service.speak(text, voice=voice)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"TTS failed: {exc}")
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="speech.mp3"'},
    )
