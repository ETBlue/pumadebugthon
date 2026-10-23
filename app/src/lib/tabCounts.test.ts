import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import type { CrossIssueFile, IndexFile, IssueFile, Solution } from '@/types'
import { stakeholderSolutionCount } from './coverage'
import {
  issueStakeholderTabCounts, issueTabCounts, solutionTabCounts, solutionTabLabel, stakeholderTabCounts,
} from './tabCounts'
import { tabLabelText } from './tabLabel'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const issues = [trees, trashcans, smokefree]
const sol = (issue: IssueFile, code: string) => issue.solutions.find((s) => s.id === code) as Solution

describe('issueTabCounts', () => {
  it('gives the counts of the issue tab labels (#2: 訴求 40・衝突 10, 需求 22, 解法 5)', () => {
    expect(issueTabCounts(trashcans)).toEqual({ wants: 40, conflicts: 10, needs: 22, solutions: 5 })
  })

  it('works for the other fixtures', () => {
    expect(issueTabCounts(trees)).toEqual({ wants: 50, conflicts: 9, needs: 31, solutions: 5 })
    expect(issueTabCounts(smokefree)).toEqual({ wants: 33, conflicts: 6, needs: 24, solutions: 5 })
  })
})

// 「利害關係人 N・弱勢 M」 on the issue page (decision 109).
describe('issueStakeholderTabCounts', () => {
  const index = indexJson as IndexFile
  const issues = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

  it('counts the stakeholders of the issue and the filled 受影響較大的弱勢族群 rows', () => {
    expect(issues.map((i) => issueStakeholderTabCounts(index.stakeholders, i))).toEqual([
      { stakeholders: 28, disadvantaged: 4 },
      { stakeholders: 27, disadvantaged: 5 },
      { stakeholders: 21, disadvantaged: 6 },
      { stakeholders: 20, disadvantaged: 6 },
    ])
  })

  it('N is the same number as 組織 + 個人 in the index', () => {
    for (const issue of issues) {
      const c = index.issues.find((i) => i.number === issue.number)
      if (!c?.available) throw new Error('missing issue')
      expect(issueStakeholderTabCounts(index.stakeholders, issue).stakeholders).toBe(c.counts.stakeholdersO + c.counts.stakeholdersI)
    }
  })
})

describe('stakeholderTabCounts', () => {
  it('sums the counts over the issues (I06: 訴求 5・衝突 4, 需求 4, 解法 4)', () => {
    // #1: W06, W08 / C1, C7 / N08 / D. #2: W08, W11 / C6 / N07, N08 / A, C.
    // #8: W07 / C3 / I06-US01 / A. Design 3.3.
    expect(stakeholderTabCounts(issues, null, 'I06')).toEqual({ wants: 5, conflicts: 4, needs: 4, solutions: 4 })
  })

  it('counts one issue on its own', () => {
    expect(stakeholderTabCounts([trashcans], null, 'I06')).toEqual({ wants: 2, conflicts: 1, needs: 2, solutions: 2 })
  })

  it('counts an N group once, however many stories of the stakeholder it has', () => {
    // I01 in #2 has 5 stories in N01, plus N04, N06 and I01-US09.
    expect(stakeholderTabCounts([trashcans], null, 'I01').needs).toBe(4)
  })

  it('gives zeros for an unknown stakeholder or no issues', () => {
    const zero = { wants: 0, conflicts: 0, needs: 0, solutions: 0 }
    expect(stakeholderTabCounts(issues, null, 'I99')).toEqual(zero)
    expect(stakeholderTabCounts([], null, 'I06')).toEqual(zero)
  })

  // 解法 has one source, stakeholderSolutionCount (decision 119).
  describe('解法 with cross-issue.json', () => {
    const cross = crossJson as CrossIssueFile
    const all = [trees, trashcans, smokefree, policyJson as IssueFile]

    it('adds the cross-issue solutions: I06 解法 7, I01 解法 16', () => {
      expect(stakeholderTabCounts(all, cross, 'I06').solutions).toBe(7)
      expect(stakeholderTabCounts(all, cross, 'I01').solutions).toBe(16)
    })

    it('is stakeholderSolutionCount for every stakeholder, with and without the file', () => {
      const index = indexJson as IndexFile
      for (const s of index.stakeholders) {
        for (const c of [cross, null]) {
          expect(stakeholderTabCounts(all, c, s.id).solutions).toBe(stakeholderSolutionCount(all, c, s.id))
        }
      }
    })
  })
})

describe('solutionTabCounts', () => {
  it('gives the covered and not covered counts (#2 A: needs 9 / 13, stakeholders 14 / 13)', () => {
    expect(solutionTabCounts(trashcans, sol(trashcans, 'A'))).toEqual({
      needs: { covered: 9, notCovered: 13 },
      wants: { covered: 28, notCovered: 25 },
      stakeholders: { covered: 14, notCovered: 13 },
      conflicts: { wayOut: 5, related: 3 },
      // 1 分析摘要 row + 隱私, 其他顧慮與風險, 災害風險; 1 row + 相關法規 (decision 140).
      controversies: 4,
      legal: 2,
      measures: 4,
      policies: { domestic: 2, foreign: 2 },
    })
  })

  it('adds up to all the needs and all the stakeholders of the issue', () => {
    for (const issue of issues) {
      for (const solution of issue.solutions) {
        const c = solutionTabCounts(issue, solution)
        expect(c.needs.covered + c.needs.notCovered).toBe(issue.needs.length)
        expect(c.stakeholders.covered + c.stakeholders.notCovered).toBe(issue.stakeholders.length)
        // One want is one story: every story is covered or not covered.
        expect(c.wants.covered + c.wants.notCovered).toBe(issue.stories.length)
        // A want is covered when the solution covers its need: the stories of 6.2.
        expect(c.wants.covered).toBe(solution.stories.length)
        expect(c.measures).toBe(solution.measures.length)
        expect(c.policies.domestic + c.policies.foreign).toBe(solution.practices.length)
      }
    }
  })
})

describe('solutionTabCounts: 衝突, 成效衡量 and 相關政策 (decision 103)', () => {
  it('counts 國內 and 國外 by domestic (#2 B: only 國外; #8 E: none)', () => {
    expect(solutionTabCounts(trashcans, sol(trashcans, 'B')).policies).toEqual({ domestic: 0, foreign: 3 })
    const smokefree = issues.find((i) => i.number === 8)!
    expect(solutionTabCounts(smokefree, sol(smokefree, 'E')).policies).toEqual({ domestic: 0, foreign: 0 })
  })

  it('never counts a conflict as both 解開 and 相關', () => {
    for (const issue of issues) {
      for (const solution of issue.solutions) {
        const c = solutionTabCounts(issue, solution)
        expect(c.conflicts.wayOut + c.conflicts.related).toBeLessThanOrEqual(issue.conflicts.length)
      }
    }
  })
})

describe('solutionTabLabel', () => {
  it('gives the label of each tab (#2 A)', () => {
    const c = solutionTabCounts(trashcans, sol(trashcans, 'A'))
    const text = (tab: Parameters<typeof solutionTabLabel>[0]) => tabLabelText(solutionTabLabel(tab, c))
    expect(text('overview')).toBe('總覽')
    expect(text('needs')).toBe('需求　滿足 9・未滿足 13')
    expect(text('wants')).toBe('訴求　涵蓋 28・未涵蓋 25')
    expect(text('stakeholders')).toBe('利害關係人　涵蓋 14・未涵蓋 13')
    expect(text('conflicts')).toBe('衝突　解開 5・相關 3')
    expect(text('measures')).toBe('成效衡量 4')
    expect(text('policies')).toBe('相關政策　國內 2・國外 2')
  })
})
