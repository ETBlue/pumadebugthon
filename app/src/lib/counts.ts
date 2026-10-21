// The counts in the header (design 3.7). A count is a plain number, not a
// score. Nothing here sorts.
// wantCount and needCount are not in the header any more (decision 30). They
// give the 訴求 and 需求 tab labels (decision 40, tabCounts.ts).
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { availableIssues } from './issues'
import { pickList } from './opinion'
import { listedStakeholders } from './stakeholders'

/** 議題: the analyzed issues. */
export function issueCount(index: IndexFile): number {
  return availableIssues(index).length
}

/** 利害關係人: the listed stakeholders (decision 78). Moved IDs and
 * stakeholders with no issue are left out. */
export function stakeholderCount(index: IndexFile): number {
  return listedStakeholders(index.stakeholders).length
}

/** 解法: the solutions of the analyzed issues, summed, plus the cross-issue
 * solutions when cross-issue.json exists (decision 51). The header link goes
 * to #/solutions, and that list shows both. */
export function solutionCount(index: IndexFile, cross: CrossIssueFile | null = null): number {
  const own = availableIssues(index).reduce((n, i) => n + i.counts.solutions, 0)
  return own + (cross?.solutions.length ?? 0)
}

/** 訴求: each W group once, plus each story with no W group. These are the
 * items of the opinion check pick list (design 4.1), summed over the issues.
 * Pass the files of the analyzed issues. */
export function wantCount(issues: IssueFile[]): number {
  return issues.reduce((n, issue) => n + pickList(issue).length, 0)
}

/** 需求: the rows of step 5.2 (`needs` in the issue JSON), summed over the
 * issues. Each N group counts once, plus each story with no N group
 * (decision 43). This is the list the 需求 tab shows. An issue in the old
 * format has no rows, so it counts 0. Pass the files of the analyzed issues. */
export function needCount(issues: IssueFile[]): number {
  return issues.reduce((n, issue) => n + issue.needs.length, 0)
}
