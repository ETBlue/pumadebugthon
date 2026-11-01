import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { AvailableIssueSummary, CrossIssueFile, IndexFile, IssueFile, IssueSummary, Solution, Stakeholder } from '@/types'
import { recentIssues, recentSolutionItems, recentSolutions, recentStakeholders } from './recent'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile

const available = index.issues.find((i) => i.available) as AvailableIssueSummary

function issue(number: number, updated: string | null, stories = 10): AvailableIssueSummary {
  return { ...available, number, updated, counts: { ...available.counts, stories, solutions: stories } }
}

// The home blocks sort by 更新日期 (decision 131). added is fixed, so a
// test that passes cannot depend on it.
function stakeholder(id: string, updated: string, issues: number[] = [1]): Stakeholder {
  return { id, name: id, path: 'res', focus: [], issues, movedTo: null, added: '2026-10-18', updated }
}

function solution(id: string, updated: string, stories: string[] = []): Solution {
  const cell = { text: '', tag: null, pending: false }
  return {
    id, name: { text: id, tag: null, pending: false }, summary: '', spaces: [], solutionTypes: [], ownDomains: [], domains: [],
    added: '2026-10-16', updated, stories, needs: null,
    measures: [], evaluation: { laws: [cell], privacy: [cell], risks: [cell], disasters: [cell], feasibility: [cell] },
    plan: { owner: [cell], resources: [cell], cost: [cell], steps: [cell] },
    overview: { cost: cell, feasibility: cell, risk: cell, owner: cell }, ideas: [], controversies: [], legal: [], practices: [], pending: [],
  }
}

function issueFile(number: number, solutions: Solution[]): IssueFile {
  return { ...trees, number, solutions }
}

describe('recentIssues', () => {
  it('lists analyzed issues by update date, then by number, highest first', () => {
    // Built here, so the test does not depend on the dates in the fixture.
    // #1, #2 and #9 have 2026-10-21 and #8 has 2026-10-20. Inside one date the number decides.
    const list = [issue(1, '2026-10-21'), issue(8, '2026-10-20'), issue(2, '2026-10-21'), issue(9, '2026-10-21')]
    expect(recentIssues(list).map((i) => i.number)).toEqual([9, 2, 1, 8])
  })

  it('leaves out issues without an analysis', () => {
    expect(recentIssues(index.issues).every((i) => i.available)).toBe(true)
  })

  it('puts a newer date first, whatever the number', () => {
    const list = [issue(9, '2026-10-01'), issue(3, '2026-10-17'), issue(5, '2026-10-17')]
    expect(recentIssues(list).map((i) => i.number)).toEqual([5, 3, 9])
  })

  it('puts an issue with no date last', () => {
    const list = [issue(9, null), issue(1, '2026-01-01'), issue(4, null)]
    expect(recentIssues(list).map((i) => i.number)).toEqual([1, 9, 4])
  })

  it('is not changed by the counts', () => {
    const few = [issue(1, '2026-10-18', 1), issue(2, '2026-10-18', 100)]
    const many = [issue(1, '2026-10-18', 100), issue(2, '2026-10-18', 1)]
    expect(recentIssues(few).map((i) => i.number)).toEqual([2, 1])
    expect(recentIssues(many).map((i) => i.number)).toEqual([2, 1])
  })

  it('keeps only the first items when a limit is given', () => {
    const list = [issue(1, '2026-10-21'), issue(8, '2026-10-20'), issue(2, '2026-10-21'), issue(9, '2026-10-21')]
    expect(recentIssues(list, 2).map((i) => i.number)).toEqual([9, 2])
  })

  it('does not change the list it gets', () => {
    const list: IssueSummary[] = [issue(1, '2026-01-01'), issue(2, '2026-02-01')]
    recentIssues(list)
    expect(list.map((i) => i.number)).toEqual([1, 2])
  })
})

describe('recentStakeholders', () => {
  it('lists active stakeholders by update date, then by ID, highest first (decision 131)', () => {
    // In the fixture, I36, I35, I31, I27, I14 and I09 have the newest
    // 更新日期 (2026-10-21), so they come first. Inside one date the ID
    // decides: I before O, high numbers first. I34 has no issue now, so it is
    // left out (decision 78).
    const ids = recentStakeholders(index.stakeholders).map((s) => s.id)
    expect(ids.slice(0, 7)).toEqual(['I36', 'I35', 'I31', 'I27', 'I14', 'I09', 'I33'])
    // Not the order of 新增日期: by 新增日期, I33 came before I31 (the same day, a higher ID).
    const updated = recentStakeholders(index.stakeholders).map((s) => s.updated!)
    expect(updated).toEqual([...updated].sort().reverse())
  })

  it('leaves out moved IDs and stakeholders with no issue (I34)', () => {
    const ids = recentStakeholders(index.stakeholders).map((s) => s.id)
    expect(ids).not.toContain('O02')
    expect(ids).not.toContain('I34')
    expect(ids).toHaveLength(65)
  })

  it('leaves out a new stakeholder with no issue, even when it is the newest', () => {
    const list = [stakeholder('I01', '2026-10-18'), stakeholder('I02', '2026-10-21', [])]
    expect(recentStakeholders(list).map((s) => s.id)).toEqual(['I01'])
  })

  it('puts a newer date first, whatever the ID', () => {
    const list = [stakeholder('I09', '2026-10-01'), stakeholder('O01', '2026-10-17'), stakeholder('O03', '2026-10-17')]
    expect(recentStakeholders(list).map((s) => s.id)).toEqual(['O03', 'O01', 'I09'])
  })

  it('compares ID numbers as numbers', () => {
    const list = [stakeholder('I09', '2026-10-18'), stakeholder('I10', '2026-10-18')]
    expect(recentStakeholders(list).map((s) => s.id)).toEqual(['I10', 'I09'])
  })

  it('puts a stakeholder with no date last', () => {
    const list = [stakeholder('I09', ''), stakeholder('I01', '2026-01-01')]
    expect(recentStakeholders(list).map((s) => s.id)).toEqual(['I01', 'I09'])
  })

  it('is not changed by the number of issues', () => {
    const few = [stakeholder('I01', '2026-10-18', [1, 2, 8]), stakeholder('I02', '2026-10-18', [2])]
    const many = [stakeholder('I01', '2026-10-18', [2]), stakeholder('I02', '2026-10-18', [1, 2, 8])]
    expect(recentStakeholders(few).map((s) => s.id)).toEqual(['I02', 'I01'])
    expect(recentStakeholders(many).map((s) => s.id)).toEqual(['I02', 'I01'])
  })

  it('keeps only the first items when a limit is given', () => {
    expect(recentStakeholders(index.stakeholders, 3).map((s) => s.id)).toEqual(['I36', 'I35', 'I31'])
  })
})

describe('recentSolutions', () => {
  const key = (x: { issueNumber: number; solution: Solution }) => `${x.issueNumber}${x.solution.id}`

  it('lists solutions by update date, then issue number, then code number, highest first (decision 131)', () => {
    // Every solution in the fixture has the 更新日期 2026-10-22, so the issue
    // number and the code decide. #2 S1 to S4 were added earlier (2026-10-16),
    // but the 新增日期 is not used any more.
    expect(recentSolutions([trees, trashcans, smokefree]).map(key)).toEqual([
      '8S5', '8S4', '8S3', '8S2', '8S1', '2S5', '2S4', '2S3', '2S2', '2S1', '1S5', '1S4', '1S3', '1S2', '1S1',
    ])
  })

  it('puts a newer update date first, whatever the 新增日期', () => {
    const older = { ...solution('S1', '2026-10-20'), added: '2026-10-19' }
    const newer = { ...solution('S2', '2026-10-22'), added: '2026-10-01' }
    expect(recentSolutions([issueFile(3, [older, newer])]).map(key)).toEqual(['3S2', '3S1'])
  })

  it('does not depend on the order of the issue files', () => {
    expect(recentSolutions([smokefree, trees, trashcans]).map(key)).toEqual(
      recentSolutions([trees, trashcans, smokefree]).map(key),
    )
  })

  it('puts a solution with no date last', () => {
    const list = [issueFile(3, [solution('S1', ''), solution('S2', '2026-01-01')])]
    expect(recentSolutions(list).map(key)).toEqual(['3S2', '3S1'])
  })

  it('is not changed by the number of stories', () => {
    const few = [issueFile(3, [solution('S1', '2026-10-18', ['a', 'b', 'c']), solution('S2', '2026-10-18', [])])]
    const many = [issueFile(3, [solution('S1', '2026-10-18', []), solution('S2', '2026-10-18', ['a', 'b', 'c'])])]
    expect(recentSolutions(few).map(key)).toEqual(['3S2', '3S1'])
    expect(recentSolutions(many).map(key)).toEqual(['3S2', '3S1'])
  })

  it('keeps only the first items when a limit is given', () => {
    expect(recentSolutions([trees, trashcans, smokefree], 2).map(key)).toEqual(['8S5', '8S4'])
  })

  it('compares the number of the code as a number on the same date (decision 151)', () => {
    // 12 solutions: text order would put S10, S11 and S12 between S1 and S2.
    const list = [issueFile(3, Array.from({ length: 12 }, (_, i) => solution(`S${i + 1}`, '2026-10-18')))]
    expect(recentSolutions(list).map(key)).toEqual(Array.from({ length: 12 }, (_, i) => `3S${12 - i}`))
  })
})

describe('recentSolutionItems', () => {
  const cross = crossJson as CrossIssueFile
  const key = (x: ReturnType<typeof recentSolutionItems>[number]) =>
    x.kind === 'cross' ? x.solution.code : `${x.issueNumber}${x.solution.id}`

  it('adds the cross-issue solutions by their update date (decisions 51 and 131)', () => {
    // X-S1 to X-S5 have the same 更新日期 (2026-10-22) as the issue solutions,
    // so they come first.
    expect(recentSolutionItems([trees, trashcans, smokefree], cross, 7).map(key)).toEqual([
      'X-S5', 'X-S4', 'X-S3', 'X-S2', 'X-S1', '8S5', '8S4',
    ])
  })

  it('puts the cross-issue solutions first on the same date', () => {
    const sameDay: CrossIssueFile = { ...cross, solutions: cross.solutions.map((s) => ({ ...s, updated: '2026-10-22' })) }
    expect(recentSolutionItems([smokefree], sameDay, 7).map(key)).toEqual(['X-S5', 'X-S4', 'X-S3', 'X-S2', 'X-S1', '8S5', '8S4'])
  })

  it('orders 10 or more cross-issue solutions of the same date by number (decision 151)', () => {
    const many: CrossIssueFile = {
      ...cross,
      solutions: Array.from({ length: 12 }, (_, i) => ({ ...cross.solutions[0], code: `X-S${i + 1}`, updated: '2026-10-22' })),
    }
    expect(recentSolutionItems([], many).map(key)).toEqual(Array.from({ length: 12 }, (_, i) => `X-S${12 - i}`))
  })

  it('is the issue solutions only without the file', () => {
    expect(recentSolutionItems([trees, trashcans, smokefree], null, 3).map(key)).toEqual(['8S5', '8S4', '8S3'])
  })
})
