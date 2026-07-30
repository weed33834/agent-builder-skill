/**
 * 雷达图 —— 移植自原 report.js drawRadar,改用 echarts-for-react。
 * 从 CSS 变量取色,保持与全站水墨主题一致;维度名走 i18n。
 *
 * 按需引入 echarts 核心(仅 RadarChart + Tooltip + CanvasRenderer),
 * 避免打包整库(1.14MB → ~200KB),通过 echarts={echarts} 注入 echarts-for-react。
 */
import { useMemo } from 'react'
import * as echarts from 'echarts/core'
import { RadarChart as EChartsRadar } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
// 用 core 入口而非默认导出:默认导出内部 `import * as echarts from 'echarts'` 会拉入整库(1.14MB);
// core 仅接受 echarts 作为 prop,配合上面的按需 use 实现树摇。
// 走 esm 子路径(包 module 字段仅对主入口生效,子路径需显式指定 esm/ 以避免 CJS interop 问题)。
import EChartsReactCore from 'echarts-for-react/esm/core'
import type { EChartsOption } from 'echarts'
import { useI18n } from '@/lib/i18n'

echarts.use([EChartsRadar, TooltipComponent, CanvasRenderer])

interface Props {
  entries: [string, number][]   // [dim_key, score 0-100]
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function RadarChart({ entries }: Props) {
  const { t } = useI18n()

  const option = useMemo<EChartsOption>(() => {
    const accent = cssVar('--accent', '#8b2e1f')
    const inkSoft = cssVar('--ink-soft', '#4a453e')
    const inkFaint = cssVar('--ink-faint', '#8a857c')
    const line = cssVar('--line', '#d0c9ba')
    const paper = cssVar('--paper-faint', '#f8f5ee')
    const paperSolid = cssVar('--paper', '#f4efe3')

    const radius = entries.length >= 10 ? '52%' : entries.length >= 7 ? '58%' : '68%'

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: paperSolid,
        borderColor: line,
        textStyle: { color: inkSoft, fontFamily: "'Noto Serif SC', serif" },
        formatter: () => {
          const vals = entries.map(
            ([k, v]) => `${t<string>(`report.dim_labels.${k}`) || k}: <b>${v}</b>`,
          )
          return vals.join('<br/>')
        },
      },
      radar: {
        indicator: entries.map(([k]) => ({
          name: t<string>(`report.dim_labels.${k}`) || k,
          max: 100,
        })),
        center: ['50%', '52%'],
        radius,
        axisName: {
          color: inkFaint,
          fontSize: 13,
          fontFamily: "'Noto Serif SC', serif",
          padding: [6, 10],
        },
        splitLine: { lineStyle: { color: line } },
        splitArea: { areaStyle: { color: ['transparent', 'rgba(0,0,0,0.015)'] } },
        axisLine: { lineStyle: { color: line } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: entries.map(([, v]) => v),
              areaStyle: { color: accent + '33' },
              lineStyle: { color: accent, width: 2 },
              itemStyle: { color: accent, borderColor: paper, borderWidth: 1 },
              symbol: 'circle',
              symbolSize: 7,
            },
          ],
        },
      ],
    }
  }, [entries, t])

  return (
    <div className="chart-container">
      <EChartsReactCore echarts={echarts} option={option} opts={{ renderer: 'canvas' }} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
