/**
 * SEO meta 管理 —— 移植自原 i18n.js 的 _applySeoMeta。
 * 各页面通过 useDocumentMeta({ page, vars }) 声明,自动设置 title/description/OG/Twitter。
 * 语言切换时随 useI18n 重渲自动刷新。
 */
import { useEffect } from 'react'
import { useI18n, translate, langTag } from './i18n'
import type { Lang } from '@/store'

function setMeta(attr: 'name' | 'property', key: string, val: string | undefined) {
  if (!val) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', val)
}

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

/** 声明页面 SEO:设置 title/description/OG/Twitter/canonical/theme-color。 */
export function useDocumentMeta({ page, vars }: MetaOpts) {
  const { lang } = useI18n()
  useEffect(() => {
    const { title, desc } = resolve(lang, page, vars)
    const siteName = translate<string>(lang, 'seo.site_name')
    // og_image/og_type/twitter_card 在 i18n 中未定义,直接用默认值;
    // og:image 路径需带 vite base(GitHub Pages 子路径 /mindmirror/),否则 404。
    const origin = window.location.origin
    const ogImage = import.meta.env.BASE_URL + 'images/og-card.jpg'
    const ogType = 'website'
    const twitterCard = 'summary_large_image'
    const ogImageUrl = new URL(ogImage, origin).href

    if (title && title !== `seo.${page}_title`) document.title = title
    setMeta('name', 'description', desc)
    setMeta('name', 'keywords', translate<string>(lang, 'seo.default_keywords'))
    setMeta('property', 'og:url', origin + window.location.pathname)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:site_name', siteName)
    setMeta('property', 'og:type', ogType)
    setMeta('property', 'og:image', ogImageUrl)
    setMeta('property', 'og:locale', lang === 'zh' ? 'zh_CN' : (lang === 'ja' ? 'ja_JP' : 'en_US'))
    setMeta('name', 'twitter:card', twitterCard)
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', ogImageUrl)
    // canonical(404 不注入)
    if (page !== 'notfound') {
      let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = origin + window.location.pathname
    }
    setMeta('name', 'theme-color', '#f4efe3')
    document.documentElement.lang = langTag(lang)
  }, [lang, page, vars])
}
