import type { Page } from '@playwright/test'

/**
 * E2E 辅助 —— 通用答题器,覆盖 9 题型 + 题型分段过渡卡。
 * 每题点选/确认后等待题目切换(key=currentIdx 的 div 重建)。
 */

// 等待并点击题型分段过渡卡的「开始」
async function passSectionIntro(page: Page): Promise<boolean> {
  const start = page.locator('.section-intro .section-start')
  if (await start.isVisible().catch(() => false)) {
    await start.click()
    await page.waitForTimeout(300)
    return true
  }
  return false
}

// 答当前题(自动识别题型);返回是否处理了一题
export async function answerCurrent(page: Page): Promise<boolean> {
  await page.waitForSelector('#question-area .question-card, #question-area .section-intro, .loading-overlay', {
    timeout: 10_000,
  })

  // 提交中 / 加载中:不算一题
  if (await page.locator('.loading-overlay').first().isVisible().catch(() => false)) return false

  if (await passSectionIntro(page)) return true

  const card = page.locator('#question-area .question-card').first()
  // 记录当前题干,用于等待切换
  const promptBefore = (await card.locator('.question-prompt').first().textContent()) || ''

  // scale / dilemma:点首个可选项即自动进下一题
  const scalePoint = card.locator('.scale-point').first()
  if (await scalePoint.isVisible().catch(() => false)) {
    await scalePoint.click()
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  const option = card.locator('.option').first()
  if (await option.isVisible().catch(() => false)) {
    await option.click()
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  // forced_choice:点首张卡,自动进下一题
  const fcCard = card.locator('.fc-card').first()
  if (await fcCard.isVisible().catch(() => false)) {
    await fcCard.click()
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  // slider:拖动后确认
  const slider = card.locator('input.slider-input').first()
  if (await slider.isVisible().catch(() => false)) {
    await slider.fill('60')
    await clickConfirm(page)
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  // allocation:自动配平后确认
  const allocBalance = card.locator('.alloc-balance').first()
  if (await allocBalance.isVisible().catch(() => false)) {
    await allocBalance.click()
    await clickConfirm(page)
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  // sort:直接确认(默认洗牌顺序即一个合法 order)
  const sortList = card.locator('.sort-list').first()
  if (await sortList.isVisible().catch(() => false)) {
    await clickConfirm(page)
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  // matrix:每行点中间分后确认
  const matrixRows = card.locator('.matrix-row')
  if (await matrixRows.first().isVisible().catch(() => false)) {
    const cnt = await matrixRows.count()
    for (let i = 0; i < cnt; i++) {
      // 点该行第 4 个点(若不足则点最后一个)
      const dots = matrixRows.nth(i).locator('.matrix-dot')
      const n = await dots.count()
      const target = Math.min(3, n - 1)
      await dots.nth(target).click()
    }
    await clickConfirm(page)
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  // auction:直接确认(全 0 出价合法,可保留预算)
  const auctionArea = card.locator('.auction-area').first()
  if (await auctionArea.isVisible().catch(() => false)) {
    await clickConfirm(page)
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  // iat:限时题,点左/右键把出现的词归类(词会逐个出现)
  const iatArea = card.locator('[class*="iat"]').first()
  if (await iatArea.isVisible().catch(() => false)) {
    await answerIAT(page)
    await waitQuestionSwitched(page, promptBefore)
    return true
  }
  return false
}

async function clickConfirm(page: Page) {
  await page.locator('#question-area .question-card .btn-primary').last().click()
}

async function waitQuestionSwitched(page: Page, promptBefore: string) {
  // 题型自动进下一题(300~350ms)或确认后立即;等题干变化或提交遮罩出现
  await page
    .waitForFunction(
      (prev) => {
        const el = document.querySelector('#question-area .question-prompt')
        const cur = el ? el.textContent : ''
        const submitting = !!document.querySelector('.loading-overlay')
        return submitting || (!!cur && cur !== prev)
      },
      promptBefore,
      { timeout: 10_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(150)
}

// IAT:词按 category 归类到左/右;限时,持续点击直到题目消失
async function answerIAT(page: Page) {
  const left = page.locator('[class*="iat-left"], .iat-left, button.iat-key-left').first()
  const right = page.locator('[class*="iat-right"], .iat-right, button.iat-key-right').first()
  // 退化:若无显式按钮,用键盘 ←/→
  for (let i = 0; i < 40; i++) {
    const wordEl = page.locator('#question-area .question-card .iat-word, #question-area .question-card [class*="word"]').first()
    const cat = (await wordEl.getAttribute('data-category')) || (await wordEl.getAttribute('data-cat'))
    if (cat === 'left' && (await left.isVisible().catch(() => false))) await left.click()
    else if (cat === 'right' && (await right.isVisible().catch(() => false))) await right.click()
    else await page.keyboard.press(cat === 'left' ? 'ArrowLeft' : 'ArrowRight')
    await page.waitForTimeout(120)
    if (await page.locator('.loading-overlay').first().isVisible().catch(() => false)) break
    if (!(await page.locator('#question-area .question-card').first().isVisible().catch(() => false))) break
  }
}

// 完整跑完一次测评(直到跳转 report)
export async function runFullAssessment(page: Page, url: string) {
  await page.goto(url)
  // 可能有草稿恢复弹窗 —— 选「重新开始」以保干净
  const restartBtn = page.locator('.draft-resume .btn-link')
  if (await restartBtn.isVisible().catch(() => false)) {
    await restartBtn.click()
    await page.waitForTimeout(300)
  }
  // 循环答题,直到出现报告页 hero 或 URL 变为 /report
  let guard = 0
  while (guard++ < 200) {
    if (page.url().includes('/report/')) break
    const hero = page.locator('.report-hero')
    if (await hero.isVisible().catch(() => false)) break
    const answered = await answerCurrent(page).catch(() => false)
    if (!answered) await page.waitForTimeout(200)
  }
}
