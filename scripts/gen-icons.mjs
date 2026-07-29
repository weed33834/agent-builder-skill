/**
 * 生成 PWA 图标(PNG) —— 以「朱墨闲章」seal.svg 为蓝本,铺纸色底,按安全区缩放。
 * 用法: node scripts/gen-icons.mjs
 * 产物: public/icons/{icon-192,icon-512,icon-512-maskable,apple-touch-icon}.png
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const PAPER = '#f4efe3'
const INK = '#8b2e1f'

// 闲章主体(取自 public/images/seal.svg,内联以方便缩放)
const SEAL_MARKUP = `
  <circle cx="50" cy="50" r="46" fill="none" stroke="${INK}" stroke-width="3"/>
  <circle cx="50" cy="50" r="40" fill="none" stroke="${INK}" stroke-width="1"/>
  <circle cx="50" cy="50" r="16" fill="${INK}" opacity="0.12"/>
  <circle cx="50" cy="50" r="16" fill="none" stroke="${INK}" stroke-width="2"/>
  <circle cx="50" cy="6"  r="2.2" fill="${INK}"/>
  <circle cx="50" cy="94" r="2.2" fill="${INK}"/>
  <circle cx="6"  cy="50" r="2.2" fill="${INK}"/>
  <circle cx="94" cy="50" r="2.2" fill="${INK}"/>`

// size: 画布边长;scale: 闲章占画布比例(any 用 0.82,maskable 留安全区用 0.62)
function compose(size, scale) {
  const sealSize = size * scale
  const offset = (size - sealSize) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${PAPER}"/>
  <g transform="translate(${offset} ${offset}) scale(${sealSize / 100})">${SEAL_MARKUP}</g>
</svg>`
}

async function gen(size, scale, name) {
  const out = resolve(outDir, name)
  await sharp(Buffer.from(compose(size, scale))).png().toFile(out)
  console.log('generated', name)
}

await gen(192, 0.82, 'icon-192.png')
await gen(512, 0.82, 'icon-512.png')
await gen(512, 0.62, 'icon-512-maskable.png')
await gen(180, 0.82, 'apple-touch-icon.png')
console.log('done → public/icons/')
