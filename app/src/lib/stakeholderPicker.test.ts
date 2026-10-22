import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { compareIds } from './ids'
import {
  CLOSED_PICKER, pickerKey, pickerOptionIds, pickerOptions, whoSearch, type PickerState,
} from './stakeholderPicker'
import { isListed } from './stakeholders'

const index = indexJson as IndexFile
const all = index.stakeholders
const ids = (q: string) => pickerOptionIds(pickerOptions(all, q))

describe('pickerOptions', () => {
  it('gives every listed stakeholder for an empty query, 組織 then 個人, each in ID order', () => {
    const groups = pickerOptions(all, '')
    expect(groups.map((g) => g.root)).toEqual(['O', 'I'])
    const listed = all.filter(isListed)
    expect(pickerOptionIds(groups)).toHaveLength(listed.length)
    expect(groups[0].options.every((s) => s.id.startsWith('O'))).toBe(true)
    expect(groups[1].options.every((s) => s.id.startsWith('I'))).toBe(true)
    for (const g of groups) {
      const got = g.options.map((s) => s.id)
      expect(got).toEqual([...got].sort(compareIds))
    }
  })

  it('leaves out moved and issue-less stakeholders (isListed)', () => {
    // O02 moved to I12. I34 has no issue.
    expect(ids('')).not.toContain('O02')
    expect(ids('')).not.toContain('I34')
    expect(ids('O02')).toEqual([])
  })

  it('with ids, gives only those stakeholders, in ID order, and still filters by the query (decision 116)', () => {
    const own = ['I06', 'O14', 'I01', 'O01', 'I06']
    expect(pickerOptionIds(pickerOptions(all, '', own))).toEqual(['O01', 'O14', 'I01', 'I06'])
    expect(pickerOptionIds(pickerOptions(all, 'i0', own))).toEqual(['I01', 'I06'])
    // An ID that is not in ids is never an option.
    expect(pickerOptionIds(pickerOptions(all, 'I05', own))).toEqual([])
  })

  it('a query of only spaces or 「#」 gives the whole list', () => {
    expect(ids('   ')).toEqual(ids(''))
    expect(ids('#')).toEqual(ids(''))
  })

  it('matches a part of the ID, in any case', () => {
    expect(ids('i06')).toEqual(['I06'])
    expect(ids('I06')).toEqual(['I06'])
    expect(ids('Ｉ０６')).toEqual(['I06'])
    const i0 = ids('i0')
    expect(i0.length).toBeGreaterThan(1)
    expect(i0.every((id) => id.startsWith('I0'))).toBe(true)
  })

  it('matches a part of the name, and keeps the two groups in ID order', () => {
    expect(ids('身心')).toEqual(['I06'])
    // 清潔 is in O03, O04, I09 and I13.
    const groups = pickerOptions(all, '清潔')
    expect(groups.map((g) => g.root)).toEqual(['O', 'I'])
    expect(pickerOptionIds(groups)).toEqual(['O03', 'O04', 'I09', 'I13'])
  })

  it('leaves out a group with no match', () => {
    const groups = pickerOptions(all, '身心')
    expect(groups.map((g) => g.root)).toEqual(['I'])
    expect(pickerOptions(all, '火箭')).toEqual([])
  })
})

describe('pickerKey', () => {
  const options = ['O01', 'O03', 'I06']
  const open = (active: string | null): PickerState => ({ open: true, active, text: '' })

  it('Down opens a closed list on the first option', () => {
    expect(pickerKey(CLOSED_PICKER, 'ArrowDown', options).state).toEqual(open('O01'))
  })

  it('Up opens a closed list on the last option', () => {
    expect(pickerKey(CLOSED_PICKER, 'ArrowUp', options).state).toEqual(open('I06'))
  })

  it('Down and Up move the active option, and wrap at the ends', () => {
    expect(pickerKey(open('O01'), 'ArrowDown', options).state.active).toBe('O03')
    expect(pickerKey(open('I06'), 'ArrowDown', options).state.active).toBe('O01')
    expect(pickerKey(open('O03'), 'ArrowUp', options).state.active).toBe('O01')
    expect(pickerKey(open('O01'), 'ArrowUp', options).state.active).toBe('I06')
    // An open list with no active option starts at the ends.
    expect(pickerKey(open(null), 'ArrowDown', options).state.active).toBe('O01')
    expect(pickerKey(open(null), 'ArrowUp', options).state.active).toBe('I06')
  })

  it('Down with no options opens the list (for the no-match line) with no active option', () => {
    expect(pickerKey(CLOSED_PICKER, 'ArrowDown', []).state).toEqual(open(null))
  })

  it('Enter picks the active option and closes the list', () => {
    const step = pickerKey({ open: true, active: 'O03', text: '清潔' }, 'Enter', options)
    expect(step.pick).toBe('O03')
    expect(step.state.open).toBe(false)
    expect(step.state.active).toBeNull()
  })

  it('Enter with no active option, or on a closed list, picks nothing', () => {
    expect(pickerKey(open(null), 'Enter', options).pick).toBeNull()
    expect(pickerKey({ open: false, active: null, text: 'x' }, 'Enter', options)).toEqual({
      state: { open: false, active: null, text: 'x' },
      pick: null,
    })
  })

  it('Enter does not pick an active option that is not in the list any more', () => {
    expect(pickerKey(open('I99'), 'Enter', options).pick).toBeNull()
  })

  it('Escape closes an open list and keeps the text', () => {
    const step = pickerKey({ open: true, active: 'O01', text: '清潔' }, 'Escape', options)
    expect(step).toEqual({ state: { open: false, active: null, text: '清潔' }, pick: null })
  })

  it('Escape on a closed list clears the text', () => {
    const step = pickerKey({ open: false, active: null, text: '清潔' }, 'Escape', options)
    expect(step).toEqual({ state: { open: false, active: null, text: '' }, pick: null })
  })

  it('Tab closes the list with no pick and keeps the text', () => {
    const step = pickerKey({ open: true, active: 'O03', text: '清潔' }, 'Tab', options)
    expect(step).toEqual({ state: { open: false, active: null, text: '清潔' }, pick: null })
  })
})

describe('whoSearch', () => {
  it('sets who and keeps the other params', () => {
    const params = new URLSearchParams('sort=evidence&space=sidewalk&who=I01')
    expect(whoSearch(params, 'I06')).toBe('?sort=evidence&space=sidewalk&who=I06')
  })

  it('null removes who', () => {
    expect(whoSearch(new URLSearchParams('who=I06&q=abc'), null)).toBe('?q=abc')
    expect(whoSearch(new URLSearchParams('who=I06'), null)).toBe('')
  })

  it('does not change the params it gets', () => {
    const params = new URLSearchParams('who=I06')
    whoSearch(params, null)
    expect(params.get('who')).toBe('I06')
  })
})
