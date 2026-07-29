/**
 * 强度滑块 —— 0-100 拖动,确认提交 position(原 renderSlider)。
 * 未拖动不提交(避免默认值 50 污染),与原 getCurrentAnswer 一致。
 */
import { useEffect, useRef, useState } from 'react'
import type { SliderQuestion as SliderQ } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import type { QuestionProps } from './types'

export function SliderQuestion({ question: q, tracker, onAnswer, getAnswerRef }: QuestionProps<SliderQ>) {
  const { t } = useI18n()
  const [val, setVal] = useState(50)
  const touched = useRef(false)

  useEffect(() => {
    getAnswerRef.current = () => (touched.current ? { position: val } : {})
  }, [val, touched, getAnswerRef])

  return (
    <div className="question-card">
      <div className="question-prompt">{q.prompt}</div>
      <p className="question-hint center">{t('take.slider_hint')}</p>
      <div className="slider-area" data-q={q.id}>
        <div className="slider-value">{val}</div>
        <div className="slider-track-wrap">
          <input
            type="range"
            min={0}
            max={100}
            value={val}
            id="slider-input"
            className="slider-input"
            aria-label={t('take.slider_aria')}
            onChange={(e) => {
              const v = +e.target.value
              setVal(v)
              touched.current = true
              tracker.recordChange(v)
            }}
          />
          <div className="slider-fill" style={{ width: `${val}%` }} />
        </div>
        <div className="slider-labels">
          <span>{q.left_label}</span>
          <span>{q.right_label}</span>
        </div>
        <button
          className="btn-primary"
          style={{ marginTop: 40, display: 'block', width: '100%' }}
          onClick={() => onAnswer({ position: val })}
        >
          {t('common.confirm')}
        </button>
      </div>
    </div>
  )
}
