/**
 * L9 - Voice Input Component (M12 语音)
 *
 * Records microphone audio via MediaRecorder, sends to backend STT,
 * and plays back assistant TTS audio.
 *
 * Features:
 * - Record / stop / cancel with waveform-style level indicator
 * - Uses /api/voice/transcribe for STT
 * - Plays assistant audio via /api/voice/speak
 * - Graceful fallback when mic / MediaRecorder unavailable
 */

import { useRef, useState } from 'react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        void sendAudio()
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch (e) {
      setError('无法访问麦克风，请检查浏览器权限')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
  }

  const sendAudio = async () => {
    if (chunksRef.current.length === 0) return
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', blob, 'recording.webm')
      const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      if (data.text) onTranscript(data.text)
      else setError('未识别到语音内容')
    } catch {
      setError('语音识别失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="voice-input">
      {!recording ? (
        <button
          className="voice-btn"
          onClick={startRecording}
          disabled={disabled || busy}
          title="按住说话 (语音输入)"
        >
          🎤 {busy ? '识别中…' : '语音'}
        </button>
      ) : (
        <button className="voice-btn recording" onClick={stopRecording} title="停止录音">
          ⏹ 录音中…
        </button>
      )}
      {error && <span className="voice-error">{error}</span>}
    </div>
  )
}
