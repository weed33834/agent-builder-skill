/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // 水墨美学 token —— 直接映射自原项目 :root CSS 变量
      // 原色保持不变,Tailwind 类用语义名引用(如 text-ink-soft)
      colors: {
        paper: {
          DEFAULT: 'var(--paper)',
          soft: 'var(--paper-soft)',
          deep: 'var(--paper-deep)',
          faint: 'var(--paper-faint)',
          dim: 'var(--paper-dim)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
          ghost: 'var(--ink-ghost)',
        },
        line: {
          DEFAULT: 'var(--line)',
          soft: 'var(--line-soft)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          mid: 'var(--accent-mid)',
        },
        mirror: {
          DEFAULT: 'var(--mirror)',
          celebrity: 'var(--mirror-celebrity)',
          value: 'var(--mirror-value)',
          ideology: 'var(--mirror-ideology)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        serif: ['var(--font-serif)'],
        sans: ['var(--font-sans)'],
        num: ['var(--font-num)'],
      },
      transitionTimingFunction: {
        ink: 'var(--ease)',
        spring: 'var(--ease-spring)',
      },
    },
  },
  plugins: [],
}
