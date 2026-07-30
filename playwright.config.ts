import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置 —— E2E 针对 vite preview 产物(生产构建)跑,贴近真实部署。
 * 用法:
 *   npm run build && npm run e2e
 * webServer 会自动起 `vite preview`,构建产物由开发者保证最新(脚本已串 build)。
 */
const PORT = 4188

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 共享 localStorage / 同源 SW,串行更稳
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port ' + PORT + ' --host 127.0.0.1 --strictPort',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
