import { test, expect, type Page } from '@playwright/test'
import { runFullAssessment } from './helpers'

// 一个无 +/ / 的干净 base64 结果,用于报告页注入(localStorage)
const REPORT_B64 =
  'eyJ0eXBlIjoiY2VsZWJyaXR5IiwicmVzdWx0Ijp7ImRpbWVuc2lvbnMiOnsib3Blbm5lc3MiOjYwLCJyaXNrX3Rha2luZyI6ODAsImlkZWFsaXNtIjo2NSwibmV1cm90aWNpc20iOjMwfSwibWF0Y2hlcyI6W3siaWQiOiJsaW5jb2xuIiwibmFtZSI6IkxpbmNvbG4iLCJtYXRjaF9wY3QiOjg0LCJibHVyYiI6IkxlYWRlciJ9XSwiY29uZmxpY3RzIjpbeyJxdWVzdGlvbl9pZCI6ImNfczEiLCJkZXNjcmlwdGlvbiI6IkNvbmZsaWN0IGRlc2MiLCJjb25mbGljdF90eXBlIjoiaGlnaF9oZXNpdGF0aW9uIiwic2V2ZXJpdHkiOjN9XSwiaW5zaWdodHMiOnsiZGVjaXNpb25fc3R5bGUiOnsiY29kZSI6ImJhbGFuY2VkIiwibGFiZWwiOiJCYWxhbmNlZCIsImRlc2MiOiJCYWxhbmNlZCJ9LCJjb3VyYWdlX2luZGV4Ijp7ImNvZGUiOiJoaWdoIiwibGFiZWwiOiJIaWdoIiwiZGVzYyI6IkNvdXJhZ2VvdXMiLCJzY29yZSI6ODB9fSwicGVyY2VudGlsZXMiOnsib3Blbm5lc3MiOjU1fSwic3VtbWFyeSI6IlRlc3Qgc3VtbWFyeS4iLCJwcm9maWxlIjp7InRhZ3MiOlsiYm9sZCIsImJhbGFuY2VkIl19fX0='

async function clearStorage(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch { /* ignore */ }
  })
}

// ===================== 首页 =====================
test.describe('首页', () => {
  test('渲染 hero、三面镜卡与引导步骤', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await expect(page).toHaveTitle(/心镜|MindMirror/)
    // hero
    await expect(page.locator('header.hero h1')).toBeVisible()
    await expect(page.locator('.hero-cta a').first()).toBeVisible()
    // 三面镜卡
    const cards = page.locator('.mirrors-grid .mirror-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.nth(0).locator('h2')).toBeVisible()
    // 引导步骤
    await expect(page.locator('.howto-step')).toHaveCount(3)
  })

  test('镜卡点击进入对应答题流', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await page.locator('.mirrors-grid .mirror-card[data-type="value"]').click()
    await expect(page).toHaveURL(/\/take\/value$/)
    await expect(page.locator('.take-header')).toBeVisible()
  })

  test('语言切换 中→EN→日 生效', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    const langSwitch = page.locator('.lang-switch')
    await expect(langSwitch).toBeVisible()
    // 切英文
    await langSwitch.locator('button[aria-label="English"]').click()
    // hero CTA 文案应改变(英文);用 localStorage 校验 lang
    await expect(page).toHaveURL('/')
    const lang = await page.evaluate(() => JSON.parse(localStorage.getItem('mm_lang') || '{}').state?.lang)
    await expect(lang || '').toBe('en')
    // 切日文
    await langSwitch.locator('button[aria-label="日本語"]').click()
    const langJa = await page.evaluate(() => JSON.parse(localStorage.getItem('mm_lang') || '{}').state?.lang)
    await expect(langJa || '').toBe('ja')
  })
})

// ===================== 名人志 =====================
test.describe('名人志', () => {
  test('列表加载并可搜索/进详情', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/figures')
    await expect(page.locator('.fig-title')).toBeVisible()
    // 名人卡网格出现(等数据加载)
    await expect(page.locator('.fig-grid .onthisday-card').first()).toBeVisible({ timeout: 15_000 })
    const firstHref = await page.locator('.fig-grid .onthisday-card').first().getAttribute('href')
    expect(firstHref).toMatch(/^\/figure\//)
    // 点进详情
    await page.locator('.fig-grid .onthisday-card').first().click()
    await expect(page).toHaveURL(/\/figure\//)
  })

  test('搜索框过滤生效', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/figures')
    await expect(page.locator('.fig-grid .onthisday-card').first()).toBeVisible({ timeout: 15_000 })
    const before = await page.locator('.fig-grid .onthisday-card').count()
    await page.locator('.fig-search').fill('zzzzzz_not_exist')
    await expect(page.locator('.fig-empty')).toBeVisible()
    await page.locator('.fig-search').fill('')
    await expect(page.locator('.fig-grid .onthisday-card').first()).toBeVisible()
    const after = await page.locator('.fig-grid .onthisday-card').count()
    expect(after).toBe(before)
  })
})

// ===================== 静态页 =====================
test.describe('静态页', () => {
  test('关于页渲染', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/about')
    await expect(page.locator('.container')).toBeVisible()
    // 不应是 404 文案
    await expect(page.locator('body')).not.toContainText(/404|页面走失|镜碎/)
  })

  test('隐私页渲染', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/privacy')
    await expect(page.locator('.container')).toBeVisible()
  })

  test('未知路由显示 404', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/this-route-does-not-exist')
    // 404 页有 .nf-code(404 字样)
    await expect(page.locator('.nf-code')).toContainText('404')
    await expect(page.locator('.nf-illustration')).toBeVisible()
  })
})

// ===================== 答题流 → 报告页(完整 happy path) =====================
test.describe('答题流', () => {
  test('完成 fast 版名人镜 → 跳转报告页并渲染', async ({ page }) => {
    await clearStorage(page)
    // fast 版仅 tier<=1(scale + forced_choice),稳定可跑完
    await runFullAssessment(page, '/take/celebrity?version=fast')

    // 应已跳到报告页
    await expect(page).toHaveURL(/\/report\/celebrity/)
    // 报告页核心区块
    await expect(page.locator('.report-hero')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.match-list .match-item').first()).toBeVisible()
    await expect(page.locator('.dim-grid .dim-item').first()).toBeVisible()
    // 雷达图 canvas 渲染
    await expect(page.locator('.chart-container canvas').first()).toBeVisible({ timeout: 10_000 })
    // 操作按钮
    await expect(page.locator('.actions button, .actions a')).toHaveCount(3)
    // 结果已存入 localStorage
    const stored = await page.evaluate(() => {
      const v = localStorage.getItem('mindmirror_last_result')
      return v ? JSON.parse(v).state?.result?.length : 0
    })
    expect(stored).toBeGreaterThan(0)
  }, 120_000)
})

// ===================== 报告页(直接注入结果) =====================
test.describe('报告页', () => {
  test('注入结果后完整渲染各区块', async ({ page }) => {
    await page.addInitScript((b64) => {
      localStorage.setItem('mindmirror_last_result', JSON.stringify({ state: { result: b64 }, version: 0 }))
    }, REPORT_B64)
    await page.goto('/report/celebrity')
    await expect(page.locator('.report-hero')).toBeVisible()
    await expect(page.locator('.report-summary')).toContainText('Test summary')
    await expect(page.locator('.match-item .match-name').first()).toContainText('Lincoln')
    await expect(page.locator('.match-item .match-pct').first()).toContainText('84')
    // 维度 + 雷达图
    await expect(page.locator('.dim-grid .dim-item')).toHaveCount(4)
    await expect(page.locator('.chart-container canvas').first()).toBeVisible({ timeout: 10_000 })
    // 冲突
    await expect(page.locator('.conflict-list .conflict-item')).toHaveCount(1)
    // 行为洞察
    await expect(page.locator('.insight-list .insight-item').first()).toBeVisible()
    // 镜象名片
    await expect(page.locator('.mirror-card-share')).toBeVisible()
  })

  test('无结果时显示错误卡', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/report/celebrity')
    await expect(page.locator('.result-error')).toBeVisible()
  })

  test('点击维度项展开详情', async ({ page }) => {
    await page.addInitScript((b64) => {
      localStorage.setItem('mindmirror_last_result', JSON.stringify({ state: { result: b64 }, version: 0 }))
    }, REPORT_B64)
    await page.goto('/report/celebrity')
    await expect(page.locator('.dim-grid .dim-item').first()).toBeVisible()
    // 初始无 detail
    await expect(page.locator('.dim-detail').first()).toHaveCount(0)
    await page.locator('.dim-grid .dim-item').first().click()
    await expect(page.locator('.dim-detail').first()).toBeVisible()
  })

  test('分享按钮打开弹窗', async ({ page }) => {
    await page.addInitScript((b64) => {
      localStorage.setItem('mindmirror_last_result', JSON.stringify({ state: { result: b64 }, version: 0 }))
    }, REPORT_B64)
    await page.goto('/report/celebrity')
    await expect(page.locator('.mirror-card-share')).toBeVisible()
    // 点底部或名片的分享按钮
    await page.locator('.actions button').first().click()
    // 分享弹窗出现
    await expect(page.locator('.share-overlay')).toBeVisible({ timeout: 5_000 })
  })
})
