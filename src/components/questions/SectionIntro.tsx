/**
 * 题型分段过渡卡 —— 题型切换时显示"第 N 部分 / 题型名 / 提示 / 开始"(原 take.js section-intro)。
 * 此时不启动计时与轨迹,点"开始"后才进入题目。
 * 增强:艺术字体 + 多重装饰背景 + 书法竖排 + 飘带动效。
 */
import type { QuestionType } from '@/lib/types'
import { useI18n } from '@/lib/i18n'
import { play, vibrate } from '@/lib/audio'
import { asset } from '@/lib/utils'
import {
  ConcentricRings,
  BrushStroke,
  SealStamp,
  CalligraphyColumn,
  AuspiciousCloud,
  MeanderBorder,
} from '@/components/ui/Ornaments'

interface SectionIntroProps {
  type: QuestionType
  phaseNumber: number
  onStart: () => void
}

export function SectionIntro({ type, phaseNumber, onStart }: SectionIntroProps) {
  const { t } = useI18n()
  const name = t<string>(`take.type_label.${type}`)
  return (
    <div className="section-intro" style={{ position: 'relative', overflow: 'visible' }}>
      {/* 装饰:同心圆背景 */}
      <ConcentricRings color="var(--mirror)" style={{ position: 'absolute', top: '24px', right: '24px', width: '80px', height: '80px', opacity: 0.3, pointerEvents: 'none' }} />
      <ConcentricRings color="var(--mirror)" style={{ position: 'absolute', bottom: '24px', left: '24px', width: '60px', height: '60px', opacity: 0.2, pointerEvents: 'none' }} />
      {/* 印章角标 */}
      <SealStamp style={{ position: 'absolute', top: '20px', left: '20px', width: '44px', height: '44px', opacity: 0.6 }} />
      {/* 书法竖排,填补两侧空白 */}
      <CalligraphyColumn chars={['观', '心', '见', '性']} color="var(--mirror)" style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '120px', opacity: 0.45, pointerEvents: 'none' }} />
      {/* 题型图标光环 */}
      <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, var(--mirror)10 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* 祥云装饰,底部 */}
      <AuspiciousCloud color="var(--mirror)" style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', width: '140px', height: '40px', opacity: 0.35, pointerEvents: 'none' }} />

      <img src={asset(`/images/methods/${type}.jpg`)} className="section-icon" alt="" width={72} height={72} aria-hidden="true" style={{ position: 'relative', zIndex: 1 }} />
      <div className="section-eyebrow" style={{ position: 'relative', zIndex: 1 }}>{t('take.section_label', { n: phaseNumber })}</div>
      <h2 className="section-title art-title" style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-art)' }}>{name}</h2>
      <p className="section-hint" style={{ position: 'relative', zIndex: 1 }}>{t('take.section_intro_default')}</p>
      {/* 飘带装饰 */}
      <BrushStroke color="var(--mirror)" style={{ width: '180px', height: '20px', margin: '0 auto 16px', opacity: 0.5, position: 'relative', zIndex: 1 }} />
      {/* 回纹边框装饰 */}
      <MeanderBorder color="var(--mirror)" style={{ width: '200px', height: '12px', margin: '0 auto 24px', opacity: 0.5, position: 'relative', zIndex: 1 }} />
      <button
        className="btn-primary section-start"
        type="button"
        style={{ position: 'relative', zIndex: 1 }}
        onClick={() => { play('section'); vibrate(20); onStart() }}
      >
        {t('common.start')}
      </button>
    </div>
  )
}
