// The counts in the tab labels (design 3.2, 3.3, 3.12). A count is a plain
// number, not a score. The counts are the totals: they do not change when a
// filter is on (decision 49). Nothing here sorts.
import { t } from '@/i18n/zh-TW'
import type { IssueFile, Solution, SolutionPractice } from '@/types'
import { needCount, wantCount } from './counts'
import type { SolutionTab } from './entityPaths'
import { needsOfStakeholder } from './needs'
import {
  practiceSides, solutionNeedCoverage, solutionRelatedConflicts, solutionStakeholderCoverage, solutionWantCoverage,
} from './solutionPage'
import type { TabLabel } from './tabLabel'
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

/** The counts of the solution page's tab labels (design 3.12, decision 103),
 * for example 「需求　涵蓋 9・未涵蓋 12」 and 「衝突　解開 5・相關 3」.
 * Plain numbers: no percent, no bar. They do not change with a filter
 * (decision 49). */
export interface SolutionTabCounts {
  needs: CoverageCount
  /** One want is one story (its 我想要… cell). */
  wants: CoverageCount
  stakeholders: CoverageCount
  /** wayOut: 解開的衝突. related: 相關的衝突 (the others with a covered story). */
  conflicts: { wayOut: number; related: number }
  /** The rows of 成效衡量. */
  measures: number
  /** 相關或類似的政策與做法: 國內 and 國外 items. */
  policies: { domestic: number; foreign: number }
}

/** The 國內 and 國外 counts of the 相關政策 tab label. */
export function practiceCounts(practices: SolutionPractice[]): SolutionTabCounts['policies'] {
  const sides = practiceSides(practices)
  return { domestic: sides.domestic.length, foreign: sides.foreign.length }
}

export function solutionTabCounts(issue: IssueFile, solution: Solution): SolutionTabCounts {
  const needs = solutionNeedCoverage(issue, solution)
  const wants = solutionWantCoverage(issue, solution)
  const stakeholders = solutionStakeholderCoverage(issue, solution)
  return {
    needs: { covered: needs.covered.length, notCovered: needs.notCovered.length },
    wants: { covered: wants.covered.length, notCovered: wants.notCovered.length },
    stakeholders: { covered: stakeholders.covered.length, notCovered: stakeholders.notCovered.length },
    conflicts: {
      wayOut: issue.conflicts.filter((c) => c.wayOutSolutions.includes(solution.id)).length,
      related: solutionRelatedConflicts(issue, solution).length,
    },
    measures: solution.measures.length,
    policies: practiceCounts(solution.practices),
  }
}

/** The visible label of a solution page tab (design 3.12, decision 103), for
 * an issue solution and a cross-issue solution. */
export function solutionTabLabel(tab: SolutionTab, c: SolutionTabCounts): TabLabel {
  const l = t.solutionPage.tabLabels
  switch (tab) {
    case 'overview': return { main: t.solutionPage.tabs.overview }
    case 'needs': return l.needs(c.needs.covered, c.needs.notCovered)
    case 'wants': return l.wants(c.wants.covered, c.wants.notCovered)
    case 'stakeholders': return l.stakeholders(c.stakeholders.covered, c.stakeholders.notCovered)
    case 'conflicts': return l.conflicts(c.conflicts.wayOut, c.conflicts.related)
    case 'measures': return l.measures(c.measures)
    case 'policies': return l.policies(c.policies.domestic, c.policies.foreign)
  }
}
