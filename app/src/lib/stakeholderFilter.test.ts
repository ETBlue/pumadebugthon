import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile } from '@/types'
import {
  keptSearch, menuGroups, STAKEHOLDER_PARAM, stakeholderFilterOf, stakeholderMenuSearch, withStakeholderFilter,
} from './stakeholderFilter'

const index = indexJson as IndexFile
const trashcans = trashcansJson as IssueFile
const issueIds = trashcans.stakeholders.map((s) => s.id)

describe('stakeholderFilterOf', () => {
  const of = (search: string) => stakeholderFilterOf(new URLSearchParams(search), issueIds, index.stakeholders)

  it('reads a stakeholder of the issue', () => {
    expect(STAKEHOLDER_PARAM).toBe('stakeholder')
    expect(of('stakeholder=I06')).toBe('I06')
    expect(of('evidence=1&stakeholder=O01')).toBe('O01')
  })

  it('no value means the filter is off', () => {
    expect(of('')).toBeNull()
    expect(of('stakeholder=')).toBeNull()
  })

  it('an unknown ID, or an ID that is not in the issue, turns the filter off', () => {
    expect(of('stakeholder=I99')).toBeNull()
    expect(of('stakeholder=nope')).toBeNull()
    // I14 is a real stakeholder, but not in #2.
    expect(index.stakeholders.some((s) => s.id === 'I14')).toBe(true)
    expect(issueIds).not.toContain('I14')
    expect(of('stakeholder=I14')).toBeNull()
  })

  it('a moved ID becomes the new ID (O02 -> I12)', () => {
    expect(issueIds).toContain('I12')
    expect(of('stakeholder=O02')).toBe('I12')
  })
})

describe('withStakeholderFilter', () => {
  it('sets the filter and keeps other values', () => {
    const before = new URLSearchParams('evidence=1')
    expect(withStakeholderFilter(before, 'I06').toString()).toBe('evidence=1&stakeholder=I06')
    expect(before.toString()).toBe('evidence=1')
  })

  it('replaces the old value', () => {
    expect(withStakeholderFilter(new URLSearchParams('stakeholder=I01'), 'I06').toString()).toBe('stakeholder=I06')
  })

  it('null removes the filter (「全部利害關係人」)', () => {
    expect(withStakeholderFilter(new URLSearchParams('stakeholder=I06&evidence=1'), null).toString()).toBe('evidence=1')
  })
})

describe('keptSearch', () => {
  it('keeps evidence and stakeholder, drops pick and focus', () => {
    expect(keptSearch(new URLSearchParams('pick=W08&evidence=1&focus=C1&stakeholder=I06'))).toBe(
      '?evidence=1&stakeholder=I06',
    )
  })

  it('gives an empty string when nothing is kept', () => {
    expect(keptSearch(new URLSearchParams(''))).toBe('')
    expect(keptSearch(new URLSearchParams('pick=W08&focus=N01'))).toBe('')
  })

  it('keeps only one of the two when only one is set', () => {
    expect(keptSearch(new URLSearchParams('evidence=1&pick=W08'))).toBe('?evidence=1')
    expect(keptSearch(new URLSearchParams('focus=C1&stakeholder=O01'))).toBe('?stakeholder=O01')
  })
})

describe('menuGroups', () => {
  it('splits into 組織 (O) and 個人 (I), each in ID order', () => {
    const groups = menuGroups(['I10', 'O03', 'I02', 'O01', 'I01'], index.stakeholders)
    expect(groups.map((g) => g.group)).toEqual(['O', 'I'])
    expect(groups[0].items.map((s) => s.id)).toEqual(['O01', 'O03'])
    expect(groups[1].items.map((s) => s.id)).toEqual(['I01', 'I02', 'I10'])
    expect(groups[1].items[0].name).toBe(index.stakeholders.find((s) => s.id === 'I01')?.name)
  })

  it('uses the issue order of IDs only through compareIds, for the whole #2 list', () => {
    const groups = menuGroups(issueIds, index.stakeholders)
    expect(groups[0].items.map((s) => s.id)).toEqual(issueIds.filter((id) => id.startsWith('O')))
    expect(groups[1].items.map((s) => s.id)).toEqual(issueIds.filter((id) => id.startsWith('I')))
  })

  it('leaves out an empty group', () => {
    expect(menuGroups(['I06', 'I01'], index.stakeholders).map((g) => g.group)).toEqual(['I'])
    expect(menuGroups(['O01'], index.stakeholders).map((g) => g.group)).toEqual(['O'])
    expect(menuGroups([], index.stakeholders)).toEqual([])
  })

  it('keeps an unknown ID with the ID as its name, and lists each ID once', () => {
    const groups = menuGroups(['I99', 'I01', 'I01'], index.stakeholders)
    expect(groups[0].items.map((s) => [s.id, s.name])).toEqual([
      ['I01', index.stakeholders.find((s) => s.id === 'I01')?.name],
      ['I99', 'I99'],
    ])
  })
})

describe('stakeholderMenuSearch', () => {
  const search = (current: string, id: string | null) => stakeholderMenuSearch(new URLSearchParams(current), id)

  it('sets the stakeholder and keeps evidence=1', () => {
    expect(search('', 'I06')).toBe('?stakeholder=I06')
    expect(search('evidence=1', 'I06')).toBe('?evidence=1&stakeholder=I06')
    expect(search('evidence=1&stakeholder=I01', 'I06')).toBe('?evidence=1&stakeholder=I06')
  })

  it('removes the stakeholder for 「全部利害關係人」', () => {
    expect(search('evidence=1&stakeholder=I06', null)).toBe('?evidence=1')
    expect(search('stakeholder=I06', null)).toBe('')
  })

  it('drops pick, focus and any other value', () => {
    expect(search('pick=W08&focus=C6&from=O02&evidence=1', 'I06')).toBe('?evidence=1&stakeholder=I06')
  })
})
