import { useEffect, useId, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { METHOD_URL } from '@/components/links'
import { ListBar, type ListBarFilter } from '@/components/ListBar'
import type { HistoryMode } from '@/components/ListSearchBox'
import { LoadState } from '@/components/LoadState'
import { NeedCard } from '@/components/NeedCard'
import { PageTitle } from '@/components/PageTitle'
import { ResultLine } from '@/components/ResultLine'
import { StakeholderPicker } from '@/components/StakeholderPicker'
import { linkClass, listBodyClass } from '@/components/styles'
import { typeChoiceFilter, typeFilterPart } from '@/components/typeFilters'
import { useCrossIssue, useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { rememberListSearch } from '@/lib/backLink'
import { compareIds } from '@/lib/ids'
import { availableIssues } from '@/lib/issues'
import { typeFiltersOn } from '@/lib/listFilter'
import {
  clearListFilters, CROSS_ISSUE_VALUE, LIST_PARAMS, listParamsOf, listUrlSearch, PAGE_SORTS, type ListParams, type ListState,
} from '@/lib/listParams'
import { needListItems, needListView, needsParams, needTypeOptions, type NeedListItem } from '@/lib/needList'
import { PRIORITIES, priorityLabel } from '@/lib/priority'
import { findStakeholder } from '@/lib/stakeholders'
import type { CrossIssueFile, IndexFile, IssueFile, Priority } from '@/types'

const tl = t.lists
const tb = t.listBar
const tn = t.needsList
const tq = t.listSearch

/** #/needs (plan-needs.md, Task N3): the search, sort and filter bar, the
 * result line, a short intro line, the sort note, then one flat list of the
 * needs of every analyzed issue. The list is filtered, then searched, then
 * sorted. Every sort, filter and search is in the URL. The needs are the
 * ones the analysis found; the page is not a done / not-done tracker. */
export default function Needs() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[tl.needsTitle]} />
      {/* The highlighted header link is the visible title (decision 79). */}
      <h1 className="sr-only">{tl.needsTitle}</h1>
      {index.status === 'ready' ? (
        <NeedsBody index={index.data} />
      ) : (
        <div className={`${listBodyClass} pt-6`}>
          <LoadState state={index} />
        </div>
      )}
    </>
  )
}

const NO_ISSUES: IssueFile[] = []

function NeedsBody({ index }: { index: IndexFile }) {
  const available = useMemo(() => availableIssues(index), [index])
  const folders = useMemo(() => available.map((i) => i.folder), [available])
  const issuesState = useIssues(folders)
  const crossState = useCrossIssue()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const noteId = useId()

  const issueFiles = issuesState.status === 'ready' ? issuesState.data : NO_ISSUES
  // A cross-issue file that fails to load is left out, like a missing one.
  const cross: CrossIssueFile | null = crossState.status === 'ready' ? crossState.data : null
  const ready = issuesState.status === 'ready' && crossState.status !== 'loading'

  const items = useMemo(() => needListItems(issueFiles, cross), [issueFiles, cross])

  const search = params.toString()
  const p: ListParams = useMemo(() => {
    const read = new URLSearchParams(search)
    if (ready) return needsParams(read, index, cross, items)
    // While the data loads, the offered values are not known yet. No
    // replace, so nothing in the URL is lost before the needs are known.
    return { ...listParamsOf('needs', read, index), replace: false }
  }, [search, ready, index, cross, items])
  const replace = p.replace
  const state: ListState = useMemo(() => {
    const { replace: _drop, ...rest } = p
    return rest
  }, [p])

  // A URL with unknown values (design 3.23.5): replace it with the clean
  // URL, so the back button does not loop.
  const cleanSearch = listUrlSearch('needs', state)
  useEffect(() => {
    if (replace) navigate({ pathname, search: cleanSearch }, { replace: true, preventScrollReset: true })
  }, [replace, cleanSearch, pathname, navigate])

  // Remember the clean URL for the back button of a detail page (decision 111).
  useEffect(() => {
    if (ready && !replace) rememberListSearch('needs', cleanSearch)
  }, [ready, replace, cleanSearch])

  const onNavigate = (next: string, mode: HistoryMode) =>
    navigate({ pathname, search: next }, { replace: mode === 'replace', preventScrollReset: true })

  const shown = useMemo(() => needListView(items, state), [items, state])

  const filters = barFilters(index, state, items, cross !== null, ready)
  const parts = resultParts(index, state, items, ready)
  const resultProps = { page: 'needs' as const, shown: shown.length, total: items.length, q: state.q, parts }
  const shareOn = state.sort === 'evidence'

  return (
    <>
      <ListBar
        page="needs"
        state={state}
        sorts={PAGE_SORTS.needs}
        filters={filters}
        sortNoteId={shareOn ? noteId : undefined}
        resultLine={<ResultLine {...resultProps} clearLink={false} />}
        onNavigate={onNavigate}
      />
      <div className={listBodyClass}>
        <ResultLine {...resultProps} className="mt-3" />
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {tn.intro}{' '}
          <a href={METHOD_URL} rel="noopener noreferrer" className={linkClass}>{tn.methodLink}</a>
        </p>
        {/* The sort note while 資料根據比例 is on (design 3.23.3). */}
        {shareOn && (
          <p id={noteId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {tb.sortNotes.evidence}
          </p>
        )}

        <div className="mt-4">
          {issuesState.status !== 'ready' ? (
            <LoadState state={issuesState} />
          ) : crossState.status === 'loading' ? (
            <LoadState state={crossState} />
          ) : shown.length === 0 ? (
            <EmptyState state={state} params={params} pathname={pathname} />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((item) => (
                <li key={item.key}>
                  <NeedCard item={item} issueTitle={issueTitle(issueFiles, item)} shareOn={shareOn} dataBased={state.dataBased} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function issueTitle(issues: IssueFile[], item: NeedListItem): string {
  return issues.find((i) => i.number === item.issue)?.title ?? ''
}

/** The filters of #/needs, in the order of plan-needs.md decision 8: 議題
 * (with 「跨議題」 first, as on #/stakeholders and #/solutions, only when
 * cross-issue.json exists), 利害關係人, 空間類型, 領域, 優先順序,
 * 只看尚無解法的需求 (decision 224), then the 只看有資料根據 toggle. The type filters offer only the
 * values a need has, in the fixed order, and wait for the data. There is no
 * 解法 filter (decision 223). */
function barFilters(
  index: IndexFile,
  state: ListState,
  items: NeedListItem[],
  hasCross: boolean,
  ready: boolean,
): ListBarFilter[] {
  const filters: ListBarFilter[] = [
    {
      kind: 'choices',
      key: 'issue',
      label: tn.issueFilter,
      options: [
        ...(hasCross ? [{ value: CROSS_ISSUE_VALUE, label: tn.crossChoice }] : []),
        ...availableIssues(index).map((i) => ({ value: String(i.number), label: tn.issueOption(i.number, i.title) })),
      ],
      value: [...(state.crossChoice ? [CROSS_ISSUE_VALUE] : []), ...state.issues.map(String)],
      none: tb.all,
      next: (v) => ({
        ...state,
        crossChoice: v.includes(CROSS_ISSUE_VALUE),
        issues: v.filter((x) => x !== CROSS_ISSUE_VALUE).map(Number),
      }),
    },
    {
      kind: 'slot',
      key: 'who',
      active: state.who !== null,
      render: (place) => (
        <StakeholderPicker
          stakeholders={index.stakeholders}
          pathLabels={index.pathLabels}
          value={state.who}
          place={place}
          ids={ready ? needStakeholders(items) : undefined}
        />
      ),
    },
  ]
  for (const [kind, label] of [['space', tn.spaceFilter], ['domain', tn.domainFilter]] as const) {
    const filter = typeChoiceFilter(kind, label, ready ? needTypeOptions(kind, index, items) : [], state, index)
    if (filter) filters.push(filter)
  }
  filters.push(
    {
      kind: 'choices',
      key: 'priority',
      label: tn.priorityFilter,
      options: PRIORITIES.map((p) => ({ value: p, label: priorityLabel(p) })),
      value: state.priorities,
      next: (v) => ({ ...state, priorities: v as Priority[] }),
    },
    {
      kind: 'toggle',
      key: 'uncovered',
      label: tn.uncoveredFilter,
      pressed: state.uncoveredOnly,
      next: (on) => ({ ...state, uncoveredOnly: on }),
    },
  )
  filters.push({
    kind: 'toggle',
    key: 'basis',
    label: t.dataBasisFilter.label,
    pressed: state.dataBased,
    next: (on) => ({ ...state, dataBased: on }),
  })
  return filters
}

/** The stakeholders of the needs, each once, in ID order: the options of
 * the 利害關係人 filter. */
function needStakeholders(items: NeedListItem[]): string[] {
  return [...new Set(items.flatMap((r) => r.stakeholders))].sort(compareIds)
}

/** The filters that are on, as text for the result line, in the order of
 * the bar. The search is added by ResultLine. */
function resultParts(index: IndexFile, state: ListState, items: NeedListItem[], ready: boolean): string[] {
  const parts: string[] = []
  const issues = [...(state.crossChoice ? [tn.crossShort] : []), ...state.issues.map(tn.issueShort)]
  if (issues.length > 0) parts.push(tb.filterPart(tn.issueFilter, issues))
  if (state.who !== null) {
    const s = findStakeholder(index.stakeholders, state.who)
    parts.push(tb.filterPart(tn.whoFilter, [t.sideMenu.item(s.id, s.name)]))
  }
  for (const [kind, label] of [['space', tn.spaceFilter], ['domain', tn.domainFilter]] as const) {
    const part = typeFilterPart(kind, label, index, state, ready ? needTypeOptions(kind, index, items) : [])
    if (part !== null) parts.push(part)
  }
  if (state.priorities.length > 0) parts.push(tb.filterPart(tn.priorityFilter, state.priorities.map(priorityLabel)))
  if (state.uncoveredOnly) parts.push(tn.uncoveredFilter)
  if (state.dataBased) parts.push(t.dataBasisFilter.label)
  return parts
}

/** The card area when nothing is shown (design 3.23.6 and 3.23.13). */
function EmptyState({ state, params, pathname }: { state: ListState; params: URLSearchParams; pathname: string }) {
  const filtersOn =
    state.issues.length > 0 || state.crossChoice || state.who !== null || typeFiltersOn(state) ||
    state.priorities.length > 0 || state.uncoveredOnly || state.dataBased
  const noQ = new URLSearchParams(params)
  noQ.delete(LIST_PARAMS.q)
  const noQSearch = noQ.toString() ? `?${noQ.toString()}` : ''
  const clearSearch = (
    <Link to={{ pathname, search: noQSearch }} preventScrollReset className={linkClass}>{tq.clear}</Link>
  )
  const clearFilters = (
    <Link to={{ pathname, search: clearListFilters(params, 'needs') }} preventScrollReset className={linkClass}>{tb.clear}</Link>
  )
  if (state.q === null) {
    return (
      <p>
        {tn.none} {clearFilters}
      </p>
    )
  }
  return (
    <p>
      {filtersOn ? tq.noMatchFiltered(state.q, tn.noun) : tq.noMatch(state.q, tn.noun)} {clearSearch}
      {filtersOn && <> {clearFilters}</>}
    </p>
  )
}
