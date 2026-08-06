/**
 * SEO meta 管理 —— 使用 react-helmet-async。
 * 各页面通过 useDocumentMeta({ page, vars }) 声明，自动设置 title/description/OG/Twitter。
 * 语言切换时随 useI18n 重渲自动刷新。
 */
import { Helmet } from 'react-helmet-async'
import { useI18n, translate, langTag } from './i18n'
import type { Lang } from '@/store'

function resolve(lang: Lang, page: string, vars?: Record<string, string | number>) {
  const titleKey = `seo.${page}_title`
  const descKey = `seo.${page}_description`
  let title = translate<string>(lang, titleKey, vars)
  if (title === titleKey) title = translate<string>(lang, 'seo.home_title')
  let desc = translate<string>(lang, descKey, vars)
  if (desc === descKey) desc = translate<string>(lang, 'seo.default_description')
  return { title, desc }
}

interface MetaOpts {
  page: string
  vars?: Record<string, string | number>
}

/** 声明页面 SEO: 在渲染中插入 <Helmet> 设置 title/description/OG/Twitter/canonical。 */
export function useDocumentMeta({ page, vars }: MetaOpts) {
  const { lang } = useI18n()
  const { title, desc } = resolve(lang, page, vars)
  const siteName = translate<string>(lang, 'seo.site_name')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const ogImage = import.meta.env.BASE_URL + 'images/og-card.jpg'
  const ogImageUrl = origin ? new URL(ogImage, origin).href : ogImage
  const locale = lang === 'zh' ? 'zh_CN' : (lang === 'ja' ? 'ja_JP' : 'en_US')

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={translate<string>(lang, 'seo.default_keywords')} />
      <meta property="og:url" content={origin + (typeof window !== 'undefined' ? window.location.pathname : '')} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content={locale} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="theme-color" content="#f4efe3" />
      <html lang={langTag(lang)} />
    </Helmet>
  )
}