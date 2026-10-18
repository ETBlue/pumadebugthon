import { describe, expect, it } from 'vitest'
import { blend, contrastRatio, parseHex, worstContrast } from './contrast'

describe('parseHex', () => {
  it('reads #rrggbb and #rgb', () => {
    expect(parseHex('#fdf6e3')).toEqual([253, 246, 227])
    expect(parseHex('#fff')).toEqual([255, 255, 255])
  })

  it('throws on a value that is not a hex color', () => {
    expect(() => parseHex('red')).toThrow()
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white, in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
  })

  it('matches the known value of base02 on base3', () => {
    expect(contrastRatio('#073642', '#fdf6e3')).toBeCloseTo(12.05, 1)
  })
})

describe('blend', () => {
  it('returns the bottom color at opacity 0 and the top color at 1', () => {
    expect(blend('#000000', '#ffffff', 0)).toBe('#ffffff')
    expect(blend('#000000', '#ffffff', 1)).toBe('#000000')
  })

  it('mixes the sRGB channels like CSS opacity', () => {
    expect(blend('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('worstContrast', () => {
  it('is the plain ratio when the overlay is fully clear', () => {
    expect(worstContrast('#073642', '#fdf6e3', '#000000', 0)).toBeCloseTo(12.05, 1)
  })

  it('is lower than the plain ratio under a visible overlay', () => {
    const plain = contrastRatio('#073642', '#fdf6e3')
    expect(worstContrast('#073642', '#fdf6e3', '#073642', 0.1)).toBeLessThan(plain)
  })

  it('takes the lowest of: overlay on the background only, on the text only, on both', () => {
    const text = '#073642'
    const bg = '#fdf6e3'
    const over = '#859900'
    const a = 0.2
    const cases = [
      contrastRatio(text, blend(over, bg, a)),
      contrastRatio(blend(over, text, a), bg),
      contrastRatio(blend(over, text, a), blend(over, bg, a)),
    ]
    expect(worstContrast(text, bg, over, a)).toBeCloseTo(Math.min(...cases), 10)
  })
})
