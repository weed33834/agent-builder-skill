import { chromium } from 'playwright'
import * as fs from 'fs'

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'sections', path: '/sections' },
  { name: 'section-self', path: '/section/self' },
  { name: 'figures', path: '/figures' },
  { name: 'figure-curie', path: '/figure/curie' },
  { name: 'take-celebrity', path: '/take/celebrity' },
  { name: 'about', path: '/about' },
  { name: 'privacy', path: '/privacy' },
  { name: 'auth', path: '/auth' },
  { name: 'galgame', path: '/take-galgame' },
  { name: 'notfound', path: '/non-exist-page' },
]

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 },
]

;(async () => {
  const outDir = '/tmp/visual-check'
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
    const page = await ctx.newPage()

    for (const p of PAGES) {
      try {
        const url = `http://localhost:5173${p.path}`
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
        await page.waitForTimeout(500)
        await page.screenshot({ path: `${outDir}/${vp.name}-${p.name}-top.png`, fullPage: false })
        await page.screenshot({ path: `${outDir}/${vp.name}-${p.name}-full.png`, fullPage: true })
        console.log(`OK ${vp.name} ${p.name}`)
      } catch (e) {
        console.log(`FAIL ${vp.name} ${p.name}: ${e.message}`)
      }
    }

    await ctx.close()
  }

  await browser.close()
  console.log('Done.')
})()
