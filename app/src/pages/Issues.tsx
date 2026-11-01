import { useEffect, useId, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { IssueList } from '@/components/IssueList'
import { ListBar, type ListBarFilter } from '@/components/ListBar'
import type { HistoryMode } from '@/components/ListSearchBox'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { ResultLine } from '@/components/ResultLine'
import { StakeholderPicker } from '@/components/StakeholderPicker'
import { linkClass, listBodyClass } from '@/components/styles'
import { typeChoiceFilter, typeFilterPart } from '@/components/typeFilters'
import { useIndex, useIssues } from '@/data'
import { rememberListSearch } from '@/lib/backLink'
import { t } from '@/i18n/zh-TW'
import { availableIssues } from '@/lib/issues'
import { filterIssues } from '@/lib/listFilter'
import {
  clearListFilters, DEFAULT_LIST_STATE, listParamsOf, listUrlSearch, PAGE_SORTS, Q_MAX_LENGTH,
  type ListState,
} from '@/lib/listParams'
import { issueMatches, parseListQuery } from '@/lib/listSearch'
import { sortIssues, type IssueSort, type ListSort } from '@/lib/listSort'
import { findStakeholder } from '@/lib/stakeholders'
import { issueTypeOptions, typesOf } from '@/lib/typeKinds'
import type { IndexFile, IssueFile } from '@/types'

const tp = t.issuesPage
const tb = t.listBar
const ts = t.listSearch
const PAGE = 'issues'
const NO_FILES: IssueFile[] = []

/** The state while index.json loads: only q and sort, from the URL. The
 * filters need the data to be checked, so they wait. listParamsOf cleans
 * the whole URL when the data is ready. */
function loadingState(params: URLSearchParams): ListState {
  const sort = params.get('sort')
  const q = [...(params.get('q') ?? '').trim()].slice(0, Q_MAX_LENGTH).join('')
  return {
    ...DEFAULT_LIST_STATE,
    issues: [],
    spaces: [],
    domains: [],
    sort: sort !== null && (PAGE_SORTS[PAGE] as readonly string[]).includes(sort) ? (sort as ListSort) : 'updated',
    q: q === '' ? null : q,
  }
}

/** #/issues (design 3.23, Task L5): the hidden h1, the search, sort and
 * filter bar, the result line, the notes and the issue cards.
 *
 * Every sort, filter and search is in the URL. The list is: the filters
 * (空間類型, 領域, 利害關係人), then the search (number or title), then the
 * sort. The search never changes the order (decision 96).
 *
 * The 領域 filter uses the rule of the type pages (typeIssues): an issue
 * matches by its 領域 line or by a solution's own 領域. That needs the issue
 * files. While they load, the 領域 filter is not in the bar, a domain= in
 * the URL is kept as it is, and the list waits only when domain= is on
 * (Task U5). When they fail to load, only the 領域 lines count.
 *
 * The bar stays mounted when the URL changes (no key that depends on the
 * URL), so the search box and the popovers keep their state. */
export default function Issues() {
  const index = useIndex()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const noteId = useId()
  const data = index.status === 'ready' ? index.data : null
  const folders = useMemo(() => (data ? availableIssues(data).map((i) => i.folder) : []), [data])
  const issuesState = useIssues(folders)
  // null while the issue files load. [] when they fail: then only the 領域
  // lines of index.json count.
  const files: IssueFile[] | null =
    issuesState.status === 'ready' ? issuesState.data : issuesState.status === 'error' ? NO_FILES : null

  const parsed = useMemo(() => {
    if (!data) return null
    if (files) return listParamsOf(PAGE, params, data, { domain: issueTypeOptions('domain', data, files).map((d) => d.code) })
    // While the issue files load, keep every known 領域 code, so nothing in
    // the URL is lost before the own 領域 of the solutions are known. No
    // replace yet: the clean URL comes when the files are there.
    const all = { domain: typesOf('domain', data).map((d) => d.code) }
    return { ...listParamsOf(PAGE, params, data, all), replace: false }
  }, [data, files, params])
  const state: ListState = parsed ?? loadingState(params)
  // A URL with a value the page drops: replace it with the clean URL, so
  // the back button does not loop (design 3.23.5).
  useEffect(() => {
    if (parsed?.replace) {
      navigate({ pathname, search: listUrlSearch(PAGE, parsed) }, { replace: true, preventScrollReset: true })
    }
  }, [parsed, pathname, navigate])

  // Remember the clean URL, so the back button of a detail page comes back
  // to this list with the same sort, filters and search (decision 111).
  useEffect(() => {
    if (parsed && files && !parsed.replace) rememberListSearch(PAGE, listUrlSearch(PAGE, parsed))
  }, [parsed, files])

  function onNavigate(next: string, mode: HistoryMode) {
    navigate({ pathname, search: next }, { replace: mode === 'replace', preventScrollReset: true })
  }

  // With domain= on, the list waits for the issue files.
  const view = data && (files || state.domains.length === 0) ? issueView(data, state, files ?? []) : null
  const evidenceSort = state.sort === 'evidence'
  const filters: ListBarFilter[] = data ? barFilters(data, state, files) : []
  const resultLine = (clearLink: boolean, className?: string) =>
    view && (
      <ResultLine
        page={PAGE}
        shown={view.shown.length}
        total={view.total}
        q={state.q}
        parts={view.parts}
        clearLink={clearLink}
        className={className}
      />
    )

  return (
    <>
      <PageTitle parts={[t.lists.issuesTitle]} />
      {/* Hidden: the highlighted header link is the visible title (decision 79). */}
      <h1 className="sr-only">{t.lists.issuesTitle}</h1>
      <ListBar
        page={PAGE}
        state={state}
        sorts={PAGE_SORTS[PAGE]}
        filters={filters}
        sortNoteId={evidenceSort ? noteId : undefined}
        resultLine={resultLine(false)}
        onNavigate={onNavigate}
      />
      <div className={listBodyClass}>
        {resultLine(true, 'mt-3')}
        {/* The sort note while the share sort is on (design 3.23.1). The
            資料根據 explanation is on #/about (decision 128). */}
        {evidenceSort && (
          <p id={noteId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {tb.sortNotes.evidence}
          </p>
        )}
        <div className="mt-4">
          {index.status !== 'ready' ? (
            <LoadState state={index} />
          ) : !data ? null : !view ? (
            // Only while the issue files load (with domain= on).
            issuesState.status === 'loading' && <LoadState state={issuesState} />
          ) : view.shown.length === 0 ? (
            <EmptyState state={state} filtersOn={view.parts.length > 0} params={params} />
          ) : (
            <IssueList index={data} issues={view.shown} headingLevel={2} showShare={evidenceSort} />
          )}
        </div>
      </div>
    </>
  )
}

/** The issues to show, the whole number, and the filters that are on as
 * text for the result line (the search is added by ResultLine). files: the
 * loaded issue files, for the 領域 of the solutions. */
function issueView(index: IndexFile, state: ListState, files: IssueFile[]) {
  const query = state.q === null ? null : parseListQuery(state.q)
  const filtered = filterIssues(index.issues, state, index.stakeholders, files).filter((i) => issueMatches(i, query))
  const shown = sortIssues(filtered, state.sort as IssueSort)
  const parts: string[] = []
  for (const part of [
    typeFilterPart('space', tp.spaceFilter, index, state),
    typeFilterPart('domain', tp.domainFilter, index, state),
  ]) {
    if (part !== null) parts.push(part)
  }
  if (state.who !== null) {
    const s = findStakeholder(index.stakeholders, state.who)
    parts.push(tb.filterPart(tp.whoFilter, [t.sideMenu.item(s.id, s.name)]))
  }
  return { shown, total: index.issues.length, parts }
}

/** The filters of #/issues, in the order of design 3.23.5: 空間類型, 領域
 * (Task U5), then 利害關係人 (the stakeholder picker, which writes the URL
 * itself). Each type filter offers only the types an analyzed issue uses,
 * in file order. 領域 waits for the issue files (files is null while they
 * load). */
function barFilters(index: IndexFile, state: ListState, files: IssueFile[] | null): ListBarFilter[] {
  const filters: ListBarFilter[] = []
  const space = typeChoiceFilter('space', tp.spaceFilter, issueTypeOptions('space', index, []), state)
  if (space) filters.push(space)
  const domain = files && typeChoiceFilter('domain', tp.domainFilter, issueTypeOptions('domain', index, files), state)
  if (domain) filters.push(domain)
  filters.push({
    kind: 'slot',
    key: 'who',
    active: state.who !== null,
    render: (place) => (
      <StakeholderPicker stakeholders={index.stakeholders} pathLabels={index.pathLabels} value={state.who} place={place} />
    ),
  })
  return filters
}

/** No issue to show (design 3.23.6 and 3.23.13). With a search, the text
 * names it and offers 「清除搜尋」; with filters, 「清除篩選」 too. */
function EmptyState({ state, filtersOn, params }: { state: ListState; filtersOn: boolean; params: URLSearchParams }) {
  const text = state.q === null
    ? tp.noMatchFilters
    : filtersOn ? ts.noMatchFiltered(state.q, tp.noun) : ts.noMatch(state.q, tp.noun)
  return (
    <div className="space-y-2">
      <p>{text}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        {state.q !== null && (
          <Link
            to={{ pathname: '/issues', search: listUrlSearch(PAGE, { ...state, q: null }) }}
            preventScrollReset
            className={linkClass}
          >
            {tp.clearSearch}
          </Link>
        )}
        {(state.q === null || filtersOn) && (
          <Link to={{ pathname: '/issues', search: clearListFilters(params) }} preventScrollReset className={linkClass}>
            {tb.clear}
          </Link>
        )}
      </p>
    </div>
  )
}
