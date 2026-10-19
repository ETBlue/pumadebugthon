import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import {
  crossConflictView, crossIssueNumbers, crossNeedCoverage, crossNeedGroupsOf, crossSolutionFocus,
  crossSolutionGroup, crossSolutionsOfIssue, crossSolutionsOfSolution, crossSolutionTabCounts,
  crossSolutionTitle, crossStakeholderCoverage, crossWayOutConflicts, findCrossSolution, issuesOfCross,
} from './crossIssue'
import { compareIds } from './ids'

const cross = crossJson as CrossIssueFile
const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
// Out of order on purpose: the functions must use issue number order.
const files = [smokefree, trashcans, trees]

const xa = findCrossSolution(cross, 'X-A')!
const xe = findCrossSolution(cross, 'X-E')!
const codes = (list: { code: string }[]) => list.map((s) => s.code)

describe('findCrossSolution', () => {
  it('finds a solution by its code', () => {
    expect(xa.name).toBe('同一段人行道的共同參與式選址')
    expect(findCrossSolution(cross, 'X-E')?.code).toBe('X-E')
  })

  it('returns null for an unknown code, a missing file or no code', () => {
    expect(findCrossSolution(cross, 'X-Z')).toBeNull()
    expect(findCrossSolution(cross, 'A')).toBeNull()
    expect(findCrossSolution(null, 'X-A')).toBeNull()
    expect(findCrossSolution(cross, undefined)).toBeNull()
  })
})

describe('crossSolutionTitle', () => {
  it('is the code and the name as plain text', () => {
    expect(crossSolutionTitle(xa)).toBe('X-A 同一段人行道的共同參與式選址')
  })
})

describe('crossIssueNumbers', () => {
  it('lists the issues of parts once each, in number order', () => {
    expect(crossIssueNumbers(xa)).toEqual([1, 2, 8])
    // X-E has two parts of #2.
    expect(crossIssueNumbers(xe)).toEqual([2, 8])
  })
})

describe('issuesOfCross', () => {
  it('keeps the files of the solution issues, in number order', () => {
    expect(issuesOfCross(xa, files).map((i) => i.number)).toEqual([1, 2, 8])
    expect(issuesOfCross(xe, files).map((i) => i.number)).toEqual([2, 8])
  })
})

describe('crossSolutionsOfIssue', () => {
  it('lists the solutions with the issue in parts, in code order', () => {
    expect(codes(crossSolutionsOfIssue(cross, 2))).toEqual(['X-A', 'X-B', 'X-C', 'X-D', 'X-E'])
    expect(codes(crossSolutionsOfIssue(cross, 1))).toEqual(['X-A', 'X-B', 'X-C', 'X-D'])
  })

  it('is empty for an issue the file does not cover, and without the file', () => {
    expect(crossSolutionsOfIssue(cross, 9)).toEqual([])
    expect(crossSolutionsOfIssue(null, 2)).toEqual([])
  })
})

describe('crossSolutionsOfSolution', () => {
  it('lists the solutions that combine this issue solution', () => {
    expect(codes(crossSolutionsOfSolution(cross, 2, 'A'))).toEqual(['X-B', 'X-E'])
    expect(codes(crossSolutionsOfSolution(cross, 1, 'B'))).toEqual(['X-C', 'X-D'])
    expect(codes(crossSolutionsOfSolution(cross, 8, 'A'))).toEqual(['X-A', 'X-B'])
  })

  it('is empty when no cross-issue solution uses it', () => {
    expect(crossSolutionsOfSolution(cross, 2, 'E')).toEqual([])
    expect(crossSolutionsOfSolution(null, 2, 'A')).toEqual([])
  })
})

describe('crossNeedCoverage (design 3.18, decision 60)', () => {
  const coverage = crossNeedCoverage(cross, xa, files)
  const ids = (n: number) => coverage.find((c) => c.issueNumber === n)!.coverage

  it('has one item per issue of parts, in number order', () => {
    expect(coverage.map((c) => c.issueNumber)).toEqual([1, 2, 8])
  })

  it('covers the needs in must and shouldCould, and the needs of the X-N groups, in 5.2 order', () => {
    expect(ids(1).covered.map((i) => i.need.id)).toEqual(['N05', 'N06', 'N11', 'N12'])
    expect(ids(2).covered.map((i) => i.need.id)).toEqual(['N02', 'N04', 'N05', 'N06', 'O12-US01', 'I11-US01'])
    expect(ids(8).covered.map((i) => i.need.id)).toEqual(['N03', 'N08', 'N09', 'O01-US02', 'O22-US03', 'I25-US01', 'I26-US02'])
  })

  it('covers #2 N05 from must, and every need of X-N01', () => {
    expect(ids(2).covered.find((i) => i.need.id === 'N05')?.part).toBe('must')
    const xn01 = cross.needGroups.find((g) => g.id === 'X-N01')!
    for (const m of xn01.needs) {
      expect(ids(m.issue).covered.map((i) => i.need.id)).toContain(m.id)
    }
  })

  it('marks a need found only through an X-N group as crossIssue', () => {
    // #1 N06 is in X-N07 and not in must or shouldCould.
    expect(ids(1).covered.find((i) => i.need.id === 'N06')?.part).toBe('crossIssue')
    expect(ids(1).covered.find((i) => i.need.id === 'N11')?.part).toBe('shouldCould')
  })

  it('does not cover the other needs of the issues', () => {
    expect([ids(1), ids(2), ids(8)].map((c) => c.notCovered.length)).toEqual([25, 15, 17])
    expect(ids(2).notCovered.map((i) => i.need.id)).toContain('N01')
  })

  it('lists the issue solutions that cover a not covered need', () => {
    const n01 = ids(2).notCovered.find((i) => i.need.id === 'N01')!
    expect(n01.otherSolutions.map((s) => s.id)).toEqual(['A', 'B', 'C', 'E'])
  })

  it('leaves out an issue whose file is not given', () => {
    expect(crossNeedCoverage(cross, xa, [trashcans]).map((c) => c.issueNumber)).toEqual([2])
  })
})

describe('crossStakeholderCoverage', () => {
  const { covered, notCovered } = crossStakeholderCoverage(cross, xa, files)

  it('lists each stakeholder once, in ID order', () => {
    expect(covered).toHaveLength(21)
    expect(notCovered).toHaveLength(30)
    const all = [...covered, ...notCovered].map((e) => e.id)
    expect(new Set(all).size).toBe(all.length)
    const ids = covered.map((e) => e.id)
    expect(ids).toEqual([...ids].sort(compareIds))
  })

  it('splits the needs of a stakeholder by issue, in issue number order', () => {
    // O05 (里長) is in #1, #2 and #8; X-N01 covers its need in each.
    const o05 = covered.find((e) => e.id === 'O05')!
    expect(o05.issues.map((i) => i.issueNumber)).toEqual([1, 2, 8])
    expect(o05.issues.map((i) => i.covered.map((c) => c.need.id))).toEqual([['N05'], ['N05'], ['N09']])
    // #1 N15 of O05 is not covered by X-A.
    expect(o05.issues[0].notCovered.map((c) => c.need.id)).toEqual(['N15'])
  })

  it('puts a stakeholder with no covered need in any issue under not covered', () => {
    expect(notCovered.every((e) => e.issues.every((i) => i.covered.length === 0))).toBe(true)
    expect(covered.every((e) => e.issues.some((i) => i.covered.length > 0))).toBe(true)
  })
})

describe('crossSolutionTabCounts', () => {
  it('sums the needs over the issues and counts each stakeholder once', () => {
    expect(crossSolutionTabCounts(cross, xa, files)).toEqual({
      needs: { covered: 17, notCovered: 57 },
      stakeholders: { covered: 21, notCovered: 30 },
    })
    expect(crossSolutionTabCounts(cross, xe, files)).toEqual({
      needs: { covered: 9, notCovered: 36 },
      stakeholders: { covered: 15, notCovered: 21 },
    })
  })
})

describe('crossNeedGroupsOf', () => {
  it('gives the X-N groups of needs.crossIssue, in ID order', () => {
    expect(crossNeedGroupsOf(cross, xa).map((g) => g.id)).toEqual(['X-N01', 'X-N06', 'X-N07'])
    expect(crossNeedGroupsOf(cross, xa)[1].prioritiesDiffer).toBe(true)
  })
})

describe('crossWayOutConflicts', () => {
  it('lists the conflicts whose wayOutSolutions has the code, in file order', () => {
    expect(crossWayOutConflicts(cross, 'X-B').map((c) => c.id)).toEqual(['X-C1', 'X-C2'])
    expect(crossWayOutConflicts(cross, 'X-A').map((c) => c.id)).toEqual(['X-C1'])
    expect(crossWayOutConflicts(cross, 'X-C')).toEqual([])
  })
})

describe('crossConflictView', () => {
  it('finds the stories of each side in the issue files, and the needs', () => {
    const c2 = cross.conflicts.find((c) => c.id === 'X-C2')!
    const view = crossConflictView(cross, c2, files)
    expect(view.sideA.map((s) => [s.issueNumber, s.story.id])).toEqual([[2, 'I01-US09']])
    expect(view.sideB.map((s) => [s.issueNumber, s.story.id])).toEqual([[2, 'I01-US01'], [2, 'O01-US01'], [8, 'I25-US01']])
    expect(view.needsB.map((n) => n.kind === 'issue' && `${n.issueNumber} ${n.need.need.id}`)).toEqual(['2 N01', '2 N02', '8 I25-US01'])
  })

  it('gives an X-N need its group', () => {
    const c1 = cross.conflicts.find((c) => c.id === 'X-C1')!
    const first = crossConflictView(cross, c1, files).needsB[0]
    expect(first.kind).toBe('group')
    expect(first.kind === 'group' && first.group.id).toBe('X-N02')
  })
})

describe('crossSolutionFocus', () => {
  it('lists the 特別關注族群 notes that name the code, in file order', () => {
    expect(crossSolutionFocus(cross, 'X-A').map((f) => f.tag)).toEqual(['高齡', '身心障礙', '兒童與照顧者', '外籍', '經濟弱勢'])
    expect(crossSolutionFocus(cross, 'X-E').map((f) => f.tag)).toEqual(['呼吸道疾病'])
  })
})

describe('crossSolutionGroup (#/solutions)', () => {
  it('keeps every solution in code order without a filter', () => {
    expect(codes(crossSolutionGroup(cross, { spaces: [], issues: [] }))).toEqual(['X-A', 'X-B', 'X-C', 'X-D', 'X-E'])
  })

  it('keeps a solution when one of its issues is picked', () => {
    expect(codes(crossSolutionGroup(cross, { spaces: [], issues: [1] }))).toEqual(['X-A', 'X-B', 'X-C', 'X-D'])
    expect(codes(crossSolutionGroup(cross, { spaces: [], issues: [9] }))).toEqual([])
  })

  it('keeps a solution that uses any picked space type', () => {
    const withMrt = cross.solutions.filter((s) => s.spaces.includes('mrt-exit')).map((s) => s.code)
    expect(codes(crossSolutionGroup(cross, { spaces: ['mrt-exit'], issues: [] }))).toEqual(withMrt)
  })

  it('is empty without the file', () => {
    expect(crossSolutionGroup(null, { spaces: [], issues: [] })).toEqual([])
  })
})

describe('fixture', () => {
  it('covers #1, #2 and #8, which are analyzed issues', () => {
    expect(cross.issues).toEqual([1, 2, 8])
    const available = index.issues.filter((i) => i.available).map((i) => i.number)
    for (const n of cross.issues) expect(available).toContain(n)
  })
})
