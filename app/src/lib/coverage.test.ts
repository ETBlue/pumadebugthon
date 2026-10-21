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
  compareShares, crossSolutionCells, evidenceShare, sharePercent, solutionCells, stakeholderCells,
  stakeholderSolutionCoverage,
} from './coverage'
import { findCrossSolution } from './crossIssue'

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
