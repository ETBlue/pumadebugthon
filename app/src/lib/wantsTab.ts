// The 訴求 and 衝突 tabs of the issue page (design 3.2, section 4,
// decision 142): the wants (the opinion check pick list) and the conflicts,
// with the stakeholder filter and the 「只看有資料根據」 filter. Both tabs use
// the same view, so a want lists only the conflicts the 衝突 tab shows. The lists keep the order of the file.
// Nothing here sorts by a count.
import type { IssueFile } from '@/types'
import { dataBasedPickList } from './dataBasis'
import { keptSearch } from './stakeholderFilter'
import {
  conflictsForStakeholder, conflictsForStakeholderSet, conflictView, issueWants, wantsForStakeholder, wantsForStakeholderSet,
  type ConflictView, type WantItem,
} from './wantList'

export interface WantsTabView {
  /** The wants to list, in the order of pickList. */
  wants: WantItem[]
  /** The conflicts to show, in file order. */
  conflicts: ConflictView[]
}

/** What the 訴求 tab (wants) and the 衝突 tab (conflicts) show.
 * - stakeholder: only the wants with a story of this stakeholder, and only
 *   the conflicts with a story of this stakeholder on either side. null: all.
 * - dataBasedOnly: only the wants with at least one story that has a
 *   [實證] or [AI整理] cell. It does not hide a conflict. The stories inside
 *   a conflict are filtered where they are shown.
 * - special: the 特別關注 filter (decision 75), the stakeholders of the
 *   picked groups (specialStakeholderIds). Only the wants with a story of
 *   one of them, and only the conflicts with such a story on either side.
 *   null: off. It works together with the other two filters.
 * With a stakeholder or special, each want's conflicts are only the ones shown. */
export function wantsTabView(
  issue: IssueFile,
  stakeholder: string | null,
  dataBasedOnly: boolean,
  special: ReadonlySet<string> | null = null,
): WantsTabView {
  const byStakeholder = wantsForStakeholderSet(wantsForStakeholder(issueWants(issue), stakeholder), special)
  let wants = byStakeholder
  if (dataBasedOnly) {
    const dataKeys = new Set(dataBasedPickList(byStakeholder, issue.stories).map((i) => i.key))
    wants = byStakeholder.filter((w) => dataKeys.has(w.key))
  }
  const bySpecial = new Set(conflictsForStakeholderSet(issue, special).map((c) => c.id))
  const kept = conflictsForStakeholder(issue, stakeholder).filter((c) => bySpecial.has(c.id))
  const conflicts = kept.map((c) => conflictView(issue, c))
  // With a filter, a want lists only the conflicts on the tab. A W group can
  // be in a conflict through another stakeholder's story, and that conflict
  // is hidden, so its 「有衝突」 link would point to nothing.
  if (stakeholder !== null || special !== null) {
    const shown = new Set(kept.map((c) => c.id))
    wants = wants.map((w) => ({ ...w, conflicts: w.conflicts.filter((c) => shown.has(c.id)) }))
  }
  return { wants, conflicts }
}

/** The search part after a pick in the opinion check: ?pick=<key>, plus
 * evidence and stakeholder when they are set. focus is dropped. */
export function pickSearch(params: URLSearchParams, key: string): string {
  const next = new URLSearchParams(keptSearch(params))
  next.set('pick', key)
  return `?${next.toString()}`
}
