// Lookups for the solution page #/solutions/<n>-<code> (design 3.12).
// The paths are in entityPaths.ts (solutionPath).
// Order is always the order of the issue file, or ID order. Nothing here sorts by a count.
import type {
  Conflict, Group, IssueFile, Solution, SolutionEvaluation, SolutionPractice, Step7Cell, Story, SummaryItem,
} from '@/types'
import { DATA_BASED_TAGS } from './dataBasis'
import { compareIds } from './ids'
import { stripMarkdown } from './markdown'
import {
  dataBasedNeeds, issueNeeds, needsByPriority, needsOfStakeholder, type NeedItem, type NeedPriorityGroup, type NeedSolution,
} from './needs'
import { storyStakeholderOf } from './stories'
import { conflictView, type ConflictView } from './wantList'

/** The solution for the code in the URL: one capital letter, for example "A".
 * null for an unknown or badly written code. */
export function findSolution(issue: IssueFile, code: string | undefined): Solution | null {
  if (code === undefined || !/^[A-Z]$/.test(code)) return null
  return issue.solutions.find((s) => s.id === code) ?? null
}

/** 「#2 A 名稱」 as plain text, for the page title and link names. */
export function solutionTitle(issueNumber: number, solution: Solution): string {
  return `#${issueNumber} ${solution.id} ${stripMarkdown(solution.name.text)}`
}

export interface GroupCoverage {
  group: Group
  /** true: every story of the group is covered (全部). false: some (部分). */
  full: boolean
  /** The covered stories of the group, in the group's order. */
  covered: string[]
  /** The stakeholders of every story of the group, each once, in ID order. */
  stakeholders: string[]
}

/** The W groups with at least one covered story, in file order. This is the
 * 涵蓋的相同訴求群組 column of 6.2; check_analysis.py checks that the column
 * matches the stories, so the app can work it out from the stories. */
export function solutionGroupCoverage(issue: IssueFile, solution: Solution): GroupCoverage[] {
  const covered = new Set(solution.stories)
  const stakeholderOf = storyStakeholderOf(issue)
  return issue.groups.flatMap((group) => {
    const inGroup = group.stories.filter((id) => covered.has(id))
    if (inGroup.length === 0) return []
    return [{
      group,
      full: inGroup.length === group.stories.length,
      covered: inGroup,
      stakeholders: [...new Set(group.stories.map(stakeholderOf))].sort(compareIds),
    }]
  })
}

export interface SolutionConflict {
  conflict: Conflict
  /** The covered stories in the conflict: side A first, then side B. */
  covered: string[]
}

/** The conflicts with a covered story on either side, in file order. */
export function solutionConflicts(issue: IssueFile, solution: Solution): SolutionConflict[] {
  const covered = new Set(solution.stories)
  return issue.conflicts.flatMap((conflict) => {
    const ids = [...conflict.sideA, ...conflict.sideB].filter((id) => covered.has(id))
    return ids.length === 0 ? [] : [{ conflict, covered: [...new Set(ids)] }]
  })
}

// ---------- Coverage (design 3.12, decision 50) ----------
// A need is covered when the solution lists its ID in needs.must or
// needs.shouldCould (step 6.2). Every other need of the issue is not covered,
// also a 這次不做 need. A stakeholder is covered when at least one of its
// needs is covered. The lists keep the order of step 5.2 or ID order.

export interface CoveredNeed extends NeedItem {
  /** The part of step 6.2 that lists the need for this solution. A
   * cross-issue solution (design 3.18) can also cover a need only through
   * one of its X-N groups: then the part is 'crossIssue'. */
  part: NeedSolution['part'] | 'crossIssue'
}

export interface NotCoveredNeed extends NeedItem {
  /** The other solutions that cover the need, in letter order. Empty when no
   * solution covers it (「沒有任何解法涵蓋」). */
  otherSolutions: Solution[]
}

export interface NeedCoverage {
  covered: CoveredNeed[]
  notCovered: NotCoveredNeed[]
}

/** The part of step 6.2 that lists the need in the solution, or null. */
function coveredPart(solution: Solution, needId: string): NeedSolution['part'] | null {
  if (!solution.needs) return null
  if (solution.needs.must.includes(needId)) return 'must'
  if (solution.needs.shouldCould.includes(needId)) return 'shouldCould'
  return null
}

/** Splits the given needs into covered and not covered. Keeps their order. */
function splitNeeds(items: NeedItem[], solution: Solution): NeedCoverage {
  const out: NeedCoverage = { covered: [], notCovered: [] }
  for (const item of items) {
    const part = coveredPart(solution, item.need.id)
    if (part) out.covered.push({ ...item, part })
    else {
      const otherSolutions = item.solutions.map((s) => s.solution).filter((s) => s.id !== solution.id)
      out.notCovered.push({ ...item, otherSolutions })
    }
  }
  return out
}

/** The needs of the issue that the solution covers and does not cover, in
 * the order of step 5.2. In the old format (needs is null), nothing is covered. */
export function solutionNeedCoverage(issue: IssueFile, solution: Solution): NeedCoverage {
  return splitNeeds(issueNeeds(issue), solution)
}

export interface StakeholderCoverage extends NeedCoverage {
  /** The stakeholder ID. */
  id: string
}

export interface SolutionStakeholderCoverage {
  covered: StakeholderCoverage[]
  notCovered: StakeholderCoverage[]
}

/** The stakeholders of the issue (step 1) that the solution covers and does
 * not cover, in ID order. Each one comes with its own needs, split into
 * covered and not covered. A need with several stories of the stakeholder
 * shows once. */
export function solutionStakeholderCoverage(issue: IssueFile, solution: Solution): SolutionStakeholderCoverage {
  const out: SolutionStakeholderCoverage = { covered: [], notCovered: [] }
  const ids = issue.stakeholders.map((s) => s.id).sort(compareIds)
  for (const id of ids) {
    const coverage = { id, ...splitNeeds(needsOfStakeholder(issue, id), solution) }
    if (coverage.covered.length > 0) out.covered.push(coverage)
    else out.notCovered.push(coverage)
  }
  return out
}

/** 解開的衝突: the conflicts whose 以需求為本的解方 lists the solution, in
 * file order, with their sides, needs and way out. */
export function solutionWayOutConflicts(issue: IssueFile, solution: Solution): ConflictView[] {
  return issue.conflicts
    .filter((c) => c.wayOutSolutions.includes(solution.id))
    .map((c) => conflictView(issue, c))
}

/** 相關的衝突 on the 總覽 tab (design 3.12): the conflicts with a covered
 * story on either side, but not the ones whose way out lists the solution
 * (those show under 解開的衝突). File order. */
export function solutionRelatedConflicts(issue: IssueFile, solution: Solution): SolutionConflict[] {
  return solutionConflicts(issue, solution).filter((c) => !c.conflict.wayOutSolutions.includes(solution.id))
}

/** The 「只看有資料根據」 filter on a coverage: with on, keep only the needs
 * with a [實證] or [AI整理] 以便… cell (dataBasedNeeds). Keeps the order. */
export function dataBasedCoverage(coverage: NeedCoverage, on: boolean): NeedCoverage {
  if (!on) return coverage
  return { covered: dataBasedNeeds(coverage.covered), notCovered: dataBasedNeeds(coverage.notCovered) }
}

export type CoveragePriorityGroup<T extends NeedItem> = NeedPriorityGroup<T>

/** The 需求 tab (design 3.12): the covered and the not covered needs, each
 * grouped by the need's own priority in the fixed order M, S, C, W. Inside
 * a group, the order of step 5.2. Empty groups are left out. */
export function coverageByPriority(coverage: NeedCoverage): {
  covered: CoveragePriorityGroup<CoveredNeed>[]
  notCovered: CoveragePriorityGroup<NotCoveredNeed>[]
} {
  return { covered: needsByPriority(coverage.covered), notCovered: needsByPriority(coverage.notCovered) }
}

/** The needs of one stakeholder in one issue. */
export interface IssueNeedCoverage extends NeedCoverage {
  issueNumber: number
}

/** One stakeholder on the 利害關係人 tab, with its needs split by issue. An
 * issue solution has one issue. A cross-issue solution (Task N11, design
 * 3.18) can have several, in issue number order. */
export interface StakeholderEntry {
  id: string
  issues: IssueNeedCoverage[]
}

/** The stakeholder coverage of an issue solution in the shape of the
 * 利害關係人 tab: one issue per stakeholder. Keeps the ID order. */
export function stakeholderEntries(
  issueNumber: number,
  coverage: SolutionStakeholderCoverage,
): { covered: StakeholderEntry[]; notCovered: StakeholderEntry[] } {
  const entry = ({ id, covered, notCovered }: StakeholderCoverage): StakeholderEntry => ({
    id,
    issues: [{ issueNumber, covered, notCovered }],
  })
  return { covered: coverage.covered.map(entry), notCovered: coverage.notCovered.map(entry) }
}

// ---------- 訴求 tab (decision 103) ----------
// A want is the 我想要… cell of one story, so one want is one story. A want is
// covered when the solution covers the need of its story.

export interface WantCoverage {
  /** The stories whose need the solution covers, in the order of step 3. */
  covered: Story[]
  /** The stories whose need the solution does not cover, in the order of step 3. */
  notCovered: Story[]
}

/** The stories of the covered and the not covered needs. A story that is in
 * neither list of needs is left out (a cross-issue solution lists only the
 * covered needs of an issue that is not in its parts). Keeps the order of
 * issue.stories. */
export function wantsOfCoverage(issue: IssueFile, coverage: NeedCoverage): WantCoverage {
  const ids = (needs: NeedItem[]) => new Set(needs.flatMap((n) => n.stories.map((s) => s.id)))
  const covered = ids(coverage.covered)
  const notCovered = ids(coverage.notCovered)
  return {
    covered: issue.stories.filter((s) => covered.has(s.id)),
    notCovered: issue.stories.filter((s) => notCovered.has(s.id) && !covered.has(s.id)),
  }
}

/** The 訴求 tab of an issue solution: every story of the issue, split by
 * whether the solution covers its need (solutionNeedCoverage). */
export function solutionWantCoverage(issue: IssueFile, solution: Solution): WantCoverage {
  return wantsOfCoverage(issue, solutionNeedCoverage(issue, solution))
}

// ---------- 相關政策 tab (decisions 103 and 104) ----------

export interface PracticeSides {
  /** 國內: domestic is true. Every dependency row is here. File order. */
  domestic: SolutionPractice[]
  /** 國外: domestic is false. File order. */
  foreign: SolutionPractice[]
}

/** The practices of a solution split into 國內 and 國外. Keeps the file order. */
export function practiceSides(practices: SolutionPractice[]): PracticeSides {
  return {
    domestic: practices.filter((p) => p.domestic),
    foreign: practices.filter((p) => !p.domestic),
  }
}

// ---------- 潛在風險, 可能爭議, 法規障礙 and 執行計畫 tabs (decisions 140 and 143) ----------

/** The three tabs with the concerns of a solution (decision 143). */
export type ConcernTab = 'risks' | 'controversies' | 'legal'

/** The step 7 evaluation rows of each concern tab, in file order:
 * 潛在風險 gets 其他顧慮與風險 and 災害風險; 可能爭議 gets 隱私; 法規障礙
 * gets 相關法規 (decision 143). The 可行性 row is on the 執行計畫 tab. */
export const CONCERN_STEP7_ROWS: Record<ConcernTab, (keyof SolutionEvaluation)[]> = {
  risks: ['risks', 'disasters'],
  controversies: ['privacy'],
  legal: ['laws'],
}

/** One item of a concern tab: a 分析摘要 row that names the solution, or a
 * step 7 evaluation row. */
export type ConcernItem =
  | { kind: 'summary'; item: SummaryItem }
  | { kind: 'step7'; key: keyof SolutionEvaluation; parts: Step7Cell }

/** The items of a concern tab: first the 分析摘要 rows of the topic that
 * name the solution (`controversies` or `legal`, file order), then the step 7
 * rows (CONCERN_STEP7_ROWS). 潛在風險 has no 分析摘要 topic, so it has only
 * step 7 rows. The same for an issue solution and a cross-issue solution. */
export function concernItems(
  sol: { evaluation: SolutionEvaluation; controversies: SummaryItem[]; legal: SummaryItem[] },
  tab: ConcernTab,
): ConcernItem[] {
  return [
    ...(tab === 'risks' ? [] : sol[tab]).map((item): ConcernItem => ({ kind: 'summary', item })),
    ...CONCERN_STEP7_ROWS[tab].map((key): ConcernItem => ({ kind: 'step7', key, parts: sol.evaluation[key] })),
  ]
}

/** True when the item has nothing but 【待補】: a 分析摘要 row whose 說明 is
 * 【待補】, or a step 7 row whose parts are all 【待補】. */
export function concernPending(c: ConcernItem): boolean {
  return c.kind === 'summary' ? c.item.text.pending : c.parts.every((p) => p.pending)
}

/** The count in the tab label (decision 140): the number of items that are
 * not only 【待補】 (concernPending), the same rule as 「弱勢 M」 (decision
 * 109). The count does not change with a filter (decision 49). */
export function concernCount(items: ConcernItem[]): number {
  return items.filter((c) => !concernPending(c)).length
}

/** The items shown with 「只看有資料根據」 (decision 140). With the filter on,
 * an item stays when it has a part tagged [實證] or [AI整理]. So [AI模擬]
 * items and 【待補】 items are hidden, as on the old 分析摘要 tabs
 * (decision 108). Keeps the order. */
export function concernItemsShown(items: ConcernItem[], dataBasedOnly: boolean): ConcernItem[] {
  if (!dataBasedOnly) return items
  return items.filter((c) =>
    c.kind === 'summary' ? DATA_BASED_TAGS.includes(c.item.text.tag) : c.parts.some((p) => DATA_BASED_TAGS.includes(p.tag)))
}

/** Each pair of brackets is closed inside the text. */
function balanced(text: string): boolean {
  for (const [open, close] of [['（', '）'], ['「', '」'], ['(', ')'], ['【', '】']]) {
    if (text.split(open).length !== text.split(close).length) return false
  }
  return true
}

/** The phases of a 執行步驟 cell, for a list (decision 140): the cell split
 * at 「；」. null when the cell does not split cleanly, so it is shown as
 * text: a cell with more than one part (more than one tag), a 【待補】 cell,
 * fewer than 2 pieces, an empty piece, or a piece with an open bracket (a
 * 「；」 inside brackets). */
export function planPhases(cell: Step7Cell): string[] | null {
  if (cell.length !== 1 || cell[0].pending) return null
  const pieces = cell[0].text.split('；').map((p) => p.trim())
  if (pieces.length < 2 || pieces.some((p) => p === '' || !balanced(p))) return null
  return pieces
}
