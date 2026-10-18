// The 訴求 list page #/wants. A 訴求 is a pick item of the opinion check
// (design 4.1): each W group once, plus each story with no W group.
// Order: issue number, then the order of the pick list. Never by a count.
import type { IssueFile } from '@/types'
import { dataBasedPickList, withDataBasisFilter } from './dataBasis'
import { tabPath } from './issuePage'
import { filterPickList, pickList, type PickItem } from './opinion'

export interface WantGroup {
  issueNumber: number
  title: string
  items: PickItem[]
}

export interface WantFilter {
  /** Search text, as in the opinion check (filterPickList). */
  query: string
  /** 「只看有資料根據」: keep items with at least one [實證] or [AI整理] story. */
  dataBasedOnly: boolean
}

/** The 訴求 of the given issue files, grouped by issue. Issues with no
 * matching item are left out. */
export function wantGroups(issues: IssueFile[], filter: WantFilter): WantGroup[] {
  return [...issues]
    .sort((a, b) => a.number - b.number)
    .map((issue) => {
      const all = pickList(issue)
      const listed = filter.dataBasedOnly ? dataBasedPickList(all, issue.stories) : all
      return { issueNumber: issue.number, title: issue.title, items: filterPickList(listed, filter.query) }
    })
    .filter((g) => g.items.length > 0)
}

/** The link to the opinion check of the issue with this item picked, for
 * example #/issues/2/opinion?pick=W08. Keeps ?evidence=1 when the filter is on. */
export function opinionPickTo(issueNumber: number, key: string, dataBasedOnly: boolean): { pathname: string; search: string } {
  const params = withDataBasisFilter(new URLSearchParams({ pick: key }), dataBasedOnly)
  return { pathname: tabPath(issueNumber, 'opinion'), search: `?${params.toString()}` }
}
