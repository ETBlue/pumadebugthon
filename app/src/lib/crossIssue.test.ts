import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import {
  crossConflictView, crossCoverageIssueNumbers, crossIssueNumbers, crossNeedCoverage, crossNeedGroupsOf, crossRelatedConflicts,
  crossSolutionFocus, crossSolutionsOfIssue, crossSolutionsOfSolution, crossSolutionTabCounts, crossWantCoverage,
  crossSolutionTitle, crossStakeholderCoverage, crossWayOutConflicts, findCrossSolution, issuesOfCross,
} from './crossIssue'
import { compareIds } from './ids'
import { issueNeeds } from './needs'

const cross = crossJson as CrossIssueFile
const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile
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

  it('lists the one solution with a #9 part (X-D)', () => {
    expect(codes(crossSolutionsOfIssue(cross, 9))).toEqual(['X-D'])
  })

  it('is empty for an issue the file does not cover, and without the file', () => {
    expect(crossSolutionsOfIssue(cross, 3)).toEqual([])
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
    expect([ids(1), ids(2), ids(8)].map((c) => c.notCovered.length)).toEqual([27, 16, 17])
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

describe('cross-issue coverage of an issue that is not in parts (X-E, #1 N15)', () => {
  // X-E has parts in #2 and #8 only. It lists X-N03, and X-N03 has #1 N15.
  // Decision 60: a need in a listed X-N group is covered, so #1 N15 is
  // covered. 「Not covered」 stays limited to the issues in parts.
  it('loads the issues of parts plus the issues of the listed X-N groups', () => {
    expect(crossIssueNumbers(xe)).toEqual([2, 8])
    expect(crossCoverageIssueNumbers(cross, xe)).toEqual([1, 2, 8])
    expect(crossCoverageIssueNumbers(cross, xa)).toEqual([1, 2, 8])
  })

  // #9 has no city space. X-D has #9 解法 D as a part; X-C has no #9 part, but
  // it lists X-N08, and X-N08 has #9 N02. So both pages load the #9 file.
  it('loads #9 for X-D (a part) and for X-C (through X-N08)', () => {
    const xc = findCrossSolution(cross, 'X-C')!
    const xd = findCrossSolution(cross, 'X-D')!
    expect(crossIssueNumbers(xd)).toEqual([1, 2, 8, 9])
    expect(crossCoverageIssueNumbers(cross, xc)).toContain(9)
    const withPolicy = [policy, ...files]
    const d9 = crossNeedCoverage(cross, xd, withPolicy).find((c) => c.issueNumber === 9)!
    expect(d9.inParts).toBe(true)
    expect(d9.coverage.covered.map((i) => i.need.id)).toEqual(expect.arrayContaining(['N01', 'N02', 'N05']))
    const c9 = crossNeedCoverage(cross, xc, withPolicy).find((c) => c.issueNumber === 9)!
    expect(c9.inParts).toBe(false)
    expect(c9.coverage.covered.map((i) => [i.need.id, i.part])).toEqual([['N02', 'crossIssue']])
    expect(c9.coverage.notCovered).toEqual([])
  })

  it('lists #1 N15 as covered through X-N03, with no not covered need in #1', () => {
    const coverage = crossNeedCoverage(cross, xe, files)
    expect(coverage.map((c) => [c.issueNumber, c.inParts])).toEqual([[1, false], [2, true], [8, true]])
    const one = coverage[0].coverage
    expect(one.covered.map((i) => [i.need.id, i.part])).toEqual([['N15', 'crossIssue']])
    expect(one.notCovered).toEqual([])
  })

  it('lists the stakeholders of #1 N15 as covered, with only that need in #1', () => {
    const n15 = issueNeeds(trees).find((i) => i.need.id === 'N15')!
    const { covered, notCovered } = crossStakeholderCoverage(cross, xe, files)
    for (const id of n15.stakeholders) {
      const entry = covered.find((e) => e.id === id)!
      const one = entry.issues.find((i) => i.issueNumber === 1)!
      expect(one.covered.map((c) => c.need.id)).toEqual(['N15'])
      expect(one.notCovered).toEqual([])
    }
    // A stakeholder of #1 with no need in X-N03 is not listed at all.
    const listed = new Set([...covered, ...notCovered].map((e) => e.id))
    const onlyInOne = trees.stakeholders.map((s) => s.id).filter(
      (id) => !trashcans.stakeholders.some((s) => s.id === id) && !smokefree.stakeholders.some((s) => s.id === id),
    )
    for (const id of onlyInOne) if (!n15.stakeholders.includes(id)) expect(listed.has(id)).toBe(false)
    // No entry lists a not covered need of #1.
    for (const e of [...covered, ...notCovered]) {
      for (const i of e.issues) if (i.issueNumber === 1) expect(i.notCovered).toEqual([])
    }
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
      needs: { covered: 17, notCovered: 60 },
      wants: { covered: 44, notCovered: 123 },
      stakeholders: { covered: 21, notCovered: 30 },
      conflicts: { wayOut: 1, related: 1 },
      // 其他顧慮與風險, 災害風險; 1 分析摘要 row + 隱私; 1 row + 相關法規
      // (decisions 140 and 143).
      risks: 2,
      controversies: 2,
      legal: 2,
      measures: 4,
      policies: { domestic: 2, foreign: 0 },
    })
    // X-E: 9 needs of #2 and #8, plus #1 N15 through X-N03 (decision 60).
    // N15 (O05, O13) moves one stakeholder from not covered to covered.
    expect(crossSolutionTabCounts(cross, xe, files)).toMatchObject({
      needs: { covered: 10, notCovered: 37 },
      stakeholders: { covered: 16, notCovered: 20 },
      measures: xe.measures.length,
      policies: { domestic: xe.practices.length, foreign: 0 },
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

describe('fixture', () => {
  it('covers #1, #2, #8 and #9, which are analyzed issues', () => {
    expect(cross.issues).toEqual([1, 2, 8, 9])
    const available = index.issues.filter((i) => i.available).map((i) => i.number)
    for (const n of cross.issues) expect(available).toContain(n)
  })
})

describe('crossWantCoverage (decision 103)', () => {
  it('gives the stories of the covered and the not covered needs, per issue', () => {
    for (const sol of [xa, xe]) {
      const needs = crossNeedCoverage(cross, sol, files)
      const wants = crossWantCoverage(cross, sol, files)
      expect(wants.map((w) => w.issueNumber)).toEqual(needs.map((n) => n.issueNumber))
      wants.forEach((w, i) => {
        const storyIds = (list: { stories: { id: string }[] }[]) => list.flatMap((n) => n.stories.map((s) => s.id)).sort()
        expect(w.wants.covered.map((s) => s.id).sort()).toEqual(storyIds(needs[i].coverage.covered))
        expect(w.wants.notCovered.map((s) => s.id).sort()).toEqual(storyIds(needs[i].coverage.notCovered))
      })
    }
  })

  it('has no not covered wants for an issue that is not in parts (X-E and #1)', () => {
    const one = crossWantCoverage(cross, xe, files).find((w) => w.issueNumber === 1)!
    expect(one.inParts).toBe(false)
    expect(one.wants.covered.length).toBeGreaterThan(0)
    expect(one.wants.notCovered).toEqual([])
  })
})

describe('crossRelatedConflicts (decision 103)', () => {
  it('lists the conflicts with a covered story that do not list the code in their way out', () => {
    for (const sol of cross.solutions) {
      const related = crossRelatedConflicts(cross, sol, files)
      for (const r of related) {
        expect(r.conflict.wayOutSolutions).not.toContain(sol.code)
        expect(r.covered.length).toBeGreaterThan(0)
      }
    }
    // X-B is in the way out of both conflicts, so none is only related.
    expect(crossRelatedConflicts(cross, findCrossSolution(cross, 'X-B')!, files)).toEqual([])
    expect(crossRelatedConflicts(cross, xa, files).map((r) => r.conflict.id)).toEqual(['X-C2'])
  })
})
