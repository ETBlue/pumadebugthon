import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile } from '@/types'
import type { Stakeholder } from '@/types'
import { compareIds } from './ids'
import { isListed } from './stakeholders'
import {
  clearFiltersSearch, filterStatusParts, keptSearch, menuIdsFor, sideBarFiltersOf, SPECIAL_PARAM,
  issueSpecialOptions, specialStakeholderIds, specialOptions, STAKEHOLDER_PARAM, stakeholderFilterOf, stakeholderMenuSearch,
  withSpecialFilter, withStakeholderFilter, type SideBarFilters,
} from './stakeholderFilter'
import { FOCUS_ORDER } from './issues'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'

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

  it('a moved ID turns the filter off; it does not become the new ID (decision 113)', () => {
    expect(issueIds).toContain('I12')
    expect(of('stakeholder=O02')).toBeNull()
    expect(of('stakeholder=I12')).toBe('I12')
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

  it('also keeps every special value, and drops the old cross (decisions 75 and 94)', () => {
    expect(keptSearch(new URLSearchParams('special=高齡&pick=W08&cross=1&special=外籍&from=O02'))).toBe(
      `?special=${encodeURIComponent('高齡')}&special=${encodeURIComponent('外籍')}`,
    )
    expect(keptSearch(new URLSearchParams('evidence=1&cross=1&stakeholder=I06'))).toBe('?evidence=1&stakeholder=I06')
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
  const of = (search: string) => sideBarFiltersOf(new URLSearchParams(search))

  it('reads the two side bar filters, and ignores the old cross', () => {
    expect(SPECIAL_PARAM).toBe('special')
    expect(of('')).toEqual({ dataBasedOnly: false, special: [] })
    expect(of(`evidence=1&cross=1&special=${enc('高齡')}`)).toEqual({ dataBasedOnly: true, special: ['高齡'] })
  })

  it('only "1" turns evidence on', () => {
    expect(of('evidence=0')).toEqual({ dataBasedOnly: false, special: [] })
  })

  it('puts special in FOCUS_ORDER, each once, and drops unknown values', () => {
    const search = ['經濟弱勢', 'nope', '高齡', '外籍', '高齡', ''].map((v) => `special=${enc(v)}`).join('&')
    expect(of(search).special).toEqual(['高齡', '外籍', '經濟弱勢'])
  })
})

describe('menuIdsFor', () => {
  // Every listed stakeholder, in ID order.
  const ids = index.stakeholders.filter(isListed).map((x) => x.id).sort(compareIds)
  const filters = (f: Partial<SideBarFilters>): SideBarFilters => ({ dataBasedOnly: false, special: [], ...f })
  const s = (id: string) => index.stakeholders.find((x) => x.id === id) as Stakeholder

  it('keeps every ID, in ID order, with no filter', () => {
    expect(menuIdsFor([...ids].reverse(), index.stakeholders, filters({}), null)).toEqual(ids)
  })

  it('the data filter does not change the list', () => {
    expect(menuIdsFor(ids, index.stakeholders, filters({ dataBasedOnly: true }), null)).toEqual(ids)
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

  it('always keeps the current stakeholder', () => {
    const out = menuIdsFor(ids, index.stakeholders, filters({ special: ['外籍'] }), 'O08')
    expect(out).toContain('O08')
    expect(out).toEqual([...out].sort(compareIds))
    // Also when it is not in the list it gets.
    expect(menuIdsFor(['I01'], index.stakeholders, filters({}), 'I06')).toEqual(['I01', 'I06'])
  })

  it('an unknown ID stays with no filter, and goes with special on', () => {
    expect(menuIdsFor(['I99', 'I06'], index.stakeholders, filters({}), null)).toEqual(['I06', 'I99'])
    expect(menuIdsFor(['I99', 'I06'], index.stakeholders, filters({ special: ['身心障礙'] }), null)).toEqual(['I06'])
  })
})

describe('clearFiltersSearch', () => {
  const clear = (search: string) => clearFiltersSearch(new URLSearchParams(search))

  it('removes stakeholder, evidence and special', () => {
    expect(clear(`stakeholder=I06&evidence=1&special=${enc('高齡')}&special=${enc('外籍')}`)).toBe('')
  })

  it('keeps the other values', () => {
    expect(clear('pick=W08&evidence=1&stakeholder=I06')).toBe('?pick=W08')
    expect(clear('')).toBe('')
  })
})

describe('filterStatusParts', () => {
  const filters = (f: Partial<SideBarFilters>): SideBarFilters => ({ dataBasedOnly: false, special: [], ...f })
  const i06 = index.stakeholders.find((x) => x.id === 'I06') as Stakeholder

  it('is empty when no filter is on', () => {
    expect(filterStatusParts(filters({}), null)).toEqual([])
  })

  it('lists the filters that are on: stakeholder, data, special', () => {
    expect(filterStatusParts(filters({ dataBasedOnly: true, special: ['高齡', '外籍'] }), i06)).toEqual([
      { kind: 'stakeholder', id: 'I06', name: '身心障礙者（視障、輪椅使用者）' },
      { kind: 'dataBased' },
      { kind: 'special', groups: ['高齡', '外籍'] },
    ])
  })

  it('shows only the filters that are on', () => {
    expect(filterStatusParts(filters({ dataBasedOnly: true }), i06)).toEqual([
      { kind: 'stakeholder', id: 'I06', name: i06.name },
      { kind: 'dataBased' },
    ])
    expect(filterStatusParts(filters({ special: ['高齡'] }), null)).toEqual([{ kind: 'special', groups: ['高齡'] }])
  })
})

describe('withSpecialFilter', () => {
  it('writes the groups in FOCUS_ORDER, each once, and keeps other values', () => {
    const next = withSpecialFilter(new URLSearchParams('special=外籍&evidence=1'), ['外籍', '高齡', '高齡'])
    expect(next.getAll(SPECIAL_PARAM)).toEqual(['高齡', '外籍'])
    expect(next.get('evidence')).toBe('1')
  })

  it('drops unknown groups, and an empty list removes the value', () => {
    expect(withSpecialFilter(new URLSearchParams('special=高齡'), ['不明']).getAll(SPECIAL_PARAM)).toEqual([])
    expect(withSpecialFilter(new URLSearchParams('special=高齡&evidence=1'), []).toString()).toBe('evidence=1')
  })
})

describe('specialOptions', () => {
  it('lists the groups of FOCUS_ORDER that a stakeholder has, in that order', () => {
    const ss = index.stakeholders
    const used = new Set(ss.filter((s) => s.movedTo === null && s.issues.length > 0).flatMap((s) => s.focus))
    const options = specialOptions(ss)
    expect(options).toEqual(FOCUS_ORDER.filter((f) => used.has(f)))
    expect(options.length).toBeGreaterThan(0)
  })

  it('leaves out unknown groups and moved stakeholders', () => {
    const base = index.stakeholders[0]
    const ss: Stakeholder[] = [
      { ...base, id: 'I90', focus: ['外籍', '不明'], movedTo: null },
      { ...base, id: 'I91', focus: ['高齡'], movedTo: 'I90' },
    ]
    expect(specialOptions(ss)).toEqual(['外籍'])
  })

  it('leaves out a stakeholder with no issue (decision 78)', () => {
    const base = index.stakeholders[0]
    const ss: Stakeholder[] = [
      { ...base, id: 'I90', focus: ['外籍'], issues: [1], movedTo: null },
      { ...base, id: 'I91', focus: ['高齡'], issues: [], movedTo: null },
    ]
    expect(specialOptions(ss)).toEqual(['外籍'])
  })
})

describe('issueSpecialOptions', () => {
  const idsOf = (issue: IssueFile) => issue.stakeholders.map((s) => s.id)
  const options = (issue: IssueFile) => issueSpecialOptions(idsOf(issue), index.stakeholders)

  it('lists only the groups that a stakeholder of the issue has, in FOCUS_ORDER', () => {
    expect(options(treesJson as IssueFile)).toEqual(['高齡', '身心障礙', '兒童與照顧者', '經濟弱勢'])
    expect(options(trashcans)).toEqual(['高齡', '身心障礙', '兒童與照顧者', '外籍', '經濟弱勢'])
    expect(options(smokefreeJson as IssueFile)).toEqual([...FOCUS_ORDER])
    expect(options(policyJson as IssueFile)).toEqual([...FOCUS_ORDER])
  })

  it('is empty when no stakeholder of the issue has a group, and ignores unknown IDs', () => {
    expect(issueSpecialOptions([], index.stakeholders)).toEqual([])
    expect(issueSpecialOptions(['I99'], index.stakeholders)).toEqual([])
  })
})

describe('menuIdsFor on the issue page (decision 75)', () => {
  const filters = (special: string[]): SideBarFilters => ({ dataBasedOnly: false, special })

  it('特別關注 limits the menu to the stakeholders of the issue with a picked group', () => {
    expect(menuIdsFor(issueIds, index.stakeholders, filters(['外籍']), null)).toEqual(['I03', 'I04'])
    expect(menuIdsFor(issueIds, index.stakeholders, filters(['高齡', '身心障礙']), null)).toEqual(['I05', 'I06', 'I11'])
  })

  it('keeps the picked stakeholder (?stakeholder=) in the menu', () => {
    expect(menuIdsFor(issueIds, index.stakeholders, filters(['外籍']), 'O08')).toEqual(['O08', 'I03', 'I04'].sort(compareIds))
  })
})

describe('specialStakeholderIds', () => {
  it('is null when no group is picked (the filter is off)', () => {
    expect(specialStakeholderIds(issueIds, index.stakeholders, [])).toBeNull()
  })

  it('gives the stakeholders of the issue with one of the picked groups', () => {
    expect([...specialStakeholderIds(issueIds, index.stakeholders, ['外籍'])!].sort(compareIds)).toEqual(['I03', 'I04'])
    expect([...specialStakeholderIds(issueIds, index.stakeholders, ['高齡', '身心障礙'])!].sort(compareIds)).toEqual(['I05', 'I06', 'I11'])
  })

  it('is an empty set when no stakeholder of the issue has the group', () => {
    const trees = (treesJson as IssueFile).stakeholders.map((x) => x.id)
    expect(specialStakeholderIds(trees, index.stakeholders, ['外籍'])!.size).toBe(0)
  })
})
