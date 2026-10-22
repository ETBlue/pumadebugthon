// The stakeholder filter and menu (design 3.14), and the side bar filters
// (design 3.21, decisions 67 and 68). One stakeholder at a time, set in the
// URL as ?stakeholder=<id>. The menu is in ID order. Nothing here sorts by a
// count.
import type { Priority, Stakeholder } from '@/types'
import { FILTER_PARAM, isDataBasisFilterOn } from './dataBasis'
import { compareIds } from './ids'
import { FOCUS_ORDER } from './issues'
import { PRIORITIES } from './priority'
import { filterStakeholders, listedStakeholders } from './stakeholders'

export const STAKEHOLDER_PARAM = 'stakeholder'

/** A 特別關注 chip in the URL: ?special=<group>, once per picked group. The
 * name is not "focus", because ?focus= is the jump to an item (design 3.2). */
export const SPECIAL_PARAM = 'special'

/** 只看跨議題 on the issue's 利害關係人 tab (decision 121): ?cross=1. Only
 * "1" turns it on. Only that tab reads it, so a tab change drops it
 * (keptSearch). The old ?cross=1 of #/stakeholders is not read any more
 * (decision 110), so the name is free on the issue page. */
export const CROSS_PARAM = 'cross'

/** The 優先順序 filter of the issue's 需求 tab (decision 127):
 * ?priority=<M|S|C|W>, once per picked priority. The values are the
 * priority letters of the data (Priority). Only the 需求 tab reads it, so a
 * tab change drops it (keptSearch). */
export const PRIORITY_PARAM = 'priority'

/** 只看有衝突的需求 on the issue's 需求 tab (decision 127): ?conflict=1.
 * Only "1" turns it on. Only the 需求 tab reads it, so a tab change drops
 * it (keptSearch). */
export const CONFLICT_PARAM = 'conflict'

/** The picked priorities in the URL (decision 127), in the fixed order M,
 * S, C, W, each once. Unknown values are ignored, as for ?special=. */
export function priorityFilterOf(params: URLSearchParams): Priority[] {
  const picked = params.getAll(PRIORITY_PARAM)
  return PRIORITIES.filter((p) => picked.includes(p))
}

/** A copy of params with these priorities (priority=, once per priority,
 * in the order M, S, C, W). Unknown values are dropped. An empty list
 * removes the value. Other values are kept. */
export function withPriorityFilter(params: URLSearchParams, priorities: string[]): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(PRIORITY_PARAM)
  for (const p of PRIORITIES) if (priorities.includes(p)) next.append(PRIORITY_PARAM, p)
  return next
}

/** 只看有衝突的需求 in the URL (decision 127). On only with ?conflict=1 and
 * when the issue has a conflict (hasConflicts), because the toggle is
 * hidden otherwise. Any other value is ignored, as for ?evidence=. */
export function conflictFilterOf(params: URLSearchParams, hasConflicts: boolean): boolean {
  return hasConflicts && params.get(CONFLICT_PARAM) === '1'
}

/** A copy of params with 只看有衝突的需求 on (conflict=1) or off (no
 * conflict). Other values are kept. */
export function withConflictFilter(params: URLSearchParams, on: boolean): URLSearchParams {
  const next = new URLSearchParams(params)
  if (on) next.set(CONFLICT_PARAM, '1')
  else next.delete(CONFLICT_PARAM)
  return next
}

/** The search part of 「清除篩選」 on the issue's 需求 tab (decision 127):
 * the side bar filters (clearFiltersSearch) and the two filters of this
 * tab (priority, conflict) are removed. Every other value is kept. "" when
 * nothing is left. */
export function clearNeedsTabSearch(params: URLSearchParams): string {
  const next = new URLSearchParams(params)
  for (const key of [STAKEHOLDER_PARAM, FILTER_PARAM, SPECIAL_PARAM, PRIORITY_PARAM, CONFLICT_PARAM]) next.delete(key)
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** 只看跨議題 in the URL (decision 121). On only with ?cross=1 and when 2 or
 * more issues are available (issueCount), because the toggle is hidden
 * with fewer. Any other value is ignored, as for ?evidence=. */
export function crossFilterOf(params: URLSearchParams, issueCount: number): boolean {
  return issueCount >= 2 && params.get(CROSS_PARAM) === '1'
}

/** A copy of params with 只看跨議題 on (cross=1) or off (no cross). Other
 * values are kept. */
export function withCrossFilter(params: URLSearchParams, on: boolean): URLSearchParams {
  const next = new URLSearchParams(params)
  if (on) next.set(CROSS_PARAM, '1')
  else next.delete(CROSS_PARAM)
  return next
}

/** The search part of 「清除篩選」 on the issue's 利害關係人 tab (decision
 * 121): the three filters of the tab are removed (special, cross,
 * evidence). Every other value is kept (also ?stakeholder=, which this tab
 * does not use, but the other tabs do). "" when nothing is left. */
export function clearStakeholdersTabSearch(params: URLSearchParams): string {
  const next = new URLSearchParams(params)
  for (const key of [SPECIAL_PARAM, CROSS_PARAM, FILTER_PARAM]) next.delete(key)
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** The stakeholder picked in the URL. null when there is no value, or when
 * the ID is unknown, moved or not in issueIds (the filter is then off). A
 * moved ID is not changed to the new ID (decision 113). */
export function stakeholderFilterOf(
  params: URLSearchParams,
  issueIds: string[],
  stakeholders: Stakeholder[],
): string | null {
  const value = params.get(STAKEHOLDER_PARAM)
  if (!value) return null
  const found = stakeholders.find((s) => s.id === value && s.movedTo === null)
  return found && issueIds.includes(found.id) ? found.id : null
}

/** A copy of params with the filter set to id. null removes it (「全部利害關係人」).
 * Other values are kept. */
export function withStakeholderFilter(params: URLSearchParams, id: string | null): URLSearchParams {
  const next = new URLSearchParams(params)
  if (id === null) next.delete(STAKEHOLDER_PARAM)
  else next.set(STAKEHOLDER_PARAM, id)
  return next
}

/** The search part for a tab change and for a side bar link: only evidence,
 * stakeholder and special are kept (every special value). pick, focus and
 * any other value are dropped. cross is dropped too, because only the
 * 利害關係人 tab uses it (decision 121). priority and conflict are dropped,
 * because only the 需求 tab uses them (decision 127). "" when nothing is
 * kept. */
export function keptSearch(params: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const key of [FILTER_PARAM, STAKEHOLDER_PARAM]) {
    const value = params.get(key)
    if (value !== null) next.set(key, value)
  }
  for (const value of params.getAll(SPECIAL_PARAM)) next.append(SPECIAL_PARAM, value)
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** The search part after a pick in the stakeholder picker of the issue tabs
 * (decision 116; before, a link in the side menu):
 * the kept values of keptSearch, with the filter set to id. null removes the
 * filter (「全部利害關係人」). pick and focus are dropped. "" when nothing is left. */
export function stakeholderMenuSearch(params: URLSearchParams, id: string | null): string {
  const next = withStakeholderFilter(new URLSearchParams(keptSearch(params)), id)
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** The filters of the side bar on the issue page (decisions 67 and 75).
 * The stakeholder page uses only dataBasedOnly (decision 94). */
export interface SideBarFilters {
  /** 只看有資料根據 (?evidence=1). It changes the counts, never the menu items. */
  dataBasedOnly: boolean
  /** The picked 特別關注 groups (?special=), in FOCUS_ORDER, each once. */
  special: string[]
}

/** The side bar filters in the URL. Only "1" turns evidence on. special
 * keeps only the groups of FOCUS_ORDER, in that order. */
export function sideBarFiltersOf(params: URLSearchParams): SideBarFilters {
  const picked = params.getAll(SPECIAL_PARAM)
  return {
    dataBasedOnly: isDataBasisFilterOn(params),
    special: FOCUS_ORDER.filter((f) => picked.includes(f)),
  }
}

/** The IDs that the stakeholder picker of the issue tabs lists (decision
 * 116; before, the side menu), in ID order, each once. 特別關注 uses
 * the same rule as filterStakeholders. The data filter does not change the
 * list. current (the picked stakeholder) is always kept, also when it is not
 * in ids. An unknown ID is kept only when no filter is on. */
export function menuIdsFor(ids: string[], stakeholders: Stakeholder[], filters: SideBarFilters, current: string | null): string[] {
  const filter = { crossIssueOnly: false, focus: filters.special }
  const on = filter.focus.length > 0
  const kept = [...new Set(ids)].filter((id) => {
    if (id === current) return true
    const s = stakeholders.find((x) => x.id === id)
    if (!s) return !on
    return filterStakeholders([s], filter).length === 1
  })
  if (current !== null && !kept.includes(current)) kept.push(current)
  return kept.sort(compareIds)
}

/** The search part of 「清除篩選」 (decision 68): every side bar filter is
 * removed (stakeholder, evidence, special). Every other value is kept. ""
 * when nothing is left. */
export function clearFiltersSearch(params: URLSearchParams): string {
  const next = new URLSearchParams(params)
  for (const key of [STAKEHOLDER_PARAM, FILTER_PARAM, SPECIAL_PARAM]) next.delete(key)
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** A copy of params with these 特別關注 groups (special=, once per group, in
 * FOCUS_ORDER). Unknown groups are dropped. An empty list removes the value.
 * Other values are kept. */
export function withSpecialFilter(params: URLSearchParams, groups: string[]): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(SPECIAL_PARAM)
  for (const f of FOCUS_ORDER) if (groups.includes(f)) next.append(SPECIAL_PARAM, f)
  return next
}

/** The 特別關注 chips of the side bar: the groups of FOCUS_ORDER that at least
 * one of these stakeholders has (only listed ones, decision 78), in FOCUS_ORDER. Unknown
 * groups are left out, because sideBarFiltersOf drops them. */
export function specialOptions(stakeholders: Stakeholder[]): string[] {
  const used = new Set(listedStakeholders(stakeholders).flatMap((s) => s.focus))
  return FOCUS_ORDER.filter((f) => used.has(f))
}

/** The 特別關注 chips of the side bar on the issue page (decision 75): the
 * groups that at least one stakeholder of the issue has (ids: the IDs of the
 * issue), in FOCUS_ORDER. Unknown IDs are left out. */
export function issueSpecialOptions(ids: string[], stakeholders: Stakeholder[]): string[] {
  return specialOptions(stakeholders.filter((s) => ids.includes(s.id)))
}

/** The 特別關注 filter of the issue page's tab content (decision 75): the
 * stakeholders of the issue (ids) with one of the picked groups, by the same
 * rule as the menu (filterStakeholders). null when no group is picked, so
 * the filter is off. An empty set when no stakeholder of the issue has a
 * picked group: then the tabs show nothing. */
export function specialStakeholderIds(ids: string[], stakeholders: Stakeholder[], groups: string[]): ReadonlySet<string> | null {
  if (groups.length === 0) return null
  const own = stakeholders.filter((s) => ids.includes(s.id))
  return new Set(filterStakeholders(own, { crossIssueOnly: false, focus: groups }).map((s) => s.id))
}

/** One filter in the filter status line. */
export type FilterStatusPart =
  | { kind: 'stakeholder'; id: string; name: string }
  | { kind: 'dataBased' }
  | { kind: 'special'; groups: string[] }
  | { kind: 'crossIssue' }
  | { kind: 'priority'; priorities: Priority[] }
  | { kind: 'conflict' }

/** The two filters of the issue's 需求 tab (decision 127). */
export interface NeedsTabFilters {
  /** The picked priorities (?priority=), in the order M, S, C, W. Empty: off. */
  priorities: Priority[]
  /** 只看有衝突的需求 (?conflict=1). */
  conflictOnly: boolean
}

/** The filters that are on, for the filter status line (decision 68), in
 * this order: the stakeholder (pass null on the stakeholder page, where the
 * stakeholder is not a filter), 只看有資料根據, 特別關注, 只看跨議題 (only
 * the issue's 利害關係人 tab has it, decision 121), then 優先順序 and
 * 只看有衝突的需求 (only the issue's 需求 tab has them, decision 127). Empty
 * when no filter is on. The component adds what is shown. */
export function filterStatusParts(
  filters: SideBarFilters,
  stakeholder: Stakeholder | null,
  crossIssueOnly = false,
  needs: NeedsTabFilters | null = null,
): FilterStatusPart[] {
  const parts: FilterStatusPart[] = []
  if (stakeholder !== null) parts.push({ kind: 'stakeholder', id: stakeholder.id, name: stakeholder.name })
  if (filters.dataBasedOnly) parts.push({ kind: 'dataBased' })
  if (filters.special.length > 0) parts.push({ kind: 'special', groups: [...filters.special] })
  if (crossIssueOnly) parts.push({ kind: 'crossIssue' })
  if (needs !== null && needs.priorities.length > 0) parts.push({ kind: 'priority', priorities: [...needs.priorities] })
  if (needs !== null && needs.conflictOnly) parts.push({ kind: 'conflict' })
  return parts
}
