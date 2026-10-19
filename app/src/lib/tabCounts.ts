// The counts in the tab labels (design 3.2, 3.3, 3.12). A count is a plain
// number, not a score. The counts are the totals: they do not change when a
// filter is on (decision 49). Nothing here sorts.
import type { IssueFile, Solution } from '@/types'
import { needCount, wantCount } from './counts'
import { needsOfStakeholder } from './needs'
import { solutionNeedCoverage, solutionStakeholderCoverage } from './solutionPage'
import { conflictsForStakeholder, wantsOfStakeholder } from './wantList'

/** The counts of the 訴求 (wants and conflicts), 需求 and 解法 tab labels. */
export interface TabCounts {
  wants: number
  conflicts: number
  needs: number
  solutions: number
}

/** The tab counts of the issue page. 訴求 is wantCount, 衝突 the conflicts,
 * 需求 is needCount (decision 43), 解法 the solutions. */
export function issueTabCounts(issue: IssueFile): TabCounts {
  return {
    wants: wantCount([issue]),
    conflicts: issue.conflicts.length,
    needs: needCount([issue]),
    solutions: issue.solutions.length,
  }
}

/** The tab counts of the stakeholder page, summed over the issues
 * (decision 48). Per issue: its different want keys, the conflicts with one
 * of its stories on a side (decision 44), its different need keys, and the
 * solutions that cover at least one of its needs. */
export function stakeholderTabCounts(issues: IssueFile[], id: string): TabCounts {
  const out: TabCounts = { wants: 0, conflicts: 0, needs: 0, solutions: 0 }
  for (const issue of issues) {
    const needs = needsOfStakeholder(issue, id)
    out.wants += wantsOfStakeholder(issue, id).length
    out.conflicts += conflictsForStakeholder(issue, id).length
    out.needs += needs.length
    out.solutions += new Set(needs.flatMap((n) => n.solutions.map((s) => s.solution.id))).size
  }
  return out
}

export interface CoverageCount {
  covered: number
  notCovered: number
}

/** The counts of the solution page's 需求 and 利害關係人 tab labels
 * (「需求　涵蓋 9・未涵蓋 12」). Plain numbers: no percent, no bar. */
export interface SolutionTabCounts {
  needs: CoverageCount
  stakeholders: CoverageCount
}

export function solutionTabCounts(issue: IssueFile, solution: Solution): SolutionTabCounts {
  const needs = solutionNeedCoverage(issue, solution)
  const stakeholders = solutionStakeholderCoverage(issue, solution)
  return {
    needs: { covered: needs.covered.length, notCovered: needs.notCovered.length },
    stakeholders: { covered: stakeholders.covered.length, notCovered: stakeholders.notCovered.length },
  }
}
