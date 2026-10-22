// 特別關注族群 (design 3.2, 3.9): which of the 6 groups have stakeholders in an
// issue. The groups are always in the fixed order FOCUS_ORDER, never ordered
// by a count. Never sort, rank or filter issues by these numbers (design 13).
import type { Cell, CellCounts, IssueFile, IssueSummary, Stakeholder, SummaryItem } from '@/types'
import { storyCells } from './cellBasis'
import { FOCUS_ORDER } from './issues'
import { summaryGroupTag, summaryItemsOf } from './summary'

export interface FocusRow {
  /** 特別關注, for example 「高齡」. */
  tag: string
  /** The stakeholders of this issue in the group, in the order of the file. */
  stakeholders: { id: string; name: string }[]
  /** The stories of those stakeholders in this issue. Each story counts once. */
  stories: number
  /** 資料根據 of those stories (我想要… and 以便… cells). */
  cells: CellCounts
  /** 說明. null for 「—」. */
  note: Cell | null
  /** False when the group has no stakeholder in this issue (「本議題尚未納入」). */
  included: boolean
}

/** The position of a group in FOCUS_ORDER. An unknown group goes last. */
function focusRank(tag: string): number {
  const i = (FOCUS_ORDER as readonly string[]).indexOf(tag)
  return i === -1 ? FOCUS_ORDER.length : i
}

/** The groups in the fixed order. Unknown groups keep their own order, after the known ones. */
export function inFocusOrder<T>(items: T[], tagOf: (item: T) => string): T[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => focusRank(tagOf(a.item)) - focusRank(tagOf(b.item)) || a.i - b.i)
    .map((x) => x.item)
}

/** One row per group of the 特別關注族群檢查 table, in the fixed order. */
export function focusRows(issue: IssueFile, stakeholders: Stakeholder[]): FocusRow[] {
  const names = new Map(stakeholders.map((s) => [s.id, s.name]))
  return inFocusOrder(issue.focusGroups, (g) => g.tag).map((g) => {
    const ids = [...new Set(g.stakeholders)]
    const stories = issue.stories.filter((s) => ids.includes(s.stakeholder))
    return {
      tag: g.tag,
      stakeholders: ids.map((id) => ({ id, name: names.get(id) ?? id })),
      stories: stories.length,
      cells: storyCells(stories),
      note: g.note,
      included: ids.length > 0,
    }
  })
}

/** One group (decision 109): the row of the
 * 特別關注族群檢查 and the row of the 分析摘要 topic 受影響較大的弱勢族群
 * with the same group name. One of the two can be missing (null). */
export interface DisadvantagedGroup {
  tag: string
  focus: FocusRow | null
  item: SummaryItem | null
}

/** The disadvantaged groups of an issue, each one once, in the fixed order
 * FOCUS_ORDER (never by a count). A 分析摘要 row matches a group by its name
 * without the note in brackets (summaryGroupTag). A group in only one of the
 * two lists is still a group. Unknown groups go last: first those of the
 * 特別關注族群檢查, then those of the 分析摘要, each in file order. */
export function disadvantagedGroups(issue: IssueFile, stakeholders: Stakeholder[]): DisadvantagedGroup[] {
  const groups: DisadvantagedGroup[] = focusRows(issue, stakeholders).map((focus) => ({ tag: focus.tag, focus, item: null }))
  for (const item of summaryItemsOf(issue, 'disadvantaged')) {
    const tag = summaryGroupTag(item)
    const group = groups.find((g) => g.tag === tag && g.item === null)
    if (group) group.item = item
    else groups.push({ tag, focus: null, item })
  }
  return inFocusOrder(groups, (g) => g.tag)
}

/** The groups that the issue has not included yet, in the fixed order
 * (the line 「本議題尚未納入：…」 of the 利害關係人 tab, decision 115). A
 * group is not included when its 特別關注族群 check row has no stakeholder,
 * or, when it has no check row, when its 分析摘要 row is 【待補】. This is
 * the same rule as the old group cards (decision 109). */
export function groupsNotIncluded(issue: IssueFile, stakeholders: Stakeholder[]): string[] {
  return disadvantagedGroups(issue, stakeholders)
    .filter((g) => (g.focus ? !g.focus.included : g.item?.text.pending === true))
    .map((g) => g.tag)
}

/** The 特別關注族群 line of the issue card: the groups not included yet, in the
 * fixed order, or 'all' when every group is included. null for an issue
 * without an analysis. Never a count like "4 of 6": it would read like a score. */
export function focusGapsText(issue: IssueSummary): { kind: 'gaps'; groups: string[] } | { kind: 'all' } | null {
  if (!issue.available) return null
  if (issue.focusGaps.length === 0) return { kind: 'all' }
  return { kind: 'gaps', groups: inFocusOrder(issue.focusGaps, (g) => g) }
}
