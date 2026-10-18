import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile, IssueSummary, Stakeholder } from '@/types'
import { availableIssues, filterIssuesBySpace, focusOptions, sharedStakeholders, spaceTypeNames, usedSpaceTypes } from './issues'

const index = indexJson as IndexFile

const person = (id: string, issues: number[], extra: Partial<Stakeholder> = {}): Stakeholder => ({
  id, name: id, path: 'res', focus: [], issues, movedTo: null, ...extra,
})

describe('availableIssues', () => {
  it('returns the analyzed issues by number', () => {
    expect(availableIssues(index).map((i) => i.number)).toEqual([1, 2])
  })
})

describe('sharedStakeholders', () => {
  it('counts the stakeholders of #2 that are also in #1', () => {
    expect(sharedStakeholders(index.stakeholders, 2)).toEqual({ count: 11, issues: [1] })
    expect(sharedStakeholders(index.stakeholders, 1)).toEqual({ count: 11, issues: [2] })
  })

  it('leaves out moved IDs and lists other issues in number order', () => {
    const list = [
      person('I01', [5, 2]),
      person('I02', [2, 3, 1]),
      person('I03', [2]),
      person('O02', [2, 4], { movedTo: 'I12' }),
    ]
    expect(sharedStakeholders(list, 2)).toEqual({ count: 2, issues: [1, 3, 5] })
  })

  it('returns 0 for an issue with no shared stakeholders', () => {
    expect(sharedStakeholders([person('I01', [2])], 2)).toEqual({ count: 0, issues: [] })
  })
})

describe('usedSpaceTypes', () => {
  it('lists the space types of analyzed issues, in space-types.csv order', () => {
    const codes = usedSpaceTypes(index).map((s) => s.code)
    const all = index.spaceTypes.map((s) => s.code)
    expect(new Set(codes)).toEqual(new Set(['sidewalk', 'arcade', 'park', 'mrt-exit', 'utility', 'bike-lane']))
    expect(codes).toEqual(all.filter((c) => codes.includes(c)))
  })
})

describe('spaceTypeNames', () => {
  it('gives the name of each code, and the code when it is unknown', () => {
    expect(spaceTypeNames(index.spaceTypes, ['sidewalk', 'nope'])).toEqual([
      { code: 'sidewalk', name: '人行道' },
      { code: 'nope', name: 'nope' },
    ])
  })
})

describe('filterIssuesBySpace', () => {
  it('returns every issue when no code is selected', () => {
    expect(filterIssuesBySpace(index.issues, [])).toEqual(index.issues)
  })

  it('keeps the issues that use ANY selected code, and no unavailable issue', () => {
    const numbers = (list: IssueSummary[]) => list.map((i) => i.number)
    expect(numbers(filterIssuesBySpace(index.issues, ['arcade']))).toEqual([2])
    expect(numbers(filterIssuesBySpace(index.issues, ['utility']))).toEqual([1])
    expect(numbers(filterIssuesBySpace(index.issues, ['arcade', 'utility']))).toEqual([1, 2])
    expect(numbers(filterIssuesBySpace(index.issues, ['indoor']))).toEqual([])
  })
})

describe('focusOptions', () => {
  it('lists the 特別關注 values in use, in the design order', () => {
    expect(focusOptions(index.stakeholders)).toEqual(['高齡', '身心障礙', '兒童與照顧者', '外籍', '經濟弱勢'])
  })

  it('puts unknown values last and skips moved IDs', () => {
    const list = [
      person('I01', [1], { focus: ['新類別', '外籍'] }),
      person('O02', [], { focus: ['高齡'], movedTo: 'I12' }),
    ]
    expect(focusOptions(list)).toEqual(['外籍', '新類別'])
  })
})
