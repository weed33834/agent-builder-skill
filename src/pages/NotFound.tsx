/**
 * 404 页 —— 破镜重圆意象。简洁布局，主视觉居中。
 */
import { motion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { Button } from '@/components/ui/Button'
import { asset } from '@/lib/utils'
import { InkBlot } from '@/components/ui/Ornaments'

export default function NotFound() {
  const { t } = useI18n()
  const helmet = useDocumentMeta({ page: 'notfound' })
  return (
    <>
      {helmet}
      <motion.div
        className="nf-wrap container flex flex-col items-center justify-center text-center"
        style={{ minHeight: '72vh', position: 'relative', overflow: 'hidden', padding: '48px 20px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
      <InkBlot style={{ position: 'absolute', top: '5%', right: '-5%', width: '300px', height: '300px', pointerEvents: 'none', opacity: 0.2, zIndex: 0 }} />

      <motion.img
        src={asset('/images/404-broken-mirror.jpg')}
        className="nf-illustration"
        style={{ position: 'relative', zIndex: 1, width: '200px', maxWidth: '60vw', height: 'auto', marginBottom: '24px' }}
        alt="" aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      />
      <motion.div
        className="nf-code font-display leading-none"
        style={{ fontSize: 'clamp(64px, 12vw, 120px)', position: 'relative', zIndex: 1, marginBottom: '12px' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >404</motion.div>
      <motion.h1
        className="nf-title art-title text-ink"
        style={{ position: 'relative', zIndex: 1, fontSize: 'clamp(18px, 4vw, 24px)', marginBottom: '8px' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >{t('notfound.title')}</motion.h1>
      <motion.p
        className="nf-sub text-sm text-ink-soft"
        style={{ maxWidth: 380, position: 'relative', zIndex: 1, marginBottom: '28px' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >{t('notfound.sub')}</motion.p>
      <motion.div
        className="nf-actions flex gap-3 flex-wrap justify-center"
        style={{ position: 'relative', zIndex: 1 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Button to="/">{t('notfound.home')}</Button>
        <Button variant="link" to="/figures">{t('nav.figures')}</Button>
      </motion.div>
    </motion.div>
    </>
  )
}
