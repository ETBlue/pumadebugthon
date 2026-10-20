import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile } from '@/types'
import type { Stakeholder } from '@/types'
import { compareIds } from './ids'
import { stakeholderMenuIds } from './stakeholderPage'
import {
  clearFiltersSearch, CROSS_PARAM, filterStatusParts, keptSearch, menuGroups, menuIdsFor, sideBarFiltersOf, SPECIAL_PARAM,
  STAKEHOLDER_PARAM, stakeholderFilterOf, stakeholderMenuSearch, withStakeholderFilter, type SideBarFilters,
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

  it('also keeps cross and every special value (decision 67)', () => {
    expect(keptSearch(new URLSearchParams('special=高齡&pick=W08&cross=1&special=外籍&from=O02'))).toBe(
      `?cross=1&special=${encodeURIComponent('高齡')}&special=${encodeURIComponent('外籍')}`,
    )
    expect(keptSearch(new URLSearchParams('evidence=1&cross=1&stakeholder=I06'))).toBe('?evidence=1&stakeholder=I06&cross=1')
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

const enc = encodeURIComponent

describe('sideBarFiltersOf', () => {
  const of = (search: string, page?: 'stakeholders' | 'issue') => sideBarFiltersOf(new URLSearchParams(search), page)

  it('reads the three side bar filters', () => {
    expect(CROSS_PARAM).toBe('cross')
    expect(SPECIAL_PARAM).toBe('special')
    expect(of('')).toEqual({ dataBasedOnly: false, crossIssueOnly: false, special: [] })
    expect(of(`evidence=1&cross=1&special=${enc('高齡')}`)).toEqual({
      dataBasedOnly: true, crossIssueOnly: true, special: ['高齡'],
    })
  })

  it('only "1" turns evidence and cross on', () => {
    expect(of('evidence=0&cross=yes')).toEqual({ dataBasedOnly: false, crossIssueOnly: false, special: [] })
  })

  it('puts special in FOCUS_ORDER, each once, and drops unknown values', () => {
    const search = ['經濟弱勢', 'nope', '高齡', '外籍', '高齡', ''].map((v) => `special=${enc(v)}`).join('&')
    expect(of(search).special).toEqual(['高齡', '外籍', '經濟弱勢'])
  })

  it('on the issue page, cross and special are not side bar filters', () => {
    expect(of(`evidence=1&cross=1&special=${enc('高齡')}`, 'issue')).toEqual({
      dataBasedOnly: true, crossIssueOnly: false, special: [],
    })
  })
})

describe('menuIdsFor', () => {
  const ids = stakeholderMenuIds(index)
  const filters = (f: Partial<SideBarFilters>): SideBarFilters => ({ dataBasedOnly: false, crossIssueOnly: false, special: [], ...f })
  const s = (id: string) => index.stakeholders.find((x) => x.id === id) as Stakeholder

  it('keeps every ID, in ID order, with no filter', () => {
    expect(menuIdsFor([...ids].reverse(), index.stakeholders, filters({}), null)).toEqual(ids)
  })

  it('the data filter does not change the list', () => {
    expect(menuIdsFor(ids, index.stakeholders, filters({ dataBasedOnly: true }), null)).toEqual(ids)
  })

  it('只看跨議題 keeps the stakeholders in 2 or more issues', () => {
    const out = menuIdsFor(ids, index.stakeholders, filters({ crossIssueOnly: true }), null)
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThan(ids.length)
    expect(out.every((id) => s(id).issues.length >= 2)).toBe(true)
    expect(out).toContain('I06')
    expect(out).not.toContain('O08') // only in #2
  })

  it('特別關注 keeps a stakeholder with one of the picked groups', () => {
    expect(menuIdsFor(ids, index.stakeholders, filters({ special: ['外籍'] }), null)).toEqual(
      ids.filter((id) => s(id).focus.includes('外籍')),
    )
    const two = menuIdsFor(ids, index.stakeholders, filters({ special: ['高齡', '身心障礙'] }), null)
    expect(two).toContain('I05')
    expect(two).toContain('I06')
    expect(two).toContain('I11')
    expect(two.every((id) => s(id).focus.some((f) => f === '高齡' || f === '身心障礙'))).toBe(true)
  })

  it('both filters work together', () => {
    const out = menuIdsFor(ids, index.stakeholders, filters({ crossIssueOnly: true, special: ['高齡'] }), null)
    // I11 is 高齡 but only in #2.
    expect(out).toContain('I05')
    expect(out).not.toContain('I11')
  })

  it('always keeps the current stakeholder', () => {
    const out = menuIdsFor(ids, index.stakeholders, filters({ special: ['外籍'] }), 'O08')
    expect(out).toContain('O08')
    expect(out).toEqual([...out].sort(compareIds))
    // Also when it is not in the list it gets.
    expect(menuIdsFor(['I01'], index.stakeholders, filters({}), 'I06')).toEqual(['I01', 'I06'])
  })

  it('an unknown ID stays with no filter, and goes with cross or special on', () => {
    expect(menuIdsFor(['I99', 'I06'], index.stakeholders, filters({}), null)).toEqual(['I06', 'I99'])
    expect(menuIdsFor(['I99', 'I06'], index.stakeholders, filters({ crossIssueOnly: true }), null)).toEqual(['I06'])
  })
})

describe('clearFiltersSearch', () => {
  const clear = (search: string) => clearFiltersSearch(new URLSearchParams(search))

  it('removes stakeholder, evidence, cross and special', () => {
    expect(clear(`stakeholder=I06&evidence=1&cross=1&special=${enc('高齡')}&special=${enc('外籍')}`)).toBe('')
  })

  it('keeps the other values', () => {
    expect(clear('pick=W08&evidence=1&stakeholder=I06')).toBe('?pick=W08')
    expect(clear('')).toBe('')
  })
})

describe('filterStatusParts', () => {
  const filters = (f: Partial<SideBarFilters>): SideBarFilters => ({ dataBasedOnly: false, crossIssueOnly: false, special: [], ...f })
  const i06 = index.stakeholders.find((x) => x.id === 'I06') as Stakeholder

  it('is empty when no filter is on', () => {
    expect(filterStatusParts(filters({}), null)).toEqual([])
  })

  it('lists the filters that are on: stakeholder, data, cross, special', () => {
    expect(filterStatusParts(filters({ dataBasedOnly: true, crossIssueOnly: true, special: ['高齡', '外籍'] }), i06)).toEqual([
      { kind: 'stakeholder', id: 'I06', name: '身心障礙者（視障、輪椅使用者）' },
      { kind: 'dataBased' },
      { kind: 'crossIssue' },
      { kind: 'special', groups: ['高齡', '外籍'] },
    ])
  })

  it('shows only the filters that are on', () => {
    expect(filterStatusParts(filters({ dataBasedOnly: true }), i06)).toEqual([
      { kind: 'stakeholder', id: 'I06', name: i06.name },
      { kind: 'dataBased' },
    ])
    expect(filterStatusParts(filters({ crossIssueOnly: true }), null)).toEqual([{ kind: 'crossIssue' }])
  })
})
