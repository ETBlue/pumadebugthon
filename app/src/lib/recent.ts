// The "recent" lists of the home page (design 3.1).
// Sort rule: by date, newest first. Items with the same date: by ID, highest
// first. An item with no date goes last. Never by a count.
import type { AvailableIssueSummary, CrossIssueFile, CrossSolution, IssueFile, IssueSummary, Solution, Stakeholder } from '@/types'
import { compareIds } from './ids'
import { isListed } from './stakeholders'

/** Newest date first. A missing date (null or "") goes last. Dates are
 * YYYY-MM-DD, so string order is date order. */
function compareDatesDesc(a: string | null, b: string | null): number {
  if (!a || !b) return (a ? 0 : 1) - (b ? 0 : 1)
  return a < b ? 1 : a > b ? -1 : 0
}

function take<T>(list: T[], limit?: number): T[] {
  return limit === undefined ? list : list.slice(0, limit)
}

/** 最近更新的議題: the analyzed issues by `updated`, then by issue number,
 * highest first. */
export function recentIssues(issues: IssueSummary[], limit?: number): AvailableIssueSummary[] {
  const list = issues
    .filter((i): i is AvailableIssueSummary => i.available)
    .sort((a, b) => compareDatesDesc(a.updated, b.updated) || b.number - a.number)
  return take(list, limit)
}

/** 最近加入分析的族群: listed stakeholders (decision 78: moved IDs and
 * stakeholders with no issue left out) by `added`,
 * then by ID, highest first (the reverse of compareIds, so I comes before O). */
export function recentStakeholders(stakeholders: Stakeholder[], limit?: number): Stakeholder[] {
  const list = stakeholders
    .filter(isListed)
    .sort((a, b) => compareDatesDesc(a.added, b.added) || compareIds(b.id, a.id))
  return take(list, limit)
}

export interface IssueSolution {
  issueNumber: number
  solution: Solution
}

/** 最近分析出的解法: the solutions of the given issue files by `added`, then
 * by issue number, then by solution letter, highest first. */
export function recentSolutions(issues: IssueFile[], limit?: number): IssueSolution[] {
  const list = issues
    .flatMap((issue) => issue.solutions.map((solution) => ({ issueNumber: issue.number, solution })))
    .sort(
      (a, b) =>
        compareDatesDesc(a.solution.added, b.solution.added) ||
        b.issueNumber - a.issueNumber ||
        (a.solution.id < b.solution.id ? 1 : a.solution.id > b.solution.id ? -1 : 0),
    )
  return take(list, limit)
}

/** One item of 最近分析出的解法: an issue solution or a cross-issue solution. */
export type RecentSolution =
  | ({ kind: 'issue' } & IssueSolution)
  | { kind: 'cross'; solution: CrossSolution }

/** 最近分析出的解法 with the cross-issue solutions (decision 51): every
 * solution by `added`, newest first. On the same date the cross-issue
 * solutions come first (code, highest first), then the issue solutions in
 * the order of recentSolutions. cross is null when cross-issue.json does
 * not exist. */
export function recentSolutionItems(issues: IssueFile[], cross: CrossIssueFile | null, limit?: number): RecentSolution[] {
  const crossItems: RecentSolution[] = [...(cross?.solutions ?? [])]
    .sort((a, b) => compareDatesDesc(a.added, b.added) || (a.code < b.code ? 1 : a.code > b.code ? -1 : 0))
    .map((solution) => ({ kind: 'cross', solution }))
  const issueItems: RecentSolution[] = recentSolutions(issues).map((x) => ({ kind: 'issue', ...x }))
  // Merge the two lists, which are both in date order. A cross-issue
  // solution goes before an issue solution of the same date.
  const out: RecentSolution[] = []
  let i = 0
  let j = 0
  while (i < crossItems.length || j < issueItems.length) {
    const c = crossItems[i]
    const s = issueItems[j]
    if (c && (!s || compareDatesDesc(c.solution.added, s.solution.added) <= 0)) out.push(crossItems[i++])
    else out.push(issueItems[j++])
  }
  return take(out, limit)
}

/** The home page used to hold the stakeholder list, so links like
 * `#/?cross=1` were shared. They now go to `#/stakeholders?cross=1`.
 * Returns the new path, or null when the home page should show. */
export function homeRedirect(search: string): string | null {
  return new URLSearchParams(search).get('cross') === '1' ? '/stakeholders?cross=1' : null
}
