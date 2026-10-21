import { useEffect, useId, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { IssueList } from '@/components/IssueList'
import { ListBar, type ListBarFilter } from '@/components/ListBar'
import type { HistoryMode } from '@/components/ListSearchBox'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { ResultLine } from '@/components/ResultLine'
import { StakeholderPicker } from '@/components/StakeholderPicker'
import { linkClass, proseClass } from '@/components/styles'
import { useIndex } from '@/data'
import { t } from '@/i18n/zh-TW'
import { usedSpaceTypes } from '@/lib/issues'
import { filterIssues } from '@/lib/listFilter'
import {
  clearListFilters, DEFAULT_LIST_STATE, legacyListRedirect, listParamsOf, listUrlSearch, PAGE_SORTS, Q_MAX_LENGTH,
  type ListState,
} from '@/lib/listParams'
import { issueMatches, parseListQuery } from '@/lib/listSearch'
import { sortIssues, type IssueSort, type ListSort } from '@/lib/listSort'
import { findStakeholder } from '@/lib/stakeholders'
import type { IndexFile } from '@/types'

const tp = t.issuesPage
const tb = t.listBar
const ts = t.listSearch
const PAGE = 'issues'

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
    sort: sort !== null && (PAGE_SORTS[PAGE] as readonly string[]).includes(sort) ? (sort as ListSort) : 'updated',
    q: q === '' ? null : q,
  }
}

/** #/issues (design 3.23, Task L5): the hidden h1, the search, sort and
 * filter bar, the result line, the notes and the issue cards.
 *
 * Every sort, filter and search is in the URL. The list is: the filters
 * (空間類型, 利害關係人), then the search (number or title), then the sort.
 * The search never changes the order (decision 96).
 *
 * The bar stays mounted when the URL changes (no key that depends on the
 * URL), so the search box and the popovers keep their state. */
export default function Issues() {
  const index = useIndex()
  const [params] = useSearchParams()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const noteId = useId()
  const data = index.status === 'ready' ? index.data : null

  const parsed = useMemo(() => (data ? listParamsOf(PAGE, params, data) : null), [data, params])
  const state: ListState = parsed ?? loadingState(params)
  const redirect = legacyListRedirect(PAGE, search)

  // A URL with an old param or a value the page drops: replace it with the
  // clean URL, so the back button does not loop (design 3.23.5).
  useEffect(() => {
    if (redirect !== null) navigate({ pathname, search: redirect }, { replace: true, preventScrollReset: true })
    else if (parsed?.replace) {
      navigate({ pathname, search: listUrlSearch(PAGE, parsed) }, { replace: true, preventScrollReset: true })
    }
  }, [redirect, parsed, pathname, navigate])

  function onNavigate(next: string, mode: HistoryMode) {
    navigate({ pathname, search: next }, { replace: mode === 'replace', preventScrollReset: true })
  }

  const view = data ? issueView(data, state) : null
  const evidenceSort = state.sort === 'evidence'
  const filters: ListBarFilter[] = data ? barFilters(data, state) : []
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
      {resultLine(true, 'mt-3')}
      {/* The notes (design 3.23.1): the sort note while the share sort is
          on, and the 資料根據 note, once on the page, not on each card. */}
      <div className={`mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground ${proseClass}`}>
        {evidenceSort && <p id={noteId}>{tb.sortNotes.evidence}</p>}
        <p>{t.basis.listNote('議題')}</p>
      </div>
      <div className="mt-4">
        {index.status !== 'ready' ? (
          <LoadState state={index} />
        ) : !data || !view ? null : view.shown.length === 0 ? (
          <EmptyState state={state} filtersOn={view.parts.length > 0} params={params} />
        ) : (
          <IssueList index={data} issues={view.shown} headingLevel={2} showShare={evidenceSort} />
        )}
      </div>
    </>
  )
}

/** The issues to show, the whole number, and the filters that are on as
 * text for the result line (the search is added by ResultLine). */
function issueView(index: IndexFile, state: ListState) {
  const query = state.q === null ? null : parseListQuery(state.q)
  const filtered = filterIssues(index.issues, state, index.stakeholders).filter((i) => issueMatches(i, query))
  const shown = sortIssues(filtered, state.sort as IssueSort)
  const parts: string[] = []
  if (state.spaces.length > 0) {
    const names = state.spaces.map((c) => index.spaceTypes.find((s) => s.code === c)?.name ?? c)
    parts.push(tb.filterPart(tp.spaceFilter, names))
  }
  if (state.who !== null) {
    const s = findStakeholder(index.stakeholders, state.who)
    parts.push(tb.filterPart(tp.whoFilter, [t.sideMenu.item(s.id, s.name)]))
  }
  return { shown, total: index.issues.length, parts }
}

/** The filters of #/issues, in the order of design 3.23.5: 空間類型, then
 * 利害關係人 (the stakeholder picker, which writes the URL itself). */
function barFilters(index: IndexFile, state: ListState): ListBarFilter[] {
  const spaceOptions = usedSpaceTypes(index).map((s) => ({ value: s.code, label: s.name }))
  const filters: ListBarFilter[] = []
  if (spaceOptions.length > 0) {
    filters.push({
      kind: 'choices',
      key: 'space',
      label: tp.spaceFilter,
      options: spaceOptions,
      value: state.spaces,
      next: (spaces) => ({ ...state, spaces }),
    })
  }
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
