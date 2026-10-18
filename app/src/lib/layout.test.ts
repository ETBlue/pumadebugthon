import { describe, expect, it } from 'vitest'
import { isFullWidth } from './layout'

describe('isFullWidth', () => {
  it('is true when a matched route has handle.fullWidth', () => {
    expect(isFullWidth([{ handle: undefined }, { handle: { fullWidth: true } }])).toBe(true)
  })

  it('is false for routes without the flag', () => {
    expect(isFullWidth([{ handle: undefined }, { handle: { other: 1 } }])).toBe(false)
    expect(isFullWidth([{ handle: { fullWidth: 'yes' } }])).toBe(false)
    expect(isFullWidth([])).toBe(false)
  })
})
