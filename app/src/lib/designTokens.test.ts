// Checks the colors in index.css (design 3.1, 3.10, 3.11): AA contrast of
// every text color, also under the watermark, and of the hero text.
import { describe, expect, it } from 'vitest'
import { blend, contrastRatio, worstContrast } from './contrast'
import { parseTokens } from './tokens'

// Vitest gives an empty string for a .css import, even with ?raw, so read the
// file from disk. The module name is a variable, so the app's tsconfig does
// not need the Node types.
const fsModule = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ fsModule)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

const TEXT = 4.5
const UI = 3

/** Text tokens shown on the page background or the muted background. */
const textTokens = [
  'foreground',
  'muted-foreground',
  'link',
  'destructive',
  'tag-evidence',
  'tag-summary',
  'tag-simulated',
  'secondary-foreground',
]
/** Borders a reader needs to see to use a control: input borders and the focus ring. */
const uiTokens = ['input', 'ring']

for (const [name, selector] of [['light', ':root'], ['dark', '.dark']] as const) {
  describe(`${name} theme tokens`, () => {
    const tk = parseTokens(css, selector)
    const pageBgs = [tk.background, tk.muted, tk.secondary]
    const wm = tk.watermark
    const wmOpacity = Number(tk['watermark-opacity'])
    // Every color a pixel of the hero can have: both ends of the gradient,
    // and the pattern over each end.
    const patternOpacity = Number(tk['hero-pattern-opacity'])
    const heroBgs = [tk['hero-from'], tk['hero-to']].flatMap((c) => [c, blend(tk['hero-pattern'], c, patternOpacity)])

    it('has a visible but light watermark', () => {
      expect(wmOpacity).toBeGreaterThan(0)
      expect(wmOpacity).toBeLessThanOrEqual(0.1)
      // The watermark text must show in a screenshot: some contrast with the page.
      expect(contrastRatio(blend(wm, tk.background, wmOpacity), tk.background)).toBeGreaterThan(1.05)
    })

    for (const token of textTokens) {
      it(`--${token} passes AA on the page backgrounds, also under the watermark`, () => {
        for (const bg of pageBgs) {
          expect(contrastRatio(tk[token], bg)).toBeGreaterThanOrEqual(TEXT)
          expect(worstContrast(tk[token], bg, wm, wmOpacity)).toBeGreaterThanOrEqual(TEXT)
        }
      })
    }

    for (const token of uiTokens) {
      it(`--${token} passes 3:1 on the page backgrounds, also under the watermark`, () => {
        for (const bg of pageBgs) expect(worstContrast(tk[token], bg, wm, wmOpacity)).toBeGreaterThanOrEqual(UI)
      })
    }

    // The 資料根據 bar (CellBasis.tsx). Each segment must show on the page
    // background: 3:1, the rule for parts of a graphic.
    it('資料根據 bar segments pass 3:1 on the page backgrounds, also under the watermark', () => {
      for (const token of ['tag-evidence', 'tag-summary', 'tag-simulated', 'muted-foreground']) {
        for (const bg of pageBgs) expect(worstContrast(tk[token], bg, wm, wmOpacity)).toBeGreaterThanOrEqual(UI)
      }
    })

    it('hero text passes AA on every hero color, also under the watermark', () => {
      for (const bg of heroBgs) {
        expect(worstContrast(tk['hero-foreground'], bg, wm, wmOpacity)).toBeGreaterThanOrEqual(TEXT)
      }
    })

    it('has no tokens of the removed notice box', () => {
      expect(tk.notice).toBeUndefined()
      expect(tk['notice-border']).toBeUndefined()
    })
  })
}
