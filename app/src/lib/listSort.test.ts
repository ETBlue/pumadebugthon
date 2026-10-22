import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, IndexFile, IssueFile, IssueSummary, Stakeholder } from '@/types'
import { compareShares, crossSolutionCells, evidenceShare, solutionCells, stakeholderCells, stakeholderSolutionCoverage } from './coverage'
import { compareIds } from './ids'
import { compareSolutionItems, sortIssues, sortSolutions, sortStakeholders, solutionItemKey, type ListContext } from './listSort'
import { recentIssues, recentSolutionItems, recentStakeholders, type RecentSolution } from './recent'
import { isListed } from './stakeholders'

const cross = crossJson as CrossIssueFile
const index = indexJson as IndexFile
const files = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]
const ctx: ListContext = { issues: files, cross }

const numbers = (list: IssueSummary[]) => list.map((i) => i.number)
const ids = (list: Stakeholder[]) => list.map((s) => s.id)
const keys = (list: RecentSolution[]) => list.map(solutionItemKey)

const listed = index.stakeholders.filter(isListed)
/** Every solution, in the fixed ID order: X-A…, then #1 A, #1 B, … */
const allSolutions = [...recentSolutionItems(files, cross)].sort(compareSolutionItems)

describe('sortIssues', () => {
  it('最近更新 gives the same first items as the home block, then the issues with no date in number order', () => {
    const recent = recentIssues(index.issues, 5)
    const sorted = sortIssues(index.issues, 'updated')
    expect(numbers(sorted.slice(0, recent.length))).toEqual(numbers(recent))
    expect(numbers(sorted.slice(recent.length))).toEqual([3, 4, 5, 6])
  })

  it('最近新增 uses added, newest first, ties by number highest first, no date last', () => {
    const withAdded = index.issues.map((i) =>
      i.available ? { ...i, added: i.number === 2 ? '2026-10-16' : i.number === 9 ? null : '2026-10-18' } : i,
    ) as IssueSummary[]
    expect(numbers(sortIssues(withAdded, 'added'))).toEqual([8, 1, 2, 3, 4, 5, 6, 9])
  })

  it('最近新增 with the real dates: #9 (10-20), #8 and #1 (10-18, #8 first), #2 (10-16), then #3–#6', () => {
    expect(numbers(sortIssues(index.issues, 'added'))).toEqual([9, 8, 1, 2, 3, 4, 5, 6])
  })

  it('最近新增 with no dates at all gives the fixed number order', () => {
    const noAdded = index.issues.map((i) => (i.available ? { ...i, added: null } : i)) as IssueSummary[]
    expect(numbers(sortIssues(noAdded, 'added'))).toEqual([1, 2, 3, 4, 5, 6, 8, 9])
  })

  it('資料根據比例 gives #8, #2, #1, #9, then the issues with no cells', () => {
    const sorted = numbers(sortIssues(index.issues, 'evidence'))
    expect(sorted).toEqual([8, 2, 1, 9, 3, 4, 5, 6])
    expect(sorted).not.toEqual([...sorted].sort((a, b) => a - b))
  })

  it('does not change the input list', () => {
    const before = numbers(index.issues)
    sortIssues(index.issues, 'evidence')
    expect(numbers(index.issues)).toEqual(before)
  })
})

describe('sortStakeholders', () => {
  it('最近新增 gives the same first 5 as the home block', () => {
    expect(ids(sortStakeholders(listed, 'added', ctx).slice(0, 5))).toEqual(ids(recentStakeholders(index.stakeholders, 5)))
  })

  it('最近更新 uses updated, ties by ID highest first, no date last in ID order', () => {
    const list = listed.slice(0, 6).map((s, i) => ({ ...s, updated: i < 2 ? '2026-10-21' : i === 2 ? '2026-10-22' : null }))
    const sorted = ids(sortStakeholders(list, 'updated', ctx))
    const byId = ids(list).sort(compareIds)
    expect(sorted).toEqual([list[2].id, ...[list[0].id, list[1].id].sort(compareIds).reverse(), ...byId.slice(3)])
  })

  it('最近更新 with the real dates: newest first, the same date by ID highest first', () => {
    const sorted = sortStakeholders(listed, 'updated', ctx)
    // These 6 have 2026-10-21. I34 has it too, but it has no issue, so it is not listed.
    expect(ids(sorted).slice(0, 6)).toEqual(['I36', 'I35', 'I31', 'I27', 'I14', 'I09'])
    // I24 and O24 have 2026-10-18, the oldest date, so they are last. I comes before O.
    expect(ids(sorted).slice(-2)).toEqual(['I24', 'O24'])
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1].updated!
      const b = sorted[i].updated!
      expect(a >= b).toBe(true)
      if (a === b) expect(compareIds(sorted[i - 1].id, sorted[i].id)).toBeGreaterThan(0)
    }
  })

  it('最近更新 with no dates at all gives the fixed ID order', () => {
    const noUpdated = listed.map((s) => ({ ...s, updated: null }))
    expect(ids(sortStakeholders(noUpdated, 'updated', ctx))).toEqual(ids(listed).sort(compareIds))
  })

  it('資料根據比例 sorts by the share of its cells, ties in ID order', () => {
    const sorted = sortStakeholders(listed, 'evidence', ctx)
    expect(ids(sorted)).not.toEqual(ids(listed).sort(compareIds))
    for (let i = 1; i < sorted.length; i++) {
      const a = evidenceShare(stakeholderCells(files, sorted[i - 1].id))
      const b = evidenceShare(stakeholderCells(files, sorted[i].id))
      const c = compareShares(a, b)
      expect(c).toBeLessThanOrEqual(0)
      if (c === 0) expect(compareIds(sorted[i - 1].id, sorted[i].id)).toBeLessThan(0)
    }
  })

  it('解法涵蓋比例 sorts by covered of all needs, ties in ID order, no needs last', () => {
    const sorted = sortStakeholders(listed, 'solutions', ctx)
    expect(ids(sorted)).not.toEqual(ids(listed).sort(compareIds))
    const share = (id: string) => {
      const { covered, total } = stakeholderSolutionCoverage(files, cross, id)
      return total === 0 ? null : { part: covered, total }
    }
    for (let i = 1; i < sorted.length; i++) {
      const c = compareShares(share(sorted[i - 1].id), share(sorted[i].id))
      expect(c).toBeLessThanOrEqual(0)
      if (c === 0) expect(compareIds(sorted[i - 1].id, sorted[i].id)).toBeLessThan(0)
    }
    // O09 has 1 of 2 needs covered, so it comes after I06 (5 of 5).
    expect(ids(sorted).indexOf('I06')).toBeLessThan(ids(sorted).indexOf('O09'))
  })
})

describe('sortSolutions', () => {
  it('最近新增 gives the same first 5 as the home block', () => {
    expect(keys(sortSolutions(allSolutions, 'added', ctx).slice(0, 5))).toEqual(keys(recentSolutionItems(files, cross, 5)))
    expect(keys(sortSolutions(allSolutions, 'added', ctx))).toEqual(keys(recentSolutionItems(files, cross)))
  })

  it('最近更新 with two dates: newest first, then the tie rule of the home block', () => {
    // The dates are set here, so the test does not depend on the dates in the fixture.
    // 2026-10-21: #9 A, C, D, #2 A, B and #1 A, B. Every other solution has 2026-10-20.
    // Same date: the cross-issue solutions first, then the issue number and
    // the letter, highest first.
    const newer = ['9-A', '9-C', '9-D', '2-A', '2-B', '1-A', '1-B']
    const items = allSolutions.map((x): RecentSolution => {
      const updated = newer.includes(solutionItemKey(x)) ? '2026-10-21' : '2026-10-20'
      return { ...x, solution: { ...x.solution, updated } } as RecentSolution
    })
    expect(keys(sortSolutions(items, 'updated', ctx))).toEqual([
      '9-D', '9-C', '9-A', '2-B', '2-A', '1-B', '1-A',
      'X-E', 'X-D', 'X-C', 'X-B', 'X-A',
      '9-E', '9-B', '8-E', '8-D', '8-C', '8-B', '8-A', '2-E', '2-D', '2-C', '1-E', '1-D', '1-C',
    ])
  })

  it('最近更新 with no dates at all gives the fixed ID order, cross-issue solutions first', () => {
    const noUpdated = allSolutions.map((x) => ({ ...x, solution: { ...x.solution, updated: null } }) as RecentSolution)
    const sorted = keys(sortSolutions(noUpdated, 'updated', ctx))
    expect(sorted.slice(0, 6)).toEqual(['X-A', 'X-B', 'X-C', 'X-D', 'X-E', '1-A'])
    expect(sorted).toEqual(keys(allSolutions))
  })

  it('最近更新 uses updated, with the tie rule of the home block', () => {
    const items = allSolutions.map((x): RecentSolution => {
      const code = solutionItemKey(x)
      const updated = ['X-A', 'X-B', '2-A', '8-B'].includes(code) ? '2026-10-21' : code === '1-C' ? '2026-10-22' : null
      return { ...x, solution: { ...x.solution, updated } } as RecentSolution
    })
    expect(keys(sortSolutions(items, 'updated', ctx)).slice(0, 6)).toEqual(['1-C', 'X-B', 'X-A', '8-B', '2-A', 'X-C'])
  })

  it('資料根據比例 sorts by the cells of the covered needs, ties in the fixed ID order', () => {
    const sorted = sortSolutions(allSolutions, 'evidence', ctx)
    expect(keys(sorted)).not.toEqual(keys(allSolutions))
    const share = (x: RecentSolution) => {
      if (x.kind === 'cross') return evidenceShare(crossSolutionCells(cross, x.solution, files))
      return evidenceShare(solutionCells(files.find((f) => f.number === x.issueNumber)!, x.solution))
    }
    for (let i = 1; i < sorted.length; i++) {
      const c = compareShares(share(sorted[i - 1]), share(sorted[i]))
      expect(c).toBeLessThanOrEqual(0)
      if (c === 0) expect(compareSolutionItems(sorted[i - 1], sorted[i])).toBeLessThan(0)
    }
  })

  it('works with no cross-issue file', () => {
    const issueOnly = allSolutions.filter((x) => x.kind === 'issue')
    expect(sortSolutions(issueOnly, 'evidence', { issues: files, cross: null })).toHaveLength(issueOnly.length)
  })
})
