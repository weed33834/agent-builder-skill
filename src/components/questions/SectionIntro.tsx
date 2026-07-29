/**
 * 题型分段过渡卡 —— 题型切换时显示"第 N 部分 / 题型名 / 提示 / 开始"(原 take.js section-intro)。
 * 此时不启动计时与轨迹,点"开始"后才进入题目。
 */
import type { QuestionType } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { play, vibrate } from '@/lib/audio'

interface SectionIntroProps {
  type: QuestionType
  phaseNumber: number
  onStart: () => void
}

export function SectionIntro({ type, phaseNumber, onStart }: SectionIntroProps) {
  const { t } = useI18n()
  const name = t<string>(`take.type_label.${type}`)
  return (
    <div className="section-intro">
      <div className="section-eyebrow">{t('take.section_label', { n: phaseNumber })}</div>
      <h2 className="section-title">{name}</h2>
      <p className="section-hint">{t('take.section_intro_default')}</p>
      <button
        className="btn-primary section-start"
        type="button"
        onClick={() => { play('section'); vibrate(20); onStart() }}
      >
        {t('common.start')}
      </button>
    </div>
  )
}
