import { describe, expect, it } from 'vitest'
import { FOCUS_PARAM, focusElementId } from './focus'

describe('focusElementId', () => {
  it('uses the parameter name focus', () => {
    expect(FOCUS_PARAM).toBe('focus')
  })

  it('accepts the two section names', () => {
    expect(focusElementId('conflicts')).toBe('focus-conflicts')
    expect(focusElementId('stakeholders')).toBe('focus-stakeholders')
  })

  it('accepts a conflict, a W group and an N group', () => {
    expect(focusElementId('C1')).toBe('focus-C1')
    expect(focusElementId('C12')).toBe('focus-C12')
    expect(focusElementId('W08')).toBe('focus-W08')
    expect(focusElementId('N01')).toBe('focus-N01')
  })

  it('accepts a story ID (a want or a need with no group)', () => {
    expect(focusElementId('I06-US01')).toBe('focus-I06-US01')
    expect(focusElementId('O10-US12')).toBe('focus-O10-US12')
  })

  it('returns null for anything else', () => {
    for (const v of [
      null,
      '',
      'nope',
      'Conflicts',
      'C',
      'c1',
      'W8',
      'W123',
      'N1',
      'X-N01',
      'X-C1',
      'I06',
      'I06-US',
      'I06-US01 ',
      '<script>',
      'overview',
    ]) {
      expect(focusElementId(v)).toBeNull()
    }
  })
})
