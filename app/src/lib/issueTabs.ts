// What the issue page's 需求 tab and 解法 tab show (design 3.2), after the
// stakeholder filter (?stakeholder=, design 3.14) and the 「只看有資料根據」
// filter (?evidence=1, design 3.5).
// Order is always the fixed priority order, the file order of step 5.2 or
// letter order. Nothing here sorts by a count.
import type { Conflict, IssueFile, Solution } from '@/types'
import { dataBasedNeeds, issueNeeds, needsByPriority, needsForStakeholder, needsForStakeholderSet, type NeedPriorityGroup } from './needs'
import { solutionNeedCoverage, type CoveredNeed } from './solutionPage'
import { compareIds } from './ids'
import { conflictsForStakeholder, conflictsForStakeholderSet } from './wantList'

/** The conflicts that the 訴求 tab shows with these filters. */
function shownConflicts(issue: IssueFile, stakeholder: string | null, special: ReadonlySet<string> | null): Conflict[] {
  const bySpecial = new Set(conflictsForStakeholderSet(issue, special).map((c) => c.id))
  return conflictsForStakeholder(issue, stakeholder).filter((c) => bySpecial.has(c.id))
}

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
 * special: the 特別關注 filter (decision 75), the stakeholders of the picked
 * groups. Keep a need only when it has a story of one of them. null: off.
 * With a stakeholder or special, each need's conflicts are only the ones
 * that the 訴求 tab shows with the same filters. */
export function needsTabView(
  issue: IssueFile,
  stakeholder: string | null,
  dataBased: boolean,
  special: ReadonlySet<string> | null = null,
): NeedsTabView {
  const oldFormat = issue.format === 'stories'
  let items = needsForStakeholderSet(needsForStakeholder(issueNeeds(issue), stakeholder), special)
  if (dataBased) items = dataBasedNeeds(items)
  // With a filter, a need lists only the conflicts that the 訴求 tab shows
  // with the same filter. The links 「出現在衝突」 keep ?stakeholder=, so a
  // conflict with no story of the stakeholder would point to nothing.
  if (stakeholder !== null || special !== null) {
    const shown = new Set(shownConflicts(issue, stakeholder, special).map((c) => c.id))
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
  /** With a stakeholder picked or 特別關注 on: the number of covered needs
   * that these filters do not show (「這個解法還涵蓋其他 6 個需求」). The data
   * filter does not change it. 0 when neither filter is on. */
  otherNeeds: number
  /** 解開的衝突: the conflicts whose wayOutSolutions lists the solution, in
   * file order. With a stakeholder picked, only the conflicts that the 訴求
   * tab shows with the same stakeholder (conflictsForStakeholder). */
  wayOutConflicts: Conflict[]
}

/** The 解法 tab: each solution in letter order. With a stakeholder picked,
 * only the solutions that cover at least one of its needs, each with only
 * that stakeholder's needs. special (the 特別關注 filter, decision 75) works
 * the same way with the stakeholders of the picked groups, on top of the
 * stakeholder. The data filter hides needs, and it leaves out a solution
 * when it hides every need that the other filters keep (decision 74 with a
 * stakeholder, decision 77 without one). A solution that covers no need at
 * all stays when no stakeholder and no group is picked. */
export function solutionsTabView(
  issue: IssueFile,
  stakeholder: string | null,
  dataBased: boolean,
  special: ReadonlySet<string> | null = null,
): SolutionsTabItem[] {
  const out: SolutionsTabItem[] = []
  const solutions = [...issue.solutions].sort((a, b) => compareIds(a.id, b.id))
  const filtered = stakeholder !== null || special !== null
  // The conflict links keep the filters, so list only the conflicts that
  // the 訴求 tab shows with the same filters.
  const conflicts = shownConflicts(issue, stakeholder, special)
  for (const solution of solutions) {
    const covered = solutionNeedCoverage(issue, solution).covered
    const own = needsForStakeholderSet(needsForStakeholder(covered, stakeholder), special)
    if (filtered && own.length === 0) continue
    const shown = dataBased ? dataBasedNeeds(own) : own
    if (own.length > 0 && shown.length === 0) continue
    out.push({
      solution,
      must: shown.filter((n) => n.part === 'must'),
      shouldCould: shown.filter((n) => n.part === 'shouldCould'),
      otherNeeds: filtered ? covered.length - own.length : 0,
      wayOutConflicts: conflicts.filter((c) => c.wayOutSolutions.includes(solution.id)),
    })
  }
  return out
}
