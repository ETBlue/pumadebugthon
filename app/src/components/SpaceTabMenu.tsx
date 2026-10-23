import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { mergeListSearch, PAGE_SORTS, Q_MAX_LENGTH, type ListState } from '@/lib/listParams'
import { SPACE_TAB_PAGE, spaceTabParams, type SpaceListTab } from '@/lib/spaceTabs'
import type { IndexFile } from '@/types'
import { cn } from '@/lib/utils'
import { IssueMenuBar } from './IssueMenuBar'
import { BarFilter, ListSortSelect, type ListBarFilter } from './ListBar'
import { ListSearchBox, type HistoryMode } from './ListSearchBox'

/** The state of a space tab from the URL (spaceTabParams), and go: the
 * function that writes a new state to the URL. A URL with a dropped value
 * is replaced with the clean URL (history replace), as on the list pages.
 * Params that are not list params (evidence, …) are kept. */
export function useSpaceTabState(tab: SpaceListTab, index: IndexFile, issueNumbers: number[]) {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const search = params.toString()
  const key = issueNumbers.join(',')
  const parsed = useMemo(
    () => spaceTabParams(tab, new URLSearchParams(search), index, issueNumbers),
    // issueNumbers is a new array on each render; key is the real input.
    [tab, search, index, key],
  )
  const { replace, ...state } = parsed
  const page = SPACE_TAB_PAGE[tab]
  const clean = mergeListSearch(new URLSearchParams(search), page, state)
  useEffect(() => {
    if (replace) navigate({ pathname, search: clean }, { replace: true, preventScrollReset: true })
  }, [replace, clean, pathname, navigate])

  const go = (next: ListState, mode: HistoryMode = 'push') =>
    navigate(
      { pathname, search: mergeListSearch(new URLSearchParams(search), page, next) },
      { replace: mode === 'replace', preventScrollReset: true },
    )
  return { state: state as ListState, go }
}

/** The search text for the URL: trimmed and at most 100 characters, null
 * when empty. The same rule as ListBar. */
function cleanQuery(text: string): string | null {
  const cleaned = [...text.trim()].slice(0, Q_MAX_LENGTH).join('').trim()
  return cleaned === '' ? null : cleaned
}

/** The menu bar of the 解法 and 利害關係人 tabs of the space page (design
 * 3.6, decision 138). It has the look of the issue tab menu bar
 * (IssueMenuBar, a box in the content column), because the space page has
 * the same tab layout as the issue page. Its controls are the ones of the
 * list bar (ListBar) of #/solutions and #/stakeholders: the sort <select>,
 * the filters (popover buttons, toggles, the stakeholder picker) and the
 * search box. Unlike ListBar, the filters show at every width (no phone
 * sheet): the bar wraps, so a 360 px screen has no sideways scroll.
 * sortNoteId: the id of the sort note while a share sort is on. */
export function SpaceTabMenu({ tab, state, filters, sortNoteId, go, className }: {
  tab: SpaceListTab
  state: ListState
  filters: ListBarFilter[]
  sortNoteId?: string
  go: (next: ListState, mode?: HistoryMode) => void
  className?: string
}) {
  const page = SPACE_TAB_PAGE[tab]
  return (
    <IssueMenuBar label={t.listSearch.barLabel} className={cn('gap-x-4', className)}>
      <ListSortSelect
        sorts={PAGE_SORTS[page]}
        value={state.sort}
        describedBy={sortNoteId}
        onChange={(sort) => go({ ...state, sort })}
      />
      {filters.map((f) => (
        <BarFilter key={f.key} filter={f} onState={(s) => go(s)} />
      ))}
      <ListSearchBox
        page={page}
        q={state.q}
        onSearch={(text, mode) => go({ ...state, q: cleanQuery(text) }, mode)}
        className="w-full md:ml-auto md:w-auto"
      />
    </IssueMenuBar>
  )
}
