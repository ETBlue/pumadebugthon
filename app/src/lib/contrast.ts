// WCAG contrast of the design tokens (design 3.10). Pure functions, used by
// the tests that check the hero and the watermark colors in index.css.

type Rgb = [number, number, number]

/** '#rrggbb' or '#rgb' to [r, g, b], 0–255. */
export function parseHex(hex: string): Rgb {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`Not a hex color: ${hex}`)
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

function toHex(rgb: Rgb): string {
  return '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The WCAG 2 contrast ratio, from 1 to 21. The order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The color seen when `top` at `opacity` (0–1) covers `bottom`. Browsers
 * mix the sRGB channels, so this does the same. */
export function blend(top: string, bottom: string, opacity: number): string {
  const t = parseHex(top)
  const b = parseHex(bottom)
  return toHex(t.map((v, i) => v * opacity + b[i] * (1 - opacity)) as Rgb)
}

/** The lowest contrast of `text` on `background` when a layer of `overlay`
 * color at `opacity` lies on top: over the background only, over the text
 * only, or over both. */
export function worstContrast(text: string, background: string, overlay: string, opacity: number): number {
  const bg = blend(overlay, background, opacity)
  const fg = blend(overlay, text, opacity)
  return Math.min(contrastRatio(text, bg), contrastRatio(fg, background), contrastRatio(fg, bg))
}
