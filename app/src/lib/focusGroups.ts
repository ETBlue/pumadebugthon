// 特別關注族群 (design 3.2, 3.9): which of the 6 groups have stakeholders in an
// issue. The groups are always in the fixed order FOCUS_ORDER, never ordered
// by a count. Never sort, rank or filter issues by these numbers (design 13).
import type { Cell, CellCounts, IssueFile, IssueSummary, Stakeholder } from '@/types'
import { storyCells } from './cellBasis'
import { FOCUS_ORDER } from './issues'

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
  /** False when the group has no stakeholder in this issue. */
  included: boolean
  /** True when a person decided not to include the group (「本議題不納入」).
   * False for a group that is included, or not included yet (「本議題尚未納入」). */
  excluded: boolean
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
      excluded: ids.length === 0 && g.excluded,
    }
  })
}

/** The 特別關注族群 lines of the issue card, in the fixed order: the groups not
 * included yet (gaps), and the groups a person decided not to include
 * (excluded). 'all' when every group is included. null for an issue without
 * an analysis. Never a count like "4 of 6": it would read like a score. */
export function focusGapsText(
  issue: IssueSummary,
): { kind: 'gaps'; groups: string[]; excluded: string[] } | { kind: 'all' } | null {
  if (!issue.available) return null
  const excluded = inFocusOrder(issue.focusExcluded, (g) => g)
  if (issue.focusGaps.length === 0 && excluded.length === 0) return { kind: 'all' }
  return { kind: 'gaps', groups: inFocusOrder(issue.focusGaps, (g) => g), excluded }
}
