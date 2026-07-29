/**
 * 答题流 —— 阶段 2 将拆为 9 题型组件 + QuestionRouter。当前为占位。
 * 独立全屏路由(无 SiteHeader/Footer),复刻原 take.html 聚焦态。
 */
import { useParams } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { Button } from '@/components/ui/Button'

export default function Take() {
  const { type } = useParams<{ type: string }>()
  const { t } = useI18n()
  const a = assessments.find((x) => x.type === type)
  useDocumentMeta({ page: 'take', vars: { name: a?.title || '' } })

  return (
    <div className="container" style={{ textAlign: 'center', padding: '120px 40px' }}>
      <div className="mirror-disc" style={{ margin: '0 auto 24px' }} />
      <h1 className="font-display text-2xl text-ink mb-3" style={{ letterSpacing: '0.04em' }}>
        {a?.title || t('common.loading')}
      </h1>
      <p className="text-ink-soft mb-8" style={{ letterSpacing: '0.1em' }}>答题流开发中(阶段 2)</p>
      <Button to="/" variant="secondary">{t('common.back_home')}</Button>
    </div>
  )
}
