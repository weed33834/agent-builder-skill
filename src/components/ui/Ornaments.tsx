/**
 * 装饰组件库 —— 内联 SVG 装饰元素,填补页面空白,丰富视觉层次。
 * 风格延续宣纸 × 墨 × 朱墨的东方克制美学,所有图形纯几何/水墨笔触。
 */
import type { CSSProperties } from 'react'

type OrnProps = { className?: string; style?: CSSProperties; color?: string }

/* 水墨晕染圆 —— 大面积背景留白处放置,营造意境。
 * breathing=true 时三层圆做缓慢呼吸(半径脉动),适合常驻装饰。
 * 不传 breathing 时行为与原版完全一致,向后兼容。 */
export function InkBlot({ className, style, color = 'var(--accent)', breathing = false }: OrnProps & { breathing?: boolean }) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="ink-grad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="55%" stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#ink-grad)">
        {breathing && <animate attributeName="r" values="92;98;92" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1" />}
      </circle>
      <circle cx="100" cy="100" r="60" fill="none" stroke={color} strokeOpacity="0.12" strokeWidth="0.5">
        {breathing && <animate attributeName="r" values="60;64;60" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1" />}
      </circle>
      <circle cx="100" cy="100" r="40" fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="0.5" strokeDasharray="2 4">
        {breathing && <animate attributeName="r" values="40;43;40" dur="7s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1" />}
      </circle>
    </svg>
  )
}

/* 朱墨方印 —— 印章风格装饰,常置于卡片角落 */
export function SealStamp({ className, style, color = 'var(--accent)', char = '镜' }: OrnProps & { char?: string }) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="3" y="3" width="58" height="58" fill="none" stroke={color} strokeWidth="2.5" opacity="0.85" />
      <rect x="8" y="8" width="48" height="48" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
      <text x="32" y="42" textAnchor="middle" fontFamily="var(--font-seal), serif" fontSize="34" fill={color} fontWeight="700">{char}</text>
    </svg>
  )
}

/* 远山淡影 —— 横向装饰,用于段落分隔 */
export function MountainRange({ className, style, color = 'var(--ink-ghost)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 400 80" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M0,60 L40,40 L70,52 L110,18 L150,46 L185,30 L215,48 L255,22 L290,42 L325,28 L360,46 L400,32 L400,80 L0,80 Z" fill={color} opacity="0.12" />
      <path d="M0,68 L50,52 L90,62 L140,40 L180,58 L220,46 L260,60 L300,42 L340,56 L400,46 L400,80 L0,80 Z" fill={color} opacity="0.08" />
    </svg>
  )
}

/* 流云纹 —— 横向流动云纹装饰 */
export function CloudPattern({ className, style, color = 'var(--ink-ghost)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 240 40" fill="none" aria-hidden="true">
      <path d="M10,20 Q20,10 35,18 Q50,8 65,18 Q80,8 95,18 Q110,8 125,18 Q140,8 155,18 Q170,8 185,18 Q200,8 215,18 Q225,12 230,20"
        stroke={color} strokeWidth="1" fill="none" opacity="0.45" />
      <path d="M10,28 Q25,22 40,28 Q55,22 70,28 Q85,22 100,28 Q115,22 130,28 Q145,22 160,28 Q175,22 190,28 Q205,22 220,28 Q228,24 232,28"
        stroke={color} strokeWidth="0.6" fill="none" opacity="0.3" />
      <circle cx="20" cy="20" r="1.2" fill={color} opacity="0.5" />
      <circle cx="120" cy="20" r="1.2" fill={color} opacity="0.5" />
      <circle cx="220" cy="20" r="1.2" fill={color} opacity="0.5" />
    </svg>
  )
}

/* 八卦/同心圆 —— 三镜专属的几何标识装饰 */
export function ConcentricRings({ className, style, color = 'var(--mirror)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" stroke={color} strokeWidth="0.6" opacity="0.35" />
      <circle cx="60" cy="60" r="44" stroke={color} strokeWidth="0.6" opacity="0.5" strokeDasharray="3 3" />
      <circle cx="60" cy="60" r="32" stroke={color} strokeWidth="0.8" opacity="0.6" />
      <circle cx="60" cy="60" r="20" stroke={color} strokeWidth="1" opacity="0.75" />
      <circle cx="60" cy="60" r="8" fill={color} opacity="0.55" />
      <line x1="60" y1="4" x2="60" y2="20" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="60" y1="100" x2="60" y2="116" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="4" y1="60" x2="20" y2="60" stroke={color} strokeWidth="1" opacity="0.5" />
      <line x1="100" y1="60" x2="116" y2="60" stroke={color} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

/* 朱砂点阵 —— 小型装饰点阵,用于段落开头或卡片背景 */
export function DotGrid({ className, style, color = 'var(--accent)' }: OrnProps) {
  const dots = []
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 9; x++) {
      dots.push(<circle key={`${x}-${y}`} cx={x * 12 + 6} cy={y * 12 + 6} r="1" fill={color} opacity={0.15 + (x + y) * 0.02} />)
    }
  }
  return (
    <svg className={className} style={style} viewBox="0 0 108 60" fill="none" aria-hidden="true">{dots}</svg>
  )
}

/* 古卷边角 —— 用于卡片四角的装饰,增添古典韵味 */
export function CornerFlourish({ className, style, color = 'var(--ink-ghost)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M2,2 L18,2 M2,2 L2,18" stroke={color} strokeWidth="1.5" opacity="0.6" />
      <path d="M2,2 Q14,2 14,14 Q14,2 26,2" stroke={color} strokeWidth="0.8" fill="none" opacity="0.4" />
      <circle cx="14" cy="14" r="2" fill={color} opacity="0.5" />
      <circle cx="22" cy="2" r="1.5" fill={color} opacity="0.4" />
      <circle cx="2" cy="22" r="1.5" fill={color} opacity="0.4" />
    </svg>
  )
}

/* 卷轴分隔线 —— 段落间装饰,带卷轴端饰 */
export function ScrollDivider({ className, style, color = 'var(--accent)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 280 16" fill="none" aria-hidden="true">
      <line x1="40" y1="8" x2="240" y2="8" stroke={color} strokeWidth="0.8" opacity="0.55" />
      <circle cx="40" cy="8" r="3" fill="none" stroke={color} strokeWidth="0.8" opacity="0.6" />
      <circle cx="240" cy="8" r="3" fill="none" stroke={color} strokeWidth="0.8" opacity="0.6" />
      <rect x="135" y="2" width="10" height="12" fill="none" stroke={color} strokeWidth="0.8" opacity="0.7" transform="rotate(45 140 8)" />
      <circle cx="140" cy="8" r="2.5" fill={color} opacity="0.5" />
    </svg>
  )
}

/* 落款印章 —— 圆形印章风格 */
export function RoundSeal({ className, style, color = 'var(--accent)', char = '心' }: OrnProps & { char?: string }) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="2" opacity="0.85" />
      <circle cx="32" cy="32" r="22" fill="none" stroke={color} strokeWidth="0.8" opacity="0.5" strokeDasharray="2 2" />
      <text x="32" y="42" textAnchor="middle" fontFamily="var(--font-seal), serif" fontSize="28" fill={color} fontWeight="700">{char}</text>
    </svg>
  )
}

/* 三镜符号 —— 三个交错圆,代表三面镜子合一 */
export function TrinityMirror({ className, style, color = 'var(--ink-soft)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 80" fill="none" aria-hidden="true">
      <circle cx="40" cy="40" r="24" stroke="var(--mirror-celebrity)" strokeWidth="1" opacity="0.7" fill="none" />
      <circle cx="60" cy="40" r="24" stroke="var(--mirror-value)" strokeWidth="1" opacity="0.7" fill="none" />
      <circle cx="80" cy="40" r="24" stroke="var(--mirror-ideology)" strokeWidth="1" opacity="0.7" fill="none" />
      <line x1="0" y1="40" x2="14" y2="40" stroke={color} strokeWidth="0.6" opacity="0.4" />
      <line x1="106" y1="40" x2="120" y2="40" stroke={color} strokeWidth="0.6" opacity="0.4" />
    </svg>
  )
}

/* 书法竖排印章 —— 三个字的垂直印章 */
export function CalligraphyColumn({ className, style, color = 'var(--accent)', chars = ['心', '镜', '照'] }: OrnProps & { chars?: string[] }) {
  return (
    <svg className={className} style={style} viewBox="0 0 40 120" aria-hidden="true">
      <rect x="3" y="3" width="34" height="114" fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
      {chars.map((c, i) => (
        <text key={i} x="20" y={32 + i * 34} textAnchor="middle" fontFamily="var(--font-brush), serif" fontSize="22" fill={color} opacity="0.85">{c}</text>
      ))}
    </svg>
  )
}

/* 浮动粒子 —— 微动装饰点,营造氛围。
 * 增强版:每个粒子叠加正弦水平摆动 + 多段垂直起伏 + 半径脉动,
 * 比纯直线漂浮更有机自然。接口不变,向后兼容。 */
export function FloatingParticles({ className, style, color = 'var(--accent)' }: OrnProps) {
  const particles = [
    { x: 20, y: 30, r: 1.5, d: 0 },
    { x: 80, y: 20, r: 1, d: 0.5 },
    { x: 150, y: 40, r: 2, d: 1 },
    { x: 220, y: 25, r: 1.2, d: 1.5 },
    { x: 50, y: 60, r: 1, d: 2 },
    { x: 130, y: 70, r: 1.6, d: 2.5 },
    { x: 200, y: 55, r: 1.2, d: 3 },
    { x: 30, y: 85, r: 1, d: 0.8 },
    { x: 100, y: 95, r: 1.4, d: 1.8 },
    { x: 180, y: 85, r: 1, d: 2.8 },
  ]
  return (
    <svg className={className} style={style} viewBox="0 0 240 120" fill="none" aria-hidden="true">
      {particles.map((p, i) => {
        const amp = 4 + (i % 3) * 2       // 水平摆幅
        const vAmp = 6 + (i % 2) * 4      // 垂直起伏幅度
        const dur = 5 + p.d               // 主周期
        const xDur = 3.5 + p.d * 0.8      // 水平周期(与垂直不同步,产生正弦感)
        return (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={0.25}>
            {/* 垂直:5 段起伏,模拟波浪 */}
            <animate
              attributeName="cy"
              values={`${p.y};${p.y - vAmp * 0.5};${p.y - vAmp};${p.y - vAmp * 0.3};${p.y}`}
              dur={`${dur}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
              keyTimes="0;0.25;0.5;0.75;1"
            />
            {/* 水平:正弦摆动,与垂直周期不同步 */}
            <animate
              attributeName="cx"
              values={`${p.x};${p.x + amp};${p.x};${p.x - amp};${p.x}`}
              dur={`${xDur}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
              keyTimes="0;0.25;0.5;0.75;1"
            />
            {/* 透明度:呼吸脉动 */}
            <animate
              attributeName="opacity"
              values="0.1;0.4;0.15;0.35;0.1"
              dur={`${3 + p.d}s`}
              repeatCount="indefinite"
            />
            {/* 半径:微脉动,增加生命感 */}
            <animate
              attributeName="r"
              values={`${p.r};${p.r * 1.4};${p.r}`}
              dur={`${dur + 1}s`}
              repeatCount="indefinite"
            />
          </circle>
        )
      })}
    </svg>
  )
}

/* 飘带/书法笔触 —— 用于段落装饰 */
export function BrushStroke({ className, style, color = 'var(--accent)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 24" fill="none" aria-hidden="true">
      <path d="M2,12 Q40,4 80,14 Q120,22 160,8 Q180,4 198,12"
        stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M2,12 Q40,4 80,14 Q120,22 160,8 Q180,4 198,12"
        stroke={color} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
    </svg>
  )
}

/* 回纹(雷纹)边框 —— 商周青铜器纹饰,横向连续边框 */
export function MeanderBorder({ className, style, color = 'var(--ink-ghost)' }: OrnProps) {
  // 一个回纹单元
  const u = "M0,8 L0,0 L8,0 L8,8 L4,8 L4,4 L8,4"
  const units = []
  for (let i = 0; i < 8; i++) {
    units.push(<path key={i} d={u} transform={`translate(${i * 12},0)`} stroke={color} strokeWidth="0.8" fill="none" opacity="0.5" />)
  }
  return (
    <svg className={className} style={style} viewBox="0 0 96 12" fill="none" aria-hidden="true">
      {units}
      <line x1="0" y1="10" x2="96" y2="10" stroke={color} strokeWidth="0.4" opacity="0.3" />
    </svg>
  )
}

/* 莲瓣纹 —— 佛教/唐草风装饰,垂直或水平向 */
export function LotusPattern({ className, style, color = 'var(--mirror)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 60" fill="none" aria-hidden="true">
      {[20, 70, 120, 170].map((x, i) => (
        <g key={i} transform={`translate(${x},30)`}>
          <path d="M0,0 Q-12,-20 0,-26 Q12,-20 0,0 Z" stroke={color} strokeWidth="0.6" fill={color} fillOpacity="0.08" opacity="0.55" />
          <path d="M0,-2 Q-6,-14 0,-18 Q6,-14 0,-2 Z" stroke={color} strokeWidth="0.5" fill="none" opacity="0.5" />
          <line x1="0" y1="0" x2="0" y2="-22" stroke={color} strokeWidth="0.4" opacity="0.4" />
        </g>
      ))}
      <line x1="0" y1="32" x2="200" y2="32" stroke={color} strokeWidth="0.4" opacity="0.3" />
    </svg>
  )
}

/* 八卦图 —— 道家装饰,小尺寸角标或卡片背景 */
export function Bagua({ className, style, color = 'var(--ink-soft)' }: OrnProps) {
  // 八卦简化:外圆 + 八个小线段
  const trigrams = [
    [1, 1, 1], [0, 0, 0], [1, 0, 1], [0, 1, 0],
    [1, 1, 0], [0, 0, 1], [1, 0, 0], [0, 1, 1],
  ]
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="0.4" opacity="0.3" strokeDasharray="2 3" />
      <circle cx="50" cy="50" r="22" stroke={color} strokeWidth="0.6" opacity="0.5" />
      {/* 阴阳鱼 */}
      <path d="M50,28 A22,22 0 0,1 50,72 A11,11 0 0,1 50,50 A11,11 0 0,0 50,28 Z" fill={color} opacity="0.18" />
      <circle cx="50" cy="39" r="2.4" fill={color} opacity="0.7" />
      <circle cx="50" cy="61" r="2.4" fill="none" stroke={color} strokeWidth="1" opacity="0.7" />
      {/* 八卦爻 */}
      {trigrams.map((t, i) => {
        const ang = (i * 45 - 90) * Math.PI / 180
        const cx = 50 + Math.cos(ang) * 32
        const cy = 50 + Math.sin(ang) * 32
        return (
          <g key={i} transform={`translate(${cx},${cy}) rotate(${i * 45})`}>
            {t.map((bit, j) => (
              <line
                key={j}
                x1={-6}
                y1={(j - 1) * 2.4}
                x2={bit ? 6 : -1}
                y2={(j - 1) * 2.4}
                stroke={color}
                strokeWidth="1.4"
                opacity="0.7"
              />
            ))}
            {t.map((bit, j) => bit ? null : (
              <line
                key={`b-${j}`}
                x1={1}
                y1={(j - 1) * 2.4}
                x2={6}
                y2={(j - 1) * 2.4}
                stroke={color}
                strokeWidth="1.4"
                opacity="0.7"
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

/* 龟甲六边形纹 —— 占卜/古典纹理,网格背景 */
export function HexLattice({ className, style, color = 'var(--ink-ghost)' }: OrnProps) {
  const hexes = []
  const r = 16
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const cx = col * r * 1.7 + (row % 2 ? r * 0.85 : 0) + r
      const cy = row * r * 1.5 + r
      const points = []
      for (let k = 0; k < 6; k++) {
        const a = (k * 60 - 30) * Math.PI / 180
        points.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`)
      }
      hexes.push(
        <polygon
          key={`${row}-${col}`}
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          opacity={0.18 + (row + col) * 0.02}
        />
      )
    }
  }
  return (
    <svg className={className} style={style} viewBox="0 0 130 64" fill="none" aria-hidden="true">{hexes}</svg>
  )
}

/* 钱币纹(方孔圆钱) —— 古典连续纹饰,象征流通与圆满 */
export function CoinPattern({ className, style, color = 'var(--mirror)' }: OrnProps) {
  const coins = []
  for (let i = 0; i < 6; i++) {
    const cx = 12 + i * 22
    const cy = 12
    coins.push(
      <g key={i}>
        <circle cx={cx} cy={cy} r="10" stroke={color} strokeWidth="0.6" fill="none" opacity="0.4" />
        <rect x={cx - 3.5} y={cy - 3.5} width="7" height="7" stroke={color} strokeWidth="0.6" fill="none" opacity="0.5" />
      </g>
    )
  }
  return (
    <svg className={className} style={style} viewBox="0 0 140 24" fill="none" aria-hidden="true">{coins}</svg>
  )
}

/* 祥云 —— 单朵祥云图案,古典纹饰元素 */
export function AuspiciousCloud({ className, style, color = 'var(--ink-soft)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 60" fill="none" aria-hidden="true">
      <path
        d="M10,40 Q10,28 24,28 Q26,18 40,20 Q50,12 60,22 Q72,16 82,26 Q96,24 98,36 Q106,38 104,46 L16,46 Q6,46 10,40 Z"
        stroke={color}
        strokeWidth="0.8"
        fill={color}
        fillOpacity="0.08"
        opacity="0.6"
      />
      <path d="M24,32 Q30,28 36,32" stroke={color} strokeWidth="0.4" fill="none" opacity="0.5" />
      <path d="M50,30 Q58,26 66,30" stroke={color} strokeWidth="0.4" fill="none" opacity="0.5" />
      <path d="M76,34 Q82,30 88,34" stroke={color} strokeWidth="0.4" fill="none" opacity="0.5" />
      <circle cx="20" cy="40" r="1.4" fill={color} opacity="0.5" />
      <circle cx="100" cy="42" r="1.4" fill={color} opacity="0.5" />
    </svg>
  )
}

/* 折扇 —— 静态折扇装饰,代表风雅 */
export function FoldingFan({ className, style, color = 'var(--accent)' }: OrnProps) {
  const ribs = []
  for (let i = 0; i <= 10; i++) {
    const ang = -50 + i * 10
    const rad = ang * Math.PI / 180
    const x = 60 + Math.cos(rad - Math.PI / 2) * 56
    const y = 56 + Math.sin(rad - Math.PI / 2) * 56
    ribs.push(<line key={i} x1="60" y1="56" x2={x} y2={y} stroke={color} strokeWidth="0.6" opacity="0.55" />)
  }
  return (
    <svg className={className} style={style} viewBox="0 0 120 64" fill="none" aria-hidden="true">
      <path
        d="M4,56 A56,56 0 0,1 116,56 Z"
        fill={color}
        fillOpacity="0.08"
        stroke={color}
        strokeWidth="0.8"
        opacity="0.5"
      />
      {ribs}
      <circle cx="60" cy="56" r="2.5" fill={color} opacity="0.7" />
      <line x1="60" y1="56" x2="60" y2="60" stroke={color} strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

/* 月相图 —— 8 个相位的月相,横向装饰 */
export function MoonPhases({ className, style, color = 'var(--ink-soft)' }: OrnProps) {
  const phases = [
    { fill: 0, name: 'new' },
    { fill: 0.25, name: 'wax' },
    { fill: 0.5, name: 'first' },
    { fill: 0.75, name: 'gib' },
    { fill: 1, name: 'full' },
    { fill: 0.75, name: 'wan' },
    { fill: 0.5, name: 'last' },
    { fill: 0.25, name: 'cres' },
  ]
  return (
    <svg className={className} style={style} viewBox="0 0 200 28" fill="none" aria-hidden="true">
      <line x1="4" y1="14" x2="196" y2="14" stroke={color} strokeWidth="0.4" opacity="0.3" strokeDasharray="2 3" />
      {phases.map((p, i) => {
        const cx = 16 + i * 24
        return (
          <g key={i}>
            <circle cx={cx} cy="14" r="9" fill="none" stroke={color} strokeWidth="0.5" opacity="0.5" />
            {p.fill > 0 && (
              <path
                d={`M${cx},5 A9,9 0 0,${p.fill >= 0.5 ? 1 : 0} ${cx},23 A${9 - p.fill * 9},${9 - p.fill * 9} 0 0,${p.fill >= 0.5 ? 0 : 1} ${cx},5 Z`}
                fill={color}
                opacity="0.55"
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* 远山层叠 —— 三层远山,适合横幅底部 */
export function MountainLayers({ className, style, color = 'var(--ink-ghost)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 400 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M0,70 L50,40 L90,60 L140,28 L190,52 L240,32 L290,58 L340,38 L400,55 L400,100 L0,100 Z" fill={color} opacity="0.06" />
      <path d="M0,80 L60,56 L110,72 L170,46 L220,68 L270,52 L320,72 L400,62 L400,100 L0,100 Z" fill={color} opacity="0.1" />
      <path d="M0,88 L70,76 L140,86 L210,72 L280,84 L350,78 L400,86 L400,100 L0,100 Z" fill={color} opacity="0.14" />
      {/* 远塔点缀 */}
      <path d="M140,28 L142,18 L138,18 Z" fill={color} opacity="0.2" />
      <line x1="140" y1="20" x2="140" y2="14" stroke={color} strokeWidth="0.4" opacity="0.3" />
    </svg>
  )
}

/* 朱砂落款 —— 书法作品落款章,带年月款 */
export function SignatureSeal({ className, style, color = 'var(--accent)', char = '心', desc = '镜' }: OrnProps & { char?: string; desc?: string }) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 80" aria-hidden="true">
      <rect x="4" y="4" width="72" height="72" fill="none" stroke={color} strokeWidth="2" opacity="0.85" />
      <rect x="9" y="9" width="62" height="62" fill="none" stroke={color} strokeWidth="0.6" opacity="0.4" />
      <text x="40" y="36" textAnchor="middle" fontFamily="var(--font-seal), serif" fontSize="26" fill={color} fontWeight="700">{char}</text>
      <text x="40" y="62" textAnchor="middle" fontFamily="var(--font-seal), serif" fontSize="14" fill={color} opacity="0.7">{desc}</text>
    </svg>
  )
}

/* 五行图 —— 金木水火土五元素环绕,东方哲学装饰 */
export function FiveElements({ className, style, color = 'var(--ink-soft)' }: OrnProps) {
  const elements = [
    { name: '金', x: 60, y: 12 },
    { name: '木', x: 100, y: 42 },
    { name: '土', x: 60, y: 96 },
    { name: '水', x: 20, y: 42 },
    { name: '火', x: 88, y: 78 },
  ]
  return (
    <svg className={className} style={style} viewBox="0 0 120 110" fill="none" aria-hidden="true">
      <polygon points="60,12 100,42 88,78 32,78 20,42" stroke={color} strokeWidth="0.5" fill="none" opacity="0.4" />
      <polygon points="60,12 88,78 20,42" stroke={color} strokeWidth="0.4" fill="none" opacity="0.25" strokeDasharray="2 3" />
      <polygon points="100,42 32,78 60,12" stroke={color} strokeWidth="0.4" fill="none" opacity="0.25" strokeDasharray="2 3" />
      {elements.map((e, i) => (
        <g key={i}>
          <circle cx={e.x} cy={e.y} r="11" fill="var(--paper)" stroke={color} strokeWidth="0.6" opacity="0.6" />
          <text x={e.x} y={e.y + 4} textAnchor="middle" fontFamily="var(--font-seal), serif" fontSize="13" fill={color} opacity="0.8">{e.name}</text>
        </g>
      ))}
    </svg>
  )
}

/* 流水波纹 —— 横向波纹线条装饰 */
export function WavePattern({ className, style, color = 'var(--ink-ghost)' }: OrnProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 200 30" fill="none" aria-hidden="true">
      {[6, 14, 22].map((y, i) => (
        <path
          key={i}
          d={`M0,${y} Q12.5,${y - 4} 25,${y} T50,${y} T75,${y} T100,${y} T125,${y} T150,${y} T175,${y} T200,${y}`}
          stroke={color}
          strokeWidth="0.5"
          fill="none"
          opacity={0.4 - i * 0.1}
        />
      ))}
    </svg>
  )
}
