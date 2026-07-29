/**
 * 报告页 —— 阶段 3 将实现雷达图/匹配/冲突/Canvas 分享卡。当前为占位。
 */
import { useParams } from 'react-router-dom'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { Button } from '@/components/ui/Button'

export default function Report() {
  const { type } = useParams<{ type: string }>()
  const { t } = useI18n()
  const a = assessments.find((x) => x.type === type)
  useDocumentMeta({ page: 'report', vars: { name: a?.title || '' } })

  return (
    <div className="container" style={{ textAlign: 'center', padding: '120px 40px' }}>
      <div className="mirror-disc" style={{ margin: '0 auto 24px' }} />
      <h1 className="font-display text-2xl text-ink mb-3" style={{ letterSpacing: '0.04em' }}>
        {a?.title || '心镜报告'}
      </h1>
      <p className="text-ink-soft mb-8" style={{ letterSpacing: '0.1em' }}>报告页开发中(阶段 3)</p>
      <Button to="/">{t('common.back_home')}</Button>
    </div>
  )
}
