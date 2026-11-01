import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ListBar, type ListBarFilter } from '@/components/ListBar'
import type { HistoryMode } from '@/components/ListSearchBox'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { ResultLine } from '@/components/ResultLine'
import { SpaceCard, type SpaceCardCounts } from '@/components/SpaceCard'
import { linkClass, listBodyClass } from '@/components/styles'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { rememberListSearch } from '@/lib/backLink'
import { availableIssues } from '@/lib/issues'
import { filterSpaces } from '@/lib/listFilter'
import {
  clearListFilters, DEFAULT_LIST_STATE, listParamsOf, listUrlSearch, PAGE_SORTS, Q_MAX_LENGTH, spaceGroupNames,
  type ListState,
} from '@/lib/listParams'
import { parseListQuery, spaceMatches } from '@/lib/listSearch'
import { issuesBySpace, solutionsBySpace, spaceGroups, spaceStakeholderCount, stakeholdersBySpace } from '@/lib/spaces'
import type { IndexFile, IssueFile } from '@/types'

const ts = t.spacesList
const tb = t.listBar
const tq = t.listSearch
const PAGE = 'spaces'

/** The state while index.json loads: only q, from the URL. The filters need
 * the data to be checked, so they wait. listParamsOf cleans the whole URL
 * when the data is ready. */
function loadingState(params: URLSearchParams): ListState {
  const q = [...(params.get('q') ?? '').trim()].slice(0, Q_MAX_LENGTH).join('')
  return { ...DEFAULT_LIST_STATE, issues: [], spaces: [], groups: [], q: q === '' ? null : q }
}

/** #/spaces (design 3.9, decisions 120 and 122): the hidden h1, the search
 * and filter bar, the result line and the space cards by group.
 *
 * The bar is the same ListBar as on the other list pages, with the filters
 * 空間分類 and 議題 and the search (code or name). It has no sort: the
 * spaces keep the data order (spaceGroups), never an order by a count. The
 * cards stay under their group heading. A group with no card left is not
 * shown. Every filter and the search are in the URL. */
export default function Spaces() {
  const index = useIndex()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const data = index.status === 'ready' ? index.data : null

  const parsed = useMemo(() => (data ? listParamsOf(PAGE, params, data) : null), [data, params])
  const state: ListState = parsed ?? loadingState(params)
  // A URL with a value the page drops: replace it with the clean URL, so
  // the back button does not loop (design 3.23.5).
  useEffect(() => {
    if (parsed?.replace) {
      navigate({ pathname, search: listUrlSearch(PAGE, parsed) }, { replace: true, preventScrollReset: true })
    }
  }, [parsed, pathname, navigate])

  // Remember the clean URL, so the back button of a space page comes back
  // to this list with the same filters and search (decision 111).
  useEffect(() => {
    if (parsed && !parsed.replace) rememberListSearch(PAGE, listUrlSearch(PAGE, parsed))
  }, [parsed])

  function onNavigate(next: string, mode: HistoryMode) {
    navigate({ pathname, search: next }, { replace: mode === 'replace', preventScrollReset: true })
  }

  const view = data ? spaceView(data, state) : null
  const filters: ListBarFilter[] = data ? barFilters(data, state) : []
  const resultLine = (clearLink: boolean, className?: string) =>
    view && (
      <ResultLine
        page={PAGE}
        shown={view.shown}
        total={view.total}
        q={state.q}
        parts={view.parts}
        clearLink={clearLink}
        className={className}
      />
    )

  return (
    <>
      <PageTitle parts={[ts.title]} />
      {/* The highlighted header link is the visible title (decision 79). */}
      <h1 className="sr-only">{ts.title}</h1>
      <ListBar
        page={PAGE}
        state={state}
        sorts={PAGE_SORTS[PAGE]}
        filters={filters}
        resultLine={resultLine(false)}
        onNavigate={onNavigate}
      />
      <div className={listBodyClass}>
        {resultLine(true, 'mt-3')}
        <div className="mt-4">
          {index.status !== 'ready' ? (
            <LoadState state={index} />
          ) : !data || !view ? null : view.shown === 0 ? (
            <EmptyState state={state} filtersOn={view.parts.length > 0} params={params} />
          ) : (
            <SpacesBody index={data} groups={view.groups} />
          )}
        </div>
      </div>
    </>
  )
}

/** The groups to show (only the spaces left after the filters and the
 * search, empty groups left out), the numbers for the result line, and the
 * filters that are on as text (the search is added by ResultLine). */
function spaceView(index: IndexFile, state: ListState) {
  const query = state.q === null ? null : parseListQuery(state.q)
  const kept = filterSpaces(index.spaceTypes, state, index.issues).filter((s) => spaceMatches(s, query))
  const groups = spaceGroups(kept)
  const parts: string[] = []
  if (state.groups.length > 0) parts.push(tb.filterPart(ts.groupFilter, state.groups))
  if (state.issues.length > 0) parts.push(tb.filterPart(ts.issueFilter, state.issues.map(ts.issueShort)))
  return { groups, shown: kept.length, total: index.spaceTypes.length, parts }
}

/** The filters of #/spaces: 空間分類 (the groups, in the data order), then
 * 議題 (the analyzed issues that use a space, by number). */
function barFilters(index: IndexFile, state: ListState): ListBarFilter[] {
  const issueOptions = availableIssues(index)
    .filter((i) => i.spaces.length > 0)
    .map((i) => ({ value: String(i.number), label: ts.issueOption(i.number, i.title) }))
  const filters: ListBarFilter[] = [
    {
      kind: 'choices',
      key: 'group',
      label: ts.groupFilter,
      options: spaceGroupNames(index).map((g) => ({ value: g, label: g })),
      value: state.groups,
      next: (groups) => ({ ...state, groups }),
    },
  ]
  if (issueOptions.length > 0) {
    filters.push({
      kind: 'choices',
      key: 'issue',
      label: ts.issueFilter,
      options: issueOptions,
      value: state.issues.map(String),
      none: tb.all,
      next: (v) => ({ ...state, issues: v.map(Number) }),
    })
  }
  return filters
}

function SpacesBody({ index, groups }: { index: IndexFile; groups: ReturnType<typeof spaceGroups> }) {
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issuesState = useIssues(folders)
  const files = issuesState.status === 'ready' ? issuesState.data : null

  /** The counts of one space, from the same helpers as the space page, with
   * the same issue files (only the issues that use the space). */
  const countsOf = (code: string, numbers: number[]): SpaceCardCounts | null => {
    if (files === null) return null
    const used: IssueFile[] = files.filter((f) => numbers.includes(f.number))
    return {
      stakeholders: spaceStakeholderCount(stakeholdersBySpace(used, code)),
      solutions: solutionsBySpace(used, code).length,
    }
  }

  return (
    <>
      {/* The counts need the issue files. While they load, or when they fail,
          one line says so and the cards leave out those two fields. */}
      {issuesState.status !== 'ready' && <div className="mb-4"><LoadState state={issuesState} /></div>}
      <div className="space-y-8">
        {groups.map((g) => {
          // The id uses the group's place in the whole list, so it does not
          // change when a filter hides another group.
          const id = `space-group-${spaceGroupNames(index).indexOf(g.group)}`
          return (
            <section key={g.group} aria-labelledby={id}>
              <h2 id={id} className="text-xl font-bold">{g.group}</h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {g.spaces.map((space) => {
                  const numbers = issuesBySpace(index, space.code).map((s) => s.number)
                  return (
                    <li key={space.code}>
                      <SpaceCard space={space} issues={numbers} titles={index.issues} counts={countsOf(space.code, numbers)} />
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}

/** No space to show (design 3.23.6 and 3.23.13). With a search, the text
 * names it and offers 「清除搜尋」; with filters, 「清除篩選」 too. */
function EmptyState({ state, filtersOn, params }: { state: ListState; filtersOn: boolean; params: URLSearchParams }) {
  const text = state.q === null
    ? ts.noMatchFilters
    : filtersOn ? tq.noMatchFiltered(state.q, ts.noun) : tq.noMatch(state.q, ts.noun)
  return (
    <div className="space-y-2">
      <p>{text}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        {state.q !== null && (
          <Link
            to={{ pathname: '/spaces', search: listUrlSearch(PAGE, { ...state, q: null }) }}
            preventScrollReset
            className={linkClass}
          >
            {ts.clearSearch}
          </Link>
        )}
        {(state.q === null || filtersOn) && (
          <Link to={{ pathname: '/spaces', search: clearListFilters(params) }} preventScrollReset className={linkClass}>
            {tb.clear}
          </Link>
        )}
      </p>
    </div>
  )
}
