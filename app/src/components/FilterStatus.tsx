import { Link, useLocation } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { priorityLabel } from '@/lib/priority'
import {
  clearFiltersSearch, filterStatusParts, type FilterStatusPart, type NeedsTabFilters, type SideBarFilters,
} from '@/lib/stakeholderFilter'
import { cn } from '@/lib/utils'
import type { Stakeholder } from '@/types'
import { linkClass } from './styles'

const tm = t.sideMenu

function partText(part: FilterStatusPart): string {
  switch (part.kind) {
    case 'stakeholder':
      return tm.statusStakeholder(part.id, part.name)
    case 'dataBased':
      return tm.statusDataBased
    case 'special':
      return tm.statusSpecial(part.groups)
    case 'crossIssue':
      return tm.statusCrossIssue
    case 'priority':
      return tm.statusPriority(part.priorities.map(priorityLabel))
    case 'conflict':
      return tm.conflictOnly
  }
}

/** The filter status line of the main block (design 3.21, decision 68). It
 * lists every side bar filter that is on, then shown (what the page shows,
 * for example tm.shownWants(2, 1)), then the link 「清除篩選」. The link
 * removes stakeholder, evidence and special, and keeps the page and
 * the other values (clearFiltersSearch).
 *
 * The element with role="status" is always in the page, so a screen reader
 * reads the new text when a filter changes. It is empty when no filter is on.
 *
 * filters: from sideBarFiltersOf(params). stakeholder: the picked
 * stakeholder on the issue page; null on the stakeholder pages, where the
 * stakeholder of the page is not a filter. crossIssueOnly: 只看跨議題 of
 * the issue's 利害關係人 tab (decision 121). needs: 優先順序 and
 * 只看有衝突的需求 of the issue's 需求 tab (decision 127). clearSearch: the
 * search part of 「清除篩選」, when the page removes other values than
 * clearFiltersSearch (the 利害關係人 tab uses clearStakeholdersTabSearch,
 * the 需求 tab clearNeedsTabSearch). */
export function FilterStatus({
  filters, stakeholder, crossIssueOnly = false, needs = null, shown, clearSearch = clearFiltersSearch, className,
}: {
  filters: SideBarFilters
  stakeholder: Stakeholder | null
  crossIssueOnly?: boolean
  needs?: NeedsTabFilters | null
  shown?: string
  clearSearch?: (params: URLSearchParams) => string
  className?: string
}) {
  const { pathname, search } = useLocation()
  const parts = filterStatusParts(filters, stakeholder, crossIssueOnly, needs)
  const on = parts.length > 0
  return (
    <p role="status" className={cn('text-sm', on && 'mb-4', className)}>
      {on && (
        <>
          {tm.status(parts.map(partText))}
          {shown}
          {' '}
          <Link
            to={{ pathname, search: clearSearch(new URLSearchParams(search)) }}
            preventScrollReset
            className={linkClass}
          >
            {tm.clear}
          </Link>
        </>
      )}
    </p>
  )
}
