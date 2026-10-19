import { describe, expect, it } from 'vitest'
import { pageTitle } from './pageTitle'

describe('pageTitle', () => {
  it('is the app title alone when there are no parts', () => {
    expect(pageTitle()).toBe('市政提案小幫手')
  })

  it('puts the page parts first, then the app title', () => {
    expect(pageTitle('#2 找回消失的垃圾桶')).toBe('#2 找回消失的垃圾桶 · 市政提案小幫手')
    expect(pageTitle('#2 找回消失的垃圾桶', '解法')).toBe('#2 找回消失的垃圾桶 · 解法 · 市政提案小幫手')
  })

  it('leaves out empty parts', () => {
    expect(pageTitle('人行道', undefined, null, '')).toBe('人行道 · 市政提案小幫手')
  })
})
