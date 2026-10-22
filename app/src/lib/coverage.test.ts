import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { AvailableIssueSummary, CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { basisTotal, evidencePercent } from './cellBasis'
import {
  compareShares, crossSolutionCells, crossSolutionsByNeed, evidenceShare, sharePercent, solutionCells, stakeholderCells,
  stakeholderCrossSolutions, stakeholderSolutionCount, stakeholderSolutionCoverage, stakeholderUncoveredNeeds,
} from './coverage'
import { stakeholderSolutionsView } from './stakeholderPage'
import { findCrossSolution } from './crossIssue'
import { stakeholderTabCounts } from './tabCounts'

const cross = crossJson as CrossIssueFile
const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile
const files = [trees, trashcans, smokefree, policy]

const summary = (n: number) => index.issues.find((i) => i.number === n) as AvailableIssueSummary

describe('evidenceShare', () => {
  it('gives 實證 + AI整理 of all cells: the same numbers as the 資料根據 bar', () => {
    expect(evidenceShare(summary(1).counts.cells)).toEqual({ part: 12 + 29, total: 136 })
    expect(evidenceShare(summary(2).counts.cells)).toEqual({ part: 9 + 24, total: 106 })
    expect(evidenceShare(summary(8).counts.cells)).toEqual({ part: 5 + 39, total: 92 })
    expect(evidenceShare(summary(9).counts.cells)).toEqual({ part: 6, total: 82 })
    for (const n of [1, 2, 8, 9]) {
      const cells = summary(n).counts.cells
      expect(evidenceShare(cells)?.total).toBe(basisTotal(cells))
      expect(evidenceShare(cells)?.part).toBe(cells.evidence + cells.aiSummary)
    }
  })

  it('is null when there are no cells, and 0 is a real share', () => {
    expect(evidenceShare({ evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 })).toBeNull()
    expect(evidenceShare({ evidence: 0, aiSummary: 0, aiSimulated: 3, pending: 1 })).toEqual({ part: 0, total: 4 })
  })
})

describe('stakeholderCells', () => {
  it('counts the cells of all its stories in every issue', () => {
    // I06 is in #1, #2, #8 and #9. 1 of its 12 cells is data-based.
    const cells = stakeholderCells(files, 'I06')
    expect(basisTotal(cells)).toBe(12)
    expect(evidenceShare(cells)).toEqual({ part: 1, total: 12 })
  })

  it('gives no cells for a stakeholder with no story', () => {
    expect(evidenceShare(stakeholderCells(files, 'I999'))).toBeNull()
  })
})

describe('solutionCells', () => {
  it('counts both cells of each story of the covered needs', () => {
    const solution = trashcans.solutions.find((s) => s.id === 'A')!
    const needIds = [...solution.needs!.must, ...solution.needs!.shouldCould]
    const stories = trashcans.needs.filter((n) => needIds.includes(n.id)).flatMap((n) => n.stories)
    expect(stories.length).toBeGreaterThan(0)
    expect(basisTotal(solutionCells(trashcans, solution))).toBe(2 * new Set(stories).size)
  })

  it('counts a story in two covered needs once', () => {
    const [a, b] = trashcans.needs
    const shared = a.stories[0]
    const issue: IssueFile = {
      ...trashcans,
      needs: [a, { ...b, stories: [...b.stories, shared] }],
    }
    const solution = { ...trashcans.solutions[0], needs: { must: [a.id], shouldCould: [b.id] } }
    const unique = new Set([...a.stories, ...b.stories])
    expect(basisTotal(solutionCells(issue, solution))).toBe(2 * unique.size)
  })

  it('gives no cells for a solution that covers no need', () => {
    const solution = { ...trashcans.solutions[0], needs: { must: [], shouldCould: [] } }
    expect(evidenceShare(solutionCells(trashcans, solution))).toBeNull()
  })
})

describe('crossSolutionCells', () => {
  it('counts the stories of the needs it covers, also through an X-N group and in an issue not in parts', () => {
    // X-E has parts in #2 and #8, but covers #1 N15 through X-N03.
    const xe = findCrossSolution(cross, 'X-E')!
    const withTrees = basisTotal(crossSolutionCells(cross, xe, files))
    const withoutTrees = basisTotal(crossSolutionCells(cross, xe, [trashcans, smokefree, policy]))
    const n15 = trees.needs.find((n) => n.id === 'N15')!
    expect(withTrees - withoutTrees).toBe(2 * n15.stories.length)
  })

  it('counts each story once, also when the need is in needs.must and in an X-N group', () => {
    const xa = findCrossSolution(cross, 'X-A')!
    const group = cross.needGroups.find((g) => xa.needs.crossIssue.includes(g.id))!
    const m = group.needs[0]
    const doubled = { ...xa, needs: { ...xa.needs, must: [...xa.needs.must, { issue: m.issue, id: m.id }] } }
    expect(crossSolutionCells(cross, doubled, files)).toEqual(crossSolutionCells(cross, xa, files))
  })

  it('treats a story ID in two issues as two stories', () => {
    // O12-US01 is a need in #2 and in #8 for X-B: both are counted.
    const xb = findCrossSolution(cross, 'X-B')!
    const only2 = basisTotal(crossSolutionCells(cross, xb, [trashcans]))
    const only8 = basisTotal(crossSolutionCells(cross, xb, [smokefree]))
    const both = basisTotal(crossSolutionCells(cross, xb, [trashcans, smokefree]))
    expect(both).toBe(only2 + only8)
  })
})

describe('stakeholderSolutionCoverage', () => {
  it('counts the needs and the covered needs over the issues', () => {
    expect(stakeholderSolutionCoverage(files, cross, 'I06')).toEqual({ covered: 5, total: 5 })
  })

  it('keeps a 這次不做 need in the total, not covered', () => {
    // O09 has 2 needs. O09-US01 in #2 is a W (這次不做) need.
    const w = trashcans.needs.find((n) => n.id === 'O09-US01')!
    expect(w.priority).toBe('W')
    expect(stakeholderSolutionCoverage(files, cross, 'O09')).toEqual({ covered: 1, total: 2 })
  })

  it('counts a need covered only by a cross-issue solution', () => {
    const noCross = stakeholderSolutionCoverage(files, null, 'I06')
    const withCross = stakeholderSolutionCoverage(files, cross, 'I06')
    expect(noCross.total).toBe(withCross.total)
    expect(noCross.covered).toBeLessThanOrEqual(withCross.covered)
    // A need of a fake issue that only a cross-issue solution lists.
    const issue: IssueFile = { ...trashcans, solutions: [] }
    const story = issue.stories.find((s) => s.stakeholder === 'O12')!
    const key = story.needGroup ?? story.id
    const fakeCross: CrossIssueFile = {
      ...cross,
      needGroups: [],
      solutions: [{ ...cross.solutions[0], needs: { must: [{ issue: 2, id: key }], shouldCould: [], crossIssue: [] } }],
    }
    expect(stakeholderSolutionCoverage([issue], null, 'O12').covered).toBe(0)
    expect(stakeholderSolutionCoverage([issue], fakeCross, 'O12').covered).toBe(1)
  })

  it('gives total 0 for a stakeholder with no need', () => {
    expect(stakeholderSolutionCoverage(files, cross, 'I999')).toEqual({ covered: 0, total: 0 })
  })
})

describe('stakeholderSolutionCount', () => {
  it('is the 解法 tab count of the stakeholder page, with and without the cross-issue file', () => {
    // One source for both numbers (decision 119).
    for (const id of ['I06', 'O09', 'O12', 'I01']) {
      for (const c of [cross, null]) {
        expect(stakeholderSolutionCount(files, c, id)).toBe(stakeholderTabCounts(files, c, id).solutions)
      }
    }
    expect(stakeholderSolutionCount(files, null, 'I06')).toBe(5)
    expect(stakeholderSolutionCount(files, cross, 'I01')).toBe(16)
  })

  it('counts what the 解法 tab lists: the per-issue solutions plus stakeholderCrossSolutions', () => {
    for (const id of ['I06', 'O09', 'O12', 'I01']) {
      for (const c of [cross, null]) {
        const listed = files.reduce((n, i) => n + stakeholderSolutionsView(i, id).solutions.length, 0)
          + stakeholderCrossSolutions(files, c, id).length
        expect(stakeholderSolutionCount(files, c, id)).toBe(listed)
      }
    }
  })

  it('adds each cross-issue solution that covers one of its needs once', () => {
    // I06: 5 issue solutions and 2 cross-issue solutions.
    expect(stakeholderSolutionCount(files, cross, 'I06')).toBe(7)
    // O09: 1 issue solution and no cross-issue solution.
    expect(stakeholderSolutionCount(files, cross, 'O09')).toBe(1)
  })

  it('counts a cross-issue solution that covers two of its needs once', () => {
    const issue: IssueFile = { ...trashcans, solutions: [] }
    // A stakeholder with 2 or more needs in #2.
    const keysOf = (id: string) => [...new Set(issue.stories.filter((s) => s.stakeholder === id).map((s) => s.needGroup ?? s.id))]
    const id = issue.stories.map((s) => s.stakeholder).find((x) => keysOf(x).length > 1)!
    expect(id).toBeDefined()
    const keys = keysOf(id)
    const fakeCross: CrossIssueFile = {
      ...cross,
      needGroups: [],
      solutions: [{
        ...cross.solutions[0],
        needs: { must: keys.map((id) => ({ issue: 2, id })), shouldCould: [], crossIssue: [] },
      }],
    }
    expect(stakeholderSolutionCount([issue], null, id)).toBe(0)
    expect(stakeholderSolutionCount([issue], fakeCross, id)).toBe(1)
  })

  it('gives 0 for a stakeholder with no need', () => {
    expect(stakeholderSolutionCount(files, cross, 'I999')).toBe(0)
  })
})

describe('stakeholderCrossSolutions', () => {
  const view = (id: string, c: CrossIssueFile | null, dataBased = false) =>
    stakeholderCrossSolutions(files, c, id, dataBased).map((s) => [
      s.solution.code,
      s.needs.map((n) => `${n.issueNumber}:${n.item.need.id}`),
    ])

  it('lists the cross-issue solutions that cover its needs, with those needs (decision 119)', () => {
    expect(view('I06', cross)).toEqual([
      ['X-B', ['1:N08', '2:N07', '8:I06-US01']],
      ['X-D', ['2:N08']],
    ])
    expect(view('I01', cross).map(([code]) => code)).toEqual(['X-A', 'X-B', 'X-C', 'X-D', 'X-E'])
  })

  it('is empty without the cross-issue file', () => {
    expect(view('I06', null)).toEqual([])
  })

  it('keeps only the data-based needs with the 「只看有資料根據」 filter', () => {
    // No need of I06 has a data-based 以便… cell, so nothing is left.
    expect(view('I06', cross, true)).toEqual([])
    // Every listed need of I01 is data-based.
    expect(view('I01', cross, true)).toEqual(view('I01', cross))
  })
})

describe('stakeholderUncoveredNeeds', () => {
  // A modified copy of #2 with no issue solution. Only the fake cross-issue
  // solution covers the need O12-US01 of O12 (decision 124).
  const issue: IssueFile = { ...trashcans, solutions: [] }
  const fakeCross: CrossIssueFile = {
    ...cross,
    needGroups: [],
    solutions: [{ ...cross.solutions[0], needs: { must: [{ issue: 2, id: 'O12-US01' }], shouldCould: [], crossIssue: [] } }],
  }
  const ids = (items: { need: { id: string } }[]) => items.map((n) => n.need.id)

  it('leaves out a need that only a cross-issue solution covers', () => {
    expect(ids(stakeholderSolutionsView(issue, 'O12').uncovered)).toEqual(['O12-US01'])
    expect(ids(stakeholderUncoveredNeeds(issue, fakeCross, 'O12'))).toEqual([])
    // The same need is listed under 「跨議題解法」.
    expect(stakeholderCrossSolutions([issue], fakeCross, 'O12')).toHaveLength(1)
  })

  it('lists the need without the cross-issue file', () => {
    expect(ids(stakeholderUncoveredNeeds(issue, null, 'O12'))).toEqual(['O12-US01'])
  })

  it('follows the 「只看有資料根據」 filter', () => {
    const dataBased = ids(stakeholderSolutionsView(issue, 'O12', true).uncovered)
    expect(ids(stakeholderUncoveredNeeds(issue, null, 'O12', true))).toEqual(dataBased)
    expect(ids(stakeholderUncoveredNeeds(issue, fakeCross, 'O12', true))).toEqual([])
  })

  it('agrees with 解法涵蓋 for every stakeholder, with and without the cross-issue file', () => {
    for (const s of index.stakeholders) {
      for (const c of [cross, null]) {
        const uncovered = files.reduce((n, i) => n + stakeholderUncoveredNeeds(i, c, s.id).length, 0)
        const { covered, total } = stakeholderSolutionCoverage(files, c, s.id)
        expect(uncovered).toBe(total - covered)
      }
    }
    for (const c of [fakeCross, null]) {
      const { covered, total } = stakeholderSolutionCoverage([issue], c, 'O12')
      expect(stakeholderUncoveredNeeds(issue, c, 'O12').length).toBe(total - covered)
    }
  })
})

describe('sharePercent', () => {
  it('uses the rounding of evidencePercent', () => {
    expect(sharePercent({ part: 1, total: 8 })).toBe(13)
    expect(sharePercent({ part: 1, total: 1000 })).toBe(1)
    expect(sharePercent({ part: 999, total: 1000 })).toBe(99)
    expect(sharePercent({ part: 0, total: 5 })).toBe(0)
    expect(sharePercent({ part: 5, total: 5 })).toBe(100)
    for (const n of [1, 2, 8, 9]) {
      const cells = summary(n).counts.cells
      expect(sharePercent({ part: cells.evidence, total: basisTotal(cells) })).toBe(evidencePercent(cells))
    }
  })
})

describe('compareShares', () => {
  it('puts the higher share first and compares exactly', () => {
    expect(compareShares({ part: 1, total: 3 }, { part: 33, total: 100 })).toBeLessThan(0)
    expect(compareShares({ part: 33, total: 100 }, { part: 1, total: 3 })).toBeGreaterThan(0)
    expect(compareShares({ part: 1, total: 2 }, { part: 2, total: 4 })).toBe(0)
  })

  it('puts no share after a share of 0', () => {
    expect(compareShares({ part: 0, total: 4 }, null)).toBeLessThan(0)
    expect(compareShares(null, { part: 0, total: 4 })).toBeGreaterThan(0)
    expect(compareShares(null, null)).toBe(0)
  })
})

describe('crossSolutionsByNeed (decision 126)', () => {
  it('agrees with stakeholderCrossSolutions for every stakeholder need', () => {
    for (const s of index.stakeholders) {
      const viaList = new Set(stakeholderCrossSolutions(files, cross, s.id)
        .flatMap(({ solution, needs }) => needs.map((n) => `${solution.code} ${n.issueNumber}:${n.item.need.id}`)))
      const viaMap = new Set<string>()
      for (const issue of files) {
        const map = crossSolutionsByNeed(cross, issue.number)
        for (const [needId, solutions] of map) {
          for (const sol of solutions) viaMap.add(`${sol.code} ${issue.number}:${needId}`)
        }
      }
      for (const key of viaList) expect(viaMap.has(key)).toBe(true)
    }
  })

  it('lists the solutions of one need in the order of the file', () => {
    const fake: CrossIssueFile = {
      ...cross,
      needGroups: [],
      solutions: cross.solutions.slice(0, 2).map((sol) => ({ ...sol, needs: { must: [{ issue: 2, id: 'O12-US01' }], shouldCould: [], crossIssue: [] } })),
    }
    const map = crossSolutionsByNeed(fake, 2)
    expect(map.get('O12-US01')?.map((sol) => sol.code)).toEqual(cross.solutions.slice(0, 2).map((sol) => sol.code))
    expect(crossSolutionsByNeed(fake, 1).size).toBe(0)
  })

  it('is empty without the cross-issue file', () => {
    expect(crossSolutionsByNeed(null, 2).size).toBe(0)
  })
})
