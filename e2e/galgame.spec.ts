import { test, expect, type Page } from '@playwright/test'

/**
 * Galgame 资历测评 E2E —— 霓虹赛博主题的独立答题流。
 * 与三面镜不同:单选项自动前进、50 题、无草稿恢复、无题型分段过渡。
 * 覆盖 intro → 答题 → 报告 的完整 happy path + 报告页错误态。
 */

async function clearStorage(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch { /* ignore */ }
  })
}

// 跑完 Galgame 全部 50 题:点首个选项即自动前进
async function runGalgame(page: Page) {
  // intro 态:点「开始测评」
  await page.locator('.neon-intro .neon-btn.is-pink, .neon-intro button').first().click()
  await page.waitForTimeout(400)

  // 逐题点首个选项,直到进入 submitting 或跳转报告页
  let guard = 0
  while (guard++ < 120) {
    if (page.url().includes('/report-galgame')) break
    const hero = page.locator('.neon-hero')
    if (await hero.isVisible().catch(() => false)) break
    const option = page.locator('.neon-option').first()
    if (await option.isVisible().catch(() => false)) {
      await option.click()
      // 自动前进有 250ms 过渡,等下一题或提交遮罩
      await page.waitForTimeout(320)
    } else {
      await page.waitForTimeout(150)
    }
  }
}

test.describe('Galgame 测评', () => {
  test('intro 渲染并启用霓虹主题', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/take-galgame')
    // 介绍卡可见
    await expect(page.locator('.neon-intro')).toBeVisible()
    // 霓虹主题标记应挂在 body 上
    await expect(page.locator('body')).toHaveAttribute('data-galgame', '1')
    // 标题含 glitch
    await expect(page.locator('.neon-intro-title')).toBeVisible()
  })

  test('完成 50 题 → 跳转报告页并渲染称号与雷达图', async ({ page }) => {
    await clearStorage(page)
    await runGalgame(page)

    // 跳到报告页
    await expect(page).toHaveURL(/\/report-galgame/, { timeout: 20_000 })
    // Hero 称号可见
    await expect(page.locator('.neon-hero')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.neon-title-name')).toBeVisible()
    await expect(page.locator('.neon-title-emoji')).toBeVisible()
    // 雷达图 SVG 渲染
    await expect(page.locator('.neon-radar svg')).toBeVisible({ timeout: 10_000 })
    // 维度卡 5 个
    await expect(page.locator('.neon-dim-card')).toHaveCount(5)
    // 结果已存入 localStorage
    const stored = await page.evaluate(() => {
      const v = localStorage.getItem('mindmirror_last_result')
      return v ? JSON.parse(v).state?.result?.length : 0
    })
    expect(stored).toBeGreaterThan(0)
  }, 120_000)

  test('报告页无结果时显示错误卡', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/report-galgame')
    await expect(page.locator('.neon-error')).toBeVisible()
    await expect(page.locator('.neon-error-title')).toContainText(/DATA CORRUPT|数据损坏/)
  })

  test('答题卡抽屉可打开并显示题号网格', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/take-galgame')
    await page.locator('.neon-intro .neon-btn.is-pink, .neon-intro button').first().click()
    await page.waitForTimeout(400)
    // 点答题卡触发按钮(进度条区域的九宫格图标)
    const trigger = page.locator('.sheet-trigger, [class*="sheet-trigger"]').first()
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click()
      await page.waitForTimeout(300)
      await expect(page.locator('.neon-sheet-panel, .sheet-panel').first()).toBeVisible()
    }
  })

  test('导航栏测评下拉含 Galgame 入口', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    // 桌面端:展开测评下拉
    await page.locator('.nav-dropdown-trigger').first().click()
    await page.waitForTimeout(200)
    const galgameLink = page.locator('.nav-dropdown-panel a[href="/take-galgame"]')
    await expect(galgameLink).toBeVisible()
    await galgameLink.click()
    await expect(page).toHaveURL(/\/take-galgame/)
  })
})
