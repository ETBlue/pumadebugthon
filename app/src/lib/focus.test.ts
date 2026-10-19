import { describe, expect, it } from 'vitest'
import { FOCUS_PARAM, FOCUS_WAIT_MS, focusElementId, focusScrollBehavior, shouldFocusJump, type FocusVisit } from './focus'

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

describe('focusScrollBehavior', () => {
  it('jumps with no animation when the user asks for reduced motion', () => {
    expect(focusScrollBehavior(true)).toBe('auto')
  })

  it('scrolls smoothly otherwise', () => {
    expect(focusScrollBehavior(false)).toBe('smooth')
  })
})

describe('FOCUS_WAIT_MS', () => {
  it('waits a few seconds at most for the content', () => {
    expect(FOCUS_WAIT_MS).toBeGreaterThanOrEqual(1000)
    expect(FOCUS_WAIT_MS).toBeLessThanOrEqual(10000)
  })
})

describe('shouldFocusJump', () => {
  const visit = (over: Partial<FocusVisit> = {}): FocusVisit => ({
    key: 'a', pathname: '/issues/2/wants', search: '?focus=C6', elementId: 'focus-C6', ...over,
  })

  it('jumps on the first visit with a valid value', () => {
    expect(shouldFocusJump(null, visit(), 'POP')).toBe(true)
  })

  it('never jumps without a valid value', () => {
    expect(shouldFocusJump(null, visit({ elementId: null }), 'PUSH')).toBe(false)
  })

  it('does not jump again on a re-render with the same location', () => {
    expect(shouldFocusJump(visit(), visit(), 'PUSH')).toBe(false)
  })

  it('jumps when the target or the path changes', () => {
    expect(shouldFocusJump(visit(), visit({ key: 'b', search: '?focus=C1', elementId: 'focus-C1' }), 'PUSH')).toBe(true)
    expect(shouldFocusJump(visit(), visit({ key: 'b', pathname: '/issues/1/wants' }), 'REPLACE')).toBe(true)
  })

  it('jumps for a new target typed in the address bar (the location key stays "default")', () => {
    const a = visit({ key: 'default' })
    expect(shouldFocusJump(a, visit({ key: 'default', search: '?focus=C1', elementId: 'focus-C1' }), 'POP')).toBe(true)
  })

  it('jumps again when the same link is clicked twice (React Router then replaces the same URL)', () => {
    expect(shouldFocusJump(visit(), visit({ key: 'b' }), 'REPLACE')).toBe(true)
    expect(shouldFocusJump(visit(), visit({ key: 'b' }), 'PUSH')).toBe(true)
  })

  it('does not jump when the data toggle replaces the URL with another search', () => {
    expect(shouldFocusJump(visit(), visit({ key: 'b', search: '?focus=C6&evidence=1' }), 'REPLACE')).toBe(false)
  })
})
