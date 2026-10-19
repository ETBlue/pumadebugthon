// The stakeholder filter and menu (design 3.14). One stakeholder at a time,
// set in the URL as ?stakeholder=<id>. The menu is in ID order. Nothing here
// sorts by a count.
import type { Stakeholder } from '@/types'
import { FILTER_PARAM } from './dataBasis'
import { compareIds } from './ids'
import { findStakeholder, resolveId } from './stakeholders'

export const STAKEHOLDER_PARAM = 'stakeholder'

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

/** The search part for a tab change: only evidence and stakeholder are kept.
 * pick, focus and any other value are dropped. "" when nothing is kept. */
export function keptSearch(params: URLSearchParams): string {
  const next = new URLSearchParams()
  for (const key of [FILTER_PARAM, STAKEHOLDER_PARAM]) {
    const value = params.get(key)
    if (value !== null) next.set(key, value)
  }
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
