// The counts in the tab labels (design 3.2, 3.3, 3.12). A count is a plain
// number, not a score. The counts are the totals: they do not change when a
// filter is on (decision 49). Nothing here sorts.
import { t } from '@/i18n/zh-TW'
import type { CrossIssueFile, IssueFile, Solution, SolutionEvaluation, SolutionPractice, Stakeholder, SummaryItem } from '@/types'
import { stakeholderSolutionCount } from './coverage'
import { needCount, wantCount } from './counts'
import type { SolutionTab } from './entityPaths'
import { needsOfStakeholder } from './needs'
import {
  concernCount, concernItems, practiceSides, solutionNeedCoverage, solutionRelatedConflicts, solutionStakeholderCoverage,
  solutionWantCoverage,
} from './solutionPage'
import { issueStakeholders } from './stakeholders'
import { summaryTabCount } from './summary'
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

/** The counts of the 利害關係人 tab label of the issue page (decision 109),
 * 「利害關係人 N・弱勢 M」. N: the stakeholders of the issue, the same list
 * the tab shows (issueStakeholders). M: the filled rows of
 * 受影響較大的弱勢族群; a 【待補】 row is not counted (summaryTabCount). */
export function issueStakeholderTabCounts(
  stakeholders: Stakeholder[],
  issue: IssueFile,
): { stakeholders: number; disadvantaged: number } {
  return {
    stakeholders: issueStakeholders(stakeholders, issue).length,
    disadvantaged: summaryTabCount(issue, 'disadvantaged'),
  }
}

/** The tab counts of the stakeholder page, summed over the issues
 * (decision 48). Per issue: its different want keys, the conflicts with one
 * of its stories on a side (decision 44) and its different need keys. 解法
 * is stakeholderSolutionCount (decision 119): the issue solutions that
 * cover at least one of its needs, plus the cross-issue solutions that do.
 * cross is null when cross-issue.json does not exist or fails to load. */
export function stakeholderTabCounts(issues: IssueFile[], cross: CrossIssueFile | null, id: string): TabCounts {
  const out: TabCounts = { wants: 0, conflicts: 0, needs: 0, solutions: stakeholderSolutionCount(issues, cross, id) }
  for (const issue of issues) {
    out.wants += wantsOfStakeholder(issue, id).length
    out.conflicts += conflictsForStakeholder(issue, id).length
    out.needs += needsOfStakeholder(issue, id).length
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
  /** 潛在風險, 可能爭議 and 法規障礙 (decisions 140 and 143): the items of
   * the tab that are not only 【待補】 (concernCount). */
  risks: number
  controversies: number
  legal: number
  /** The rows of 成效衡量. */
  measures: number
  /** 相關或類似的政策與做法: 國內 and 國外 items. */
  policies: { domestic: number; foreign: number }
}

/** The counts of the 潛在風險, 可能爭議 and 法規障礙 tab labels (decisions
 * 140 and 143), for an issue solution and a cross-issue solution. */
export function concernCounts(
  sol: { evaluation: SolutionEvaluation; controversies: SummaryItem[]; legal: SummaryItem[] },
): Pick<SolutionTabCounts, 'risks' | 'controversies' | 'legal'> {
  return {
    risks: concernCount(concernItems(sol, 'risks')),
    controversies: concernCount(concernItems(sol, 'controversies')),
    legal: concernCount(concernItems(sol, 'legal')),
  }
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
    ...concernCounts(solution),
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
    // 執行計畫 has no count: its rows are the same for every solution.
    case 'plan': return { main: t.solutionPage.tabs.plan }
    case 'measures': return l.measures(c.measures)
    case 'risks': return l.risks(c.risks)
    case 'controversies': return l.controversies(c.controversies)
    case 'legal': return l.legal(c.legal)
    case 'policies': return l.policies(c.policies.domestic, c.policies.foreign)
  }
}
