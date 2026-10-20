// The stakeholder filter and menu (design 3.14), and the side bar filters
// (design 3.21, decisions 67 and 68). One stakeholder at a time, set in the
// URL as ?stakeholder=<id>. The menu is in ID order. Nothing here sorts by a
// count.
import type { Stakeholder } from '@/types'
import { FILTER_PARAM, isDataBasisFilterOn } from './dataBasis'
import { compareIds } from './ids'
import { FOCUS_ORDER } from './issues'
import { filterStakeholders, findStakeholder, resolveId } from './stakeholders'

export const STAKEHOLDER_PARAM = 'stakeholder'

/** 只看跨議題 in the URL: ?cross=1. Old links from the issue cards use it too. */
export const CROSS_PARAM = 'cross'

/** A 特別關注 chip in the URL: ?special=<group>, once per picked group. The
 * name is not "focus", because ?focus= is the jump to an item (design 3.2). */
export const SPECIAL_PARAM = 'special'

/** The stakeholder picked in the URL. A moved ID becomes the new ID. null
 * when there is no value, or when the ID is unknown or not in issueIds (the
 * filter is then off). */
export function stakeholderFilterOf(
  params: URLSearchParams,
  issueIds: string[],
  stakeholders: Stakeholder[],
): string | null {
  const value = params.get(STAKEHOLDER_PARAM)
  if (!value) return null
  const id = resolveId(stakeholders, value)
  return id !== null && issueIds.includes(id) ? id : null
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
 * stakeholder, cross and special are kept (every special value). pick,
 * focus and any other value are dropped. "" when nothing is kept. */
export function keptSearch(params: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const key of [FILTER_PARAM, STAKEHOLDER_PARAM, CROSS_PARAM]) {
    const value = params.get(key)
    if (value !== null) next.set(key, value)
  }
  for (const value of params.getAll(SPECIAL_PARAM)) next.append(SPECIAL_PARAM, value)
  const s = next.toString()
  return s ? `?${s}` : ''
}

export interface MenuGroup {
  /** 組織 (O) or 個人 (I). */
  group: 'O' | 'I'
  /** In ID order, each ID once. */
  items: Stakeholder[]
}

/** The menu items in two groups, O then I, each in ID order (compareIds).
 * An empty group is left out. An unknown ID is kept with the ID as its name. */
export function menuGroups(ids: string[], stakeholders: Stakeholder[]): MenuGroup[] {
  const sorted = [...new Set(ids)].sort(compareIds)
  return (['O', 'I'] as const)
    .map((group) => ({
      group,
      items: sorted.filter((id) => id.startsWith(group)).map((id) => findStakeholder(stakeholders, id)),
    }))
    .filter((g) => g.items.length > 0)
}

/** The search part of a link in the menu on the issue page (filter mode):
 * the kept values of keptSearch, with the filter set to id. null removes the
 * filter (「全部利害關係人」). pick and focus are dropped. "" when nothing is left. */
export function stakeholderMenuSearch(params: URLSearchParams, id: string | null): string {
  const next = withStakeholderFilter(new URLSearchParams(keptSearch(params)), id)
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** The filters of the side bar (decision 67). */
export interface SideBarFilters {
  /** 只看有資料根據 (?evidence=1). It changes the counts, never the menu items. */
  dataBasedOnly: boolean
  /** 只看跨議題 (?cross=1): only the stakeholders in 2 or more issues. */
  crossIssueOnly: boolean
  /** The picked 特別關注 groups (?special=), in FOCUS_ORDER, each once. */
  special: string[]
}

/** The side bar filters in the URL. Only "1" turns evidence and cross on.
 * special keeps only the groups of FOCUS_ORDER, in that order. On the issue
 * page ('issue'), cross and special are not side bar filters, so they are
 * always off there. */
export function sideBarFiltersOf(params: URLSearchParams, page: 'stakeholders' | 'issue' = 'stakeholders'): SideBarFilters {
  const dataBasedOnly = isDataBasisFilterOn(params)
  if (page === 'issue') return { dataBasedOnly, crossIssueOnly: false, special: [] }
  const picked = params.getAll(SPECIAL_PARAM)
  return {
    dataBasedOnly,
    crossIssueOnly: params.get(CROSS_PARAM) === '1',
    special: FOCUS_ORDER.filter((f) => picked.includes(f)),
  }
}

/** The IDs that the side menu lists, in ID order, each once. 只看跨議題 and
 * 特別關注 use the same rule as filterStakeholders. The data filter does not
 * change the list. current (the stakeholder of the page) is always kept,
 * also when it is not in ids. An unknown ID is kept only when no filter is on. */
export function menuIdsFor(ids: string[], stakeholders: Stakeholder[], filters: SideBarFilters, current: string | null): string[] {
  const filter = { crossIssueOnly: filters.crossIssueOnly, focus: filters.special }
  const on = filter.crossIssueOnly || filter.focus.length > 0
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
 * removed (stakeholder, evidence, cross, special). Every other value is
 * kept. "" when nothing is left. */
export function clearFiltersSearch(params: URLSearchParams): string {
  const next = new URLSearchParams(params)
  for (const key of [STAKEHOLDER_PARAM, FILTER_PARAM, CROSS_PARAM, SPECIAL_PARAM]) next.delete(key)
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** One filter in the filter status line. */
export type FilterStatusPart =
  | { kind: 'stakeholder'; id: string; name: string }
  | { kind: 'dataBased' }
  | { kind: 'crossIssue' }
  | { kind: 'special'; groups: string[] }

/** The filters that are on, for the filter status line (decision 68), in
 * this order: the stakeholder (pass null on the stakeholder page, where the
 * stakeholder is not a filter), 只看有資料根據, 只看跨議題, 特別關注. Empty
 * when no filter is on. The component adds what is shown. */
export function filterStatusParts(filters: SideBarFilters, stakeholder: Stakeholder | null): FilterStatusPart[] {
  const parts: FilterStatusPart[] = []
  if (stakeholder !== null) parts.push({ kind: 'stakeholder', id: stakeholder.id, name: stakeholder.name })
  if (filters.dataBasedOnly) parts.push({ kind: 'dataBased' })
  if (filters.crossIssueOnly) parts.push({ kind: 'crossIssue' })
  if (filters.special.length > 0) parts.push({ kind: 'special', groups: [...filters.special] })
  return parts
}
