import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ListBar, type ListBarFilter } from '@/components/ListBar'
import type { HistoryMode } from '@/components/ListSearchBox'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { ResultLine } from '@/components/ResultLine'
import { TypeCard, type TypeCardCounts } from '@/components/TypeCard'
import { TYPE_ID_PREFIX, TYPE_LIST_TEXT } from '@/components/typeText'
import { linkClass, listBodyClass } from '@/components/styles'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { rememberListSearch } from '@/lib/backLink'
import { availableIssues } from '@/lib/issues'
import { filterTypes } from '@/lib/listFilter'
import {
  clearListFilters, DEFAULT_LIST_STATE, listParamsOf, listUrlSearch, PAGE_SORTS, Q_MAX_LENGTH, type ListState,
} from '@/lib/listParams'
import { parseListQuery, typeMatches } from '@/lib/listSearch'
import {
  issueListsSolutionCodes, issueMayUseType, issuesByType, solutionsByType, stakeholdersByType, TYPE_LIST_PAGES,
  typeGroupNames, typeGroups, typeIssues, typesOf, typeStakeholderCount, type TypeGroup, type TypeKind,
} from '@/lib/typeKinds'
import type { IndexFile, IssueFile } from '@/types'

const tb = t.listBar
const tq = t.listSearch

/** A type of any kind, as the list page uses it. */
type ListType = { code: string; name: string; description: string; group?: string; updated?: string | null }

/** The state while index.json loads: only q, from the URL. The filters need
 * the data to be checked, so they wait. listParamsOf cleans the whole URL
 * when the data is ready. */
function loadingState(params: URLSearchParams): ListState {
  const q = [...(params.get('q') ?? '').trim()].slice(0, Q_MAX_LENGTH).join('')
  return { ...DEFAULT_LIST_STATE, issues: [], spaces: [], groups: [], q: q === '' ? null : q }
}

/** A type list page: #/spaces (design 3.9, decisions 120 and 122),
 * #/domains and #/solution-types (Task U3). The hidden h1, the search and
 * filter bar, the result line and the type cards by group.
 *
 * The bar is the same ListBar as on the other list pages, with the filters
 * 分類 (空間分類, 領域分類; a solution type has none) and 議題 and the search
 * (code or name). It has no sort: the types keep the data order
 * (typeGroups), never an order by a count. The cards stay under their group
 * heading. A group with no card left is not shown. Every filter and the
 * search are in the URL.
 *
 * Which issues use a type: for a space, index.json is enough. For a 領域 or
 * a 解法類型 the page needs the issue files (typeIssues), so it shows the
 * cards only when they are loaded. Then no card shows a wrong 「尚無議題」. */
export default function TypeList({ kind }: { kind: TypeKind }) {
  const index = useIndex()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const data = index.status === 'ready' ? index.data : null
  const page = TYPE_LIST_PAGES[kind]
  const ts = TYPE_LIST_TEXT[kind]

  const folders = useMemo(() => (data ? availableIssues(data).map((i) => i.folder) : []), [data])
  const issuesState = useIssues(folders)
  const files = issuesState.status === 'ready' ? issuesState.data : null

  const parsed = useMemo(() => (data ? listParamsOf(page, params, data) : null), [page, data, params])
  const state: ListState = parsed ?? loadingState(params)
  // A URL with a value the page drops: replace it with the clean URL, so
  // the back button does not loop (design 3.23.5).
  useEffect(() => {
    if (parsed?.replace) {
      navigate({ pathname, search: listUrlSearch(page, parsed) }, { replace: true, preventScrollReset: true })
    }
  }, [page, parsed, pathname, navigate])

  // Remember the clean URL, so the back button of a type page comes back
  // to this list with the same filters and search (decision 111).
  useEffect(() => {
    if (parsed && !parsed.replace) rememberListSearch(page, listUrlSearch(page, parsed))
  }, [page, parsed])

  function onNavigate(next: string, mode: HistoryMode) {
    navigate({ pathname, search: next }, { replace: mode === 'replace', preventScrollReset: true })
  }

  /** The numbers of the issues that use a code, or null while the issue
   * files that are needed for it load. A space needs only index.json. */
  const issuesOf = useMemo(() => {
    if (!data) return null
    if (issueListsSolutionCodes(kind)) return (code: string) => issuesByType(kind, data, [], code).map((i) => i.number)
    if (files) return (code: string) => typeIssues(kind, data, files, code).map((i) => i.number)
    return null
  }, [kind, data, files])

  const view = data && issuesOf ? typeView(kind, data, state, issuesOf) : null
  const filters: ListBarFilter[] = data ? barFilters(kind, data, state) : []
  const resultLine = (clearLink: boolean, className?: string) =>
    view && (
      <ResultLine
        page={page}
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
        page={page}
        state={state}
        sorts={PAGE_SORTS[page]}
        filters={filters}
        resultLine={resultLine(false)}
        onNavigate={onNavigate}
      />
      <div className={listBodyClass}>
        {resultLine(true, 'mt-3')}
        <div className="mt-4">
          {index.status !== 'ready' ? (
            <LoadState state={index} />
          ) : !data || !issuesOf || !view ? (
            // The issue files that the page needs load, or they failed.
            issuesState.status !== 'ready' && <LoadState state={issuesState} />
          ) : view.shown === 0 ? (
            <EmptyState kind={kind} state={state} filtersOn={view.parts.length > 0} params={params} />
          ) : (
            <TypesBody
              kind={kind}
              index={data}
              groups={view.groups}
              issuesOf={issuesOf}
              files={files}
              issuesState={issuesState}
            />
          )}
        </div>
      </div>
    </>
  )
}

/** The groups to show (only the types left after the filters and the
 * search, empty groups left out), the numbers for the result line, and the
 * filters that are on as text (the search is added by ResultLine). */
function typeView(kind: TypeKind, index: IndexFile, state: ListState, issuesOf: (code: string) => number[]) {
  const ts = TYPE_LIST_TEXT[kind]
  const all: ListType[] = typesOf(kind, index)
  const query = state.q === null ? null : parseListQuery(state.q)
  const kept = filterTypes(all, state, issuesOf).filter((s) => typeMatches(s, query))
  const groups = typeGroups(kept)
  const parts: string[] = []
  if (state.groups.length > 0 && ts.groupFilter !== null) parts.push(tb.filterPart(ts.groupFilter, state.groups))
  if (state.issues.length > 0) parts.push(tb.filterPart(ts.issueFilter, state.issues.map(ts.issueShort)))
  return { groups, shown: kept.length, total: all.length, parts }
}

/** The filters of a type list page: 分類 (the groups, in the data order;
 * not for a kind with one level), then 議題 (the analyzed issues that can
 * use a type of the kind, by number). */
function barFilters(kind: TypeKind, index: IndexFile, state: ListState): ListBarFilter[] {
  const ts = TYPE_LIST_TEXT[kind]
  const issueOptions = availableIssues(index)
    .filter((i) => issueMayUseType(kind, i))
    .map((i) => ({ value: String(i.number), label: ts.issueOption(i.number, i.title) }))
  const filters: ListBarFilter[] = []
  const groupNames = typeGroupNames(kind, index)
  if (ts.groupFilter !== null && groupNames.length > 0) {
    filters.push({
      kind: 'choices',
      key: 'group',
      label: ts.groupFilter,
      options: groupNames.map((g) => ({ value: g, label: g })),
      value: state.groups,
      next: (groups) => ({ ...state, groups }),
    })
  }
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

function TypesBody({ kind, index, groups, issuesOf, files, issuesState }: {
  kind: TypeKind
  index: IndexFile
  groups: TypeGroup<ListType>[]
  issuesOf: (code: string) => number[]
  files: IssueFile[] | null
  issuesState: ReturnType<typeof useIssues>
}) {
  const groupNames = typeGroupNames(kind, index)

  /** The counts of one type, from the same helpers as the type page, with
   * the same issue files (only the issues that use the type). */
  const countsOf = (code: string, numbers: number[]): TypeCardCounts | null => {
    if (files === null) return null
    const used: IssueFile[] = files.filter((f) => numbers.includes(f.number))
    return {
      stakeholders: typeStakeholderCount(stakeholdersByType(kind, used, code)),
      solutions: solutionsByType(kind, used, code).length,
    }
  }

  const cards = (types: ListType[], heading: 'h2' | 'h3') => (
    <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {types.map((type) => {
        const numbers = issuesOf(type.code)
        return (
          <li key={type.code}>
            <TypeCard
              kind={kind}
              type={type}
              issues={numbers}
              titles={index.issues}
              counts={countsOf(type.code, numbers)}
              heading={heading}
            />
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      {/* The counts need the issue files. While they load, or when they fail,
          one line says so and the cards leave out those two fields. */}
      {issuesState.status !== 'ready' && <div className="mb-4"><LoadState state={issuesState} /></div>}
      <div className="space-y-8">
        {groups.map((g) => {
          // A kind with one level has no group headings: the cards are
          // right under the hidden h1, so they use h2.
          if (g.group === null) return <div key="all">{cards(g.types, 'h2')}</div>
          // The id uses the group's place in the whole list, so it does not
          // change when a filter hides another group.
          const id = `${TYPE_ID_PREFIX[kind]}-group-${groupNames.indexOf(g.group)}`
          return (
            <section key={g.group} aria-labelledby={id}>
              <h2 id={id} className="text-xl font-bold">{g.group}</h2>
              {cards(g.types, 'h3')}
            </section>
          )
        })}
      </div>
    </>
  )
}

/** No type to show (design 3.23.6 and 3.23.13). With a search, the text
 * names it and offers 「清除搜尋」; with filters, 「清除篩選」 too. */
function EmptyState({ kind, state, filtersOn, params }: {
  kind: TypeKind
  state: ListState
  filtersOn: boolean
  params: URLSearchParams
}) {
  const ts = TYPE_LIST_TEXT[kind]
  const page = TYPE_LIST_PAGES[kind]
  const text = state.q === null
    ? ts.noMatchFilters
    : filtersOn ? tq.noMatchFiltered(state.q, ts.noun) : tq.noMatch(state.q, ts.noun)
  return (
    <div className="space-y-2">
      <p>{text}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        {state.q !== null && (
          <Link
            to={{ pathname: `/${page}`, search: listUrlSearch(page, { ...state, q: null }) }}
            preventScrollReset
            className={linkClass}
          >
            {ts.clearSearch}
          </Link>
        )}
        {(state.q === null || filtersOn) && (
          <Link to={{ pathname: `/${page}`, search: clearListFilters(params) }} preventScrollReset className={linkClass}>
            {tb.clear}
          </Link>
        )}
      </p>
    </div>
  )
}
