import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile, IssueSummary, Stakeholder } from '@/types'
import {
  availableIssues, focusOptions, isParticipantIssue, issueNumberTitle, sharedForCard, sharedStakeholders, spaceTypeNames, usedSpaceTypes,
} from './issues'

const index = indexJson as IndexFile

const person = (id: string, issues: number[], extra: Partial<Stakeholder> = {}): Stakeholder => ({
  id, name: id, path: 'res', focus: [], issues, movedTo: null, added: '2026-10-18', ...extra,
})

describe('availableIssues', () => {
  it('returns the analyzed issues by number', () => {
    expect(availableIssues(index).map((i) => i.number)).toEqual([1, 2, 8, 9])
  })
})

describe('isParticipantIssue', () => {
  it('is true only for an issue that a participant added (來源 參加者補充)', () => {
    const byNumber = (n: number) => index.issues.find((i) => i.number === n)!
    expect(isParticipantIssue(byNumber(8))).toBe(true)
    expect(isParticipantIssue(byNumber(9))).toBe(true)
    for (const n of [1, 2, 3, 4, 5, 6]) expect(isParticipantIssue(byNumber(n))).toBe(false)
  })
})

describe('issueNumberTitle', () => {
  it('gives 「#n 標題」 from the issue list (decision 112)', () => {
    expect(issueNumberTitle(index.issues, 2)).toBe('#2 找回消失的垃圾桶')
    // An issue that is 製作中 still has its title.
    expect(issueNumberTitle(index.issues, 3)).toBe(`#3 ${index.issues.find((i) => i.number === 3)!.title}`)
  })

  it('gives only 「#n」 when the issue is not in the list', () => {
    expect(issueNumberTitle(index.issues, 99)).toBe('#99')
    expect(issueNumberTitle([], 1)).toBe('#1')
  })
})

describe('sharedForCard', () => {
  const byNumber = (n: number) => index.issues.find((i) => i.number === n)!

  it('gives the shared stakeholders of an analyzed issue when 2 or more issues are analyzed', () => {
    expect(sharedForCard(index, byNumber(2))).toMatchObject({ count: 15, issues: [1, 8, 9] })
    expect(sharedForCard(index, byNumber(9))).toMatchObject({ count: 6, issues: [1, 2, 8] })
  })

  it('gives the other issues with their titles, for the card text (decision 112)', () => {
    expect(sharedForCard(index, byNumber(2))?.titles).toEqual([
      '#1 把三千棵樹種回來', '#8 無菸城市', '#9 將產品探索技巧運用到政策前期研究',
    ])
  })

  it('is null for an issue that is 製作中', () => {
    expect(sharedForCard(index, byNumber(3))).toBeNull()
  })

  it('is null when fewer than 2 issues are analyzed', () => {
    const one: IndexFile = { ...index, issues: index.issues.map((i) => (i.number === 2 ? i : { ...i, available: false }) as IssueSummary) }
    expect(sharedForCard(one, byNumber(2))).toBeNull()
  })
})

describe('sharedStakeholders', () => {
  it('counts the stakeholders of an issue that are also in another issue', () => {
    // #9 shares O06, O07, I04, I05, I06 and I27 with the other issues.
    expect(sharedStakeholders(index.stakeholders, 2)).toEqual({ count: 15, issues: [1, 8, 9] })
    expect(sharedStakeholders(index.stakeholders, 1)).toEqual({ count: 13, issues: [2, 8, 9] })
    expect(sharedStakeholders(index.stakeholders, 8)).toEqual({ count: 15, issues: [1, 2, 9] })
    expect(sharedStakeholders(index.stakeholders, 9)).toEqual({ count: 6, issues: [1, 2, 8] })
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
    expect(new Set(codes)).toEqual(new Set(['sidewalk', 'arcade', 'bus-stop', 'park', 'mrt-exit', 'indoor', 'utility', 'bike-lane']))
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

describe('focusOptions', () => {
  it('lists the 特別關注 values in use, in the design order', () => {
    expect(focusOptions(index.stakeholders)).toEqual(['高齡', '身心障礙', '呼吸道疾病', '兒童與照顧者', '外籍', '經濟弱勢'])
  })

  it('puts 呼吸道疾病 right after 身心障礙 (owner decision 2026-10-18)', () => {
    const list = [person('I01', [8], { focus: ['外籍', '呼吸道疾病'] }), person('I02', [1], { focus: ['身心障礙'] })]
    expect(focusOptions(list)).toEqual(['身心障礙', '呼吸道疾病', '外籍'])
  })

  it('puts unknown values last and skips moved IDs', () => {
    const list = [
      person('I01', [1], { focus: ['新類別', '外籍'] }),
      person('O02', [], { focus: ['高齡'], movedTo: 'I12' }),
    ]
    expect(focusOptions(list)).toEqual(['外籍', '新類別'])
  })

  it('skips a stakeholder with no issue (decision 78)', () => {
    const list = [person('I01', [1], { focus: ['外籍'] }), person('I34', [], { focus: ['高齡'] })]
    expect(focusOptions(list)).toEqual(['外籍'])
  })
})
