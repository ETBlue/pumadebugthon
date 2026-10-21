// The sorts the reader picks on the three list pages (design 3.23.3,
// decisions 81 and 82). The default is 最近更新. The share sorts are the only
// count-based sorts in the app, and only here. There is no ID sort (Q24):
// the fixed ID order is used only for ties and for items with no value.
import type { CrossIssueFile, IssueFile, IssueSummary, Stakeholder } from '@/types'
import {
  compareShares, crossSolutionCells, evidenceShare, solutionCells, stakeholderCells, stakeholderSolutionCoverage,
  type Share,
} from './coverage'
import { compareIds } from './ids'
import type { RecentSolution } from './recent'

/** The sort values in the URL (sort=). 'solutions' is on #/stakeholders only. */
export type ListSort = 'updated' | 'added' | 'evidence' | 'solutions'
export type IssueSort = Exclude<ListSort, 'solutions'>
export type SolutionSort = Exclude<ListSort, 'solutions'>

/** The data the stakeholder and solution sorts need: the issue files of the
 * analyzed issues, and cross-issue.json (null when it does not exist). */
export interface ListContext {
  issues: IssueFile[]
  cross: CrossIssueFile | null
}

/** Newest date first. A missing date (undefined, null or "") is not handled
 * here: see byDate. Dates are YYYY-MM-DD, so string order is date order. */
function newestFirst(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0
}

/** A date sort. Items with a date: newest first, then tieBreak. Items with
 * no date: last, in the fixed ID order (fixedOrder). */
function byDate<T>(
  list: T[],
  dateOf: (item: T) => string | null | undefined,
  tieBreak: (a: T, b: T) => number,
  fixedOrder: (a: T, b: T) => number,
): T[] {
  return [...list].sort((a, b) => {
    const da = dateOf(a) || null
    const db = dateOf(b) || null
    if (da && db) return newestFirst(da, db) || tieBreak(a, b)
    if (da) return -1
    if (db) return 1
    return fixedOrder(a, b)
  })
}

/** A share sort: the higher share first. Same share: the fixed ID order. No
 * share: last, in the fixed ID order. Each share is computed once. */
function byShare<T>(list: T[], shareOf: (item: T) => Share | null, fixedOrder: (a: T, b: T) => number): T[] {
  const shares = new Map(list.map((item) => [item, shareOf(item)]))
  return [...list].sort((a, b) => compareShares(shares.get(a)!, shares.get(b)!) || fixedOrder(a, b))
}

// ---------- #/issues ----------

const issueNumberOrder = (a: IssueSummary, b: IssueSummary) => a.number - b.number

/** #/issues. Dates: newest first, the same number highest first (as the
 * home block). 依資料根據比例: the issue's counts.cells, the numbers of its
 * 資料根據 bar. A 製作中 issue has no date and no cells, so it is last. */
export function sortIssues(issues: IssueSummary[], sort: IssueSort): IssueSummary[] {
  switch (sort) {
    case 'updated':
      return byDate(issues, (i) => i.updated, (a, b) => b.number - a.number, issueNumberOrder)
    case 'added':
      return byDate(issues, (i) => i.added, (a, b) => b.number - a.number, issueNumberOrder)
    case 'evidence':
      return byShare(issues, (i) => (i.available ? evidenceShare(i.counts.cells) : null), issueNumberOrder)
  }
}

// ---------- #/stakeholders ----------

const stakeholderIdOrder = (a: Stakeholder, b: Stakeholder) => compareIds(a.id, b.id)

/** #/stakeholders. Dates: newest first, the same date by ID highest first
 * (as the home block). 依資料根據比例: the cells of all its stories in every
 * analyzed issue. 依解法涵蓋比例: its covered needs of all its needs. */
export function sortStakeholders(list: Stakeholder[], sort: ListSort, ctx: ListContext): Stakeholder[] {
  switch (sort) {
    case 'updated':
      return byDate(list, (s) => s.updated, (a, b) => compareIds(b.id, a.id), stakeholderIdOrder)
    case 'added':
      return byDate(list, (s) => s.added, (a, b) => compareIds(b.id, a.id), stakeholderIdOrder)
    case 'evidence':
      return byShare(list, (s) => evidenceShare(stakeholderCells(ctx.issues, s.id)), stakeholderIdOrder)
    case 'solutions':
      return byShare(
        list,
        (s) => {
          const { covered, total } = stakeholderSolutionCoverage(ctx.issues, ctx.cross, s.id)
          return total === 0 ? null : { part: covered, total }
        },
        stakeholderIdOrder,
      )
  }
}

// ---------- #/solutions ----------

/** A key for one solution item: the code for a cross-issue solution
 * ("X-A"), "<issue>-<letter>" for an issue solution ("2-A"). */
export function solutionItemKey(item: RecentSolution): string {
  return item.kind === 'cross' ? item.solution.code : `${item.issueNumber}-${item.solution.id}`
}

function letterOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** The fixed ID order of solutions: the cross-issue solutions first (X-A,
 * X-B…), then by issue number, then by letter. */
export function compareSolutionItems(a: RecentSolution, b: RecentSolution): number {
  if (a.kind === 'cross' && b.kind === 'cross') return letterOrder(a.solution.code, b.solution.code)
  if (a.kind === 'cross') return -1
  if (b.kind === 'cross') return 1
  return a.issueNumber - b.issueNumber || letterOrder(a.solution.id, b.solution.id)
}

/** The tie rule of the date sorts, as recentSolutionItems: the cross-issue
 * solutions first (code, highest first), then the issue number, highest
 * first, then the letter, highest first. */
function solutionDateTie(a: RecentSolution, b: RecentSolution): number {
  if (a.kind === 'cross' && b.kind === 'cross') return letterOrder(b.solution.code, a.solution.code)
  if (a.kind === 'cross') return -1
  if (b.kind === 'cross') return 1
  return b.issueNumber - a.issueNumber || letterOrder(b.solution.id, a.solution.id)
}

function solutionShare(item: RecentSolution, ctx: ListContext): Share | null {
  if (item.kind === 'cross') {
    return ctx.cross === null ? null : evidenceShare(crossSolutionCells(ctx.cross, item.solution, ctx.issues))
  }
  const issue = ctx.issues.find((i) => i.number === item.issueNumber)
  return issue ? evidenceShare(solutionCells(issue, item.solution)) : null
}

/** #/solutions: the issue solutions and the cross-issue solutions in one
 * list (decision 89). 依資料根據比例: the cells of the stories of the needs
 * each solution covers (3.23.4). */
export function sortSolutions(items: RecentSolution[], sort: SolutionSort, ctx: ListContext): RecentSolution[] {
  switch (sort) {
    case 'updated':
      return byDate(items, (x) => x.solution.updated, solutionDateTie, compareSolutionItems)
    case 'added':
      return byDate(items, (x) => x.solution.added, solutionDateTie, compareSolutionItems)
    case 'evidence':
      return byShare(items, (x) => solutionShare(x, ctx), compareSolutionItems)
  }
}
