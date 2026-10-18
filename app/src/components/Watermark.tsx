import { t } from '@/i18n/zh-TW'

// One tile of the pattern: two copies of the text, the second one moved half
// a tile to the right, so the rows do not line up. The tile is wider than
// the text, and the second copy is drawn twice (x and x - TILE_W), so a copy
// cut at the right edge goes on at the left edge of the next tile.
const TILE_W = 400
const TILE_H = 130
const FONT_SIZE = 16

/** The watermark (design 3.11): the same text, light and at an angle, over
 * the whole window on every page. Hidden from screen readers, because the
 * footer says the same thing. The color and the opacity are tokens
 * (--watermark, --watermark-opacity) in index.css. */
export function Watermark() {
  const text = t.watermark
  const copy = (x: number, y: number) => (
    <text x={x} y={y} fontSize={FONT_SIZE} fill="currentColor">{text}</text>
  )
  return (
    <svg className="watermark" aria-hidden="true" focusable="false">
      <defs>
        <pattern
          id="app-watermark"
          width={TILE_W}
          height={TILE_H}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-30)"
        >
          {copy(0, 40)}
          {copy(TILE_W / 2, 40 + TILE_H / 2)}
          {copy(TILE_W / 2 - TILE_W, 40 + TILE_H / 2)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#app-watermark)" />
    </svg>
  )
}
