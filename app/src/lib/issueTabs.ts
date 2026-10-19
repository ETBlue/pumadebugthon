// What the issue page's 需求 tab and 解法 tab show (design 3.2), after the
// stakeholder filter (?stakeholder=, design 3.14) and the 「只看有資料根據」
// filter (?evidence=1, design 3.5).
// Order is always the fixed priority order, the file order of step 5.2 or
// letter order. Nothing here sorts by a count.
import type { Conflict, IssueFile, Solution } from '@/types'
import { dataBasedNeeds, issueNeeds, needsByPriority, needsForStakeholder, type NeedPriorityGroup } from './needs'
import { solutionNeedCoverage, type CoveredNeed } from './solutionPage'
import { compareIds } from './ids'
import { conflictsForStakeholder } from './wantList'

export interface NeedsTabView {
  /** The issue uses the old format (format "stories", no needs). The tab
   * shows a short note instead of the list (decision 52). */
  oldFormat: boolean
  /** The shown needs, grouped by priority (M, S, C, W). Empty groups are left out. */
  groups: NeedPriorityGroup[]
  /** How many needs are shown, for the status line of the menu. */
  shown: number
}

/** The 需求 tab. stakeholder: the ID from the menu, or null for every
 * stakeholder. dataBased: keep a need only when one of its stories has a
 * [實證] or [AI整理] 以便… cell. The two filters work together.
 * With a stakeholder, each need's conflicts are only the ones that the 訴求
 * tab shows with the same stakeholder (conflictsForStakeholder). */
export function needsTabView(issue: IssueFile, stakeholder: string | null, dataBased: boolean): NeedsTabView {
  const oldFormat = issue.format === 'stories'
  let items = needsForStakeholder(issueNeeds(issue), stakeholder)
  if (dataBased) items = dataBasedNeeds(items)
  // With a filter, a need lists only the conflicts that the 訴求 tab shows
  // with the same filter. The links 「出現在衝突」 keep ?stakeholder=, so a
  // conflict with no story of the stakeholder would point to nothing.
  if (stakeholder !== null) {
    const shown = new Set(conflictsForStakeholder(issue, stakeholder).map((c) => c.id))
    items = items.map((i) => ({ ...i, conflicts: i.conflicts.filter((c) => shown.has(c.id)) }))
  }
  return { oldFormat, groups: needsByPriority(items), shown: items.length }
}

export interface SolutionsTabItem {
  solution: Solution
  /** The shown needs listed in 涵蓋的 Must (step 6.2), in the order of step 5.2. */
  must: CoveredNeed[]
  /** The shown needs listed in 涵蓋的 Should / Could, in the order of step 5.2. */
  shouldCould: CoveredNeed[]
  /** With a stakeholder picked: the number of covered needs that are not
   * this stakeholder's (「這個解法還涵蓋其他 6 個需求」). The data filter does
   * not change it. 0 when no stakeholder is picked. */
  otherNeeds: number
  /** true when the solution covers needs of the shown stakeholder, but the
   * data filter hides all of them. */
  emptyByData: boolean
  /** 解開的衝突: the conflicts whose wayOutSolutions lists the solution, in
   * file order. With a stakeholder picked, only the conflicts that the 訴求
   * tab shows with the same stakeholder (conflictsForStakeholder). */
  wayOutConflicts: Conflict[]
}

/** The 解法 tab: each solution in letter order. With a stakeholder picked,
 * only the solutions that cover at least one of its needs, each with only
 * that stakeholder's needs. The data filter hides needs, never a solution. */
export function solutionsTabView(issue: IssueFile, stakeholder: string | null, dataBased: boolean): SolutionsTabItem[] {
  const out: SolutionsTabItem[] = []
  const solutions = [...issue.solutions].sort((a, b) => compareIds(a.id, b.id))
  // The conflict links keep ?stakeholder=, so list only the conflicts that
  // the 訴求 tab shows with that filter.
  const conflicts = conflictsForStakeholder(issue, stakeholder)
  for (const solution of solutions) {
    const covered = solutionNeedCoverage(issue, solution).covered
    const own = needsForStakeholder(covered, stakeholder)
    if (stakeholder !== null && own.length === 0) continue
    const shown = dataBased ? dataBasedNeeds(own) : own
    out.push({
      solution,
      must: shown.filter((n) => n.part === 'must'),
      shouldCould: shown.filter((n) => n.part === 'shouldCould'),
      otherNeeds: stakeholder === null ? 0 : covered.length - own.length,
      emptyByData: own.length > 0 && shown.length === 0,
      wayOutConflicts: conflicts.filter((c) => c.wayOutSolutions.includes(solution.id)),
    })
  }
  return out
}
