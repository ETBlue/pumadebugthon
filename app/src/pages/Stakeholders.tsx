import { useEffect, useId, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ListBar, type ListBarFilter } from '@/components/ListBar'
import type { HistoryMode } from '@/components/ListSearchBox'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { ResultLine } from '@/components/ResultLine'
import { FocusBadges, StakeholderCard, type StakeholderListFields } from '@/components/StakeholderCard'
import { StakeholderTree } from '@/components/StakeholderTree'
import { linkClass, listBodyClass, proseClass } from '@/components/styles'
import { useCrossIssue, useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import {
  evidenceShare, sharePercent, stakeholderCells, stakeholderSolutionCount, stakeholderSolutionCoverage,
} from '@/lib/coverage'
import { stakeholderTabPath } from '@/lib/entityPaths'
import { rememberListSearch } from '@/lib/backLink'
import { availableIssues } from '@/lib/issues'
import { filterStakeholders } from '@/lib/listFilter'
import {
  clearListFilters, CROSS_ISSUE_VALUE, DEFAULT_LIST_STATE, listParamsOf, listUrlSearch, PAGE_SORTS,
  Q_MAX_LENGTH, type ListState,
} from '@/lib/listParams'
import { parseListQuery, stakeholderMatches } from '@/lib/listSearch'
import { sortStakeholders, type ListContext, type ListSort } from '@/lib/listSort'
import { sideMenuTree } from '@/lib/sideMenu'
import { pathTrail } from '@/lib/stakeholderPage'
import type { CrossIssueFile, IndexFile, IssueFile, Stakeholder } from '@/types'

const tl = t.stakeholdersList
const tb = t.listBar
const tq = t.listSearch
const PAGE = 'stakeholders'

/** The state while index.json loads: only q, sort and view, from the URL.
 * The filters need the data to be checked, so they wait. listParamsOf
 * cleans the whole URL when the data is ready. */
function loadingState(params: URLSearchParams): ListState {
  const sort = params.get('sort')
  const q = [...(params.get('q') ?? '').trim()].slice(0, Q_MAX_LENGTH).join('')
  return {
    ...DEFAULT_LIST_STATE,
    issues: [],
    spaces: [],
    sort: sort !== null && (PAGE_SORTS[PAGE] as readonly string[]).includes(sort) ? (sort as ListSort) : 'updated',
    view: params.get('view') === 'tree' ? 'tree' : 'cards',
    q: q === '' ? null : q,
  }
}

/** #/stakeholders (design 3.23, 3.23.10 and 3.23.11, Task L6): no side bar.
 * The hidden h1, the search, sort and filter bar, the result line, the
 * notes, then the cards or the tree view. No statistics (decision 88).
 *
 * Every sort, filter, search and the view are in the URL. The list is: the
 * filters (議題 with 「跨議題」, 只看特別關注族群), then the search (ID or
 * name), then the sort. The search never changes the order (decision 96).
 * The tree view has its own fixed order, so the sort does not apply there.
 *
 * The bar stays mounted when the URL changes (no key that depends on the
 * URL), so the search box and the popovers keep their state. */
export default function Stakeholders() {
  const index = useIndex()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const noteId = useId()
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

  // Remember the clean URL, so the back button of a detail page comes back
  // to this list with the same sort, filters, view and search (decision 111).
  useEffect(() => {
    if (parsed && !parsed.replace) rememberListSearch(PAGE, listUrlSearch(PAGE, parsed))
  }, [parsed])

  function onNavigate(next: string, mode: HistoryMode) {
    navigate({ pathname, search: next }, { replace: mode === 'replace', preventScrollReset: true })
  }

  const tree = state.view === 'tree'
  // The note of a share sort. Not in tree view, where the sort is off.
  const shareSort = !tree && (state.sort === 'evidence' || state.sort === 'solutions') ? state.sort : null
  const view = useMemo(() => (data ? stakeholderView(data, state) : null), [data, state])
  const filters: ListBarFilter[] = data ? barFilters(data, state) : []
  const resultLine = (clearLink: boolean, className?: string) =>
    view && (
      <ResultLine
        page={PAGE}
        shown={view.filtered.length}
        total={view.total}
        q={state.q}
        parts={view.parts}
        clearLink={clearLink}
        className={className}
      />
    )

  return (
    <>
      <PageTitle parts={[t.lists.stakeholdersTitle]} />
      {/* Hidden: the highlighted header link is the visible title (decision 79). */}
      <h1 className="sr-only">{t.lists.stakeholdersTitle}</h1>
      <ListBar
        page={PAGE}
        state={state}
        sorts={PAGE_SORTS[PAGE]}
        filters={filters}
        viewSwitch
        sortNoteId={shareSort !== null ? noteId : undefined}
        resultLine={resultLine(false)}
        onNavigate={onNavigate}
      />
      <div className={listBodyClass}>
        {resultLine(true, 'mt-3')}
        {/* The sort note while a share sort is on (design 3.23.1). The
            資料根據 explanation is on #/about (decision 128). */}
        {shareSort !== null && (
          <p id={noteId} className={`mt-2 text-sm leading-relaxed text-muted-foreground ${proseClass}`}>
            {tb.sortNotes[shareSort]}
          </p>
        )}
        <div className="mt-4">
          {index.status !== 'ready' ? (
            <LoadState state={index} />
          ) : !data || !view ? null : view.filtered.length === 0 ? (
            <EmptyState state={state} filtersOn={view.parts.length > 0} params={params} />
          ) : tree ? (
            <TreeView index={data} ids={view.filtered.map((s) => s.id)} searching={state.q !== null} />
          ) : (
            <CardView index={data} list={view.filtered} sort={state.sort} />
          )}
        </div>
      </div>
    </>
  )
}

/** The stakeholders after the filters and the search (not sorted), the
 * whole number, and the filters that are on as text for the result line
 * (the search is added by ResultLine). */
function stakeholderView(index: IndexFile, state: ListState) {
  const query = state.q === null ? null : parseListQuery(state.q)
  const all = filterStakeholders(index.stakeholders, DEFAULT_LIST_STATE, index.issues)
  const filtered = filterStakeholders(index.stakeholders, state, index.issues).filter((s) => stakeholderMatches(s, query))
  const parts: string[] = []
  const issues = [...(state.crossChoice ? [tl.crossShort] : []), ...state.issues.map(tl.issueShort)]
  if (issues.length > 0) parts.push(tb.filterPart(tl.issueFilter, issues))
  if (state.specialOnly) parts.push(tl.specialOnly)
  return { filtered, total: all.length, parts }
}

/** The filters of #/stakeholders, in the order of design 3.23.5: 議題 (with
 * 「跨議題」 first), then 只看特別關注族群. */
function barFilters(index: IndexFile, state: ListState): ListBarFilter[] {
  const available = availableIssues(index)
  const issueOptions = [
    // 「跨議題」 needs 2 or more analyzed issues to mean something.
    ...(available.length >= 2 ? [{ value: CROSS_ISSUE_VALUE, label: tl.crossChoice }] : []),
    ...available.map((i) => ({ value: String(i.number), label: tl.issueOption(i.number, i.title) })),
  ]
  return [
    {
      kind: 'choices',
      key: 'issue',
      label: tl.issueFilter,
      options: issueOptions,
      value: [...(state.crossChoice ? [CROSS_ISSUE_VALUE] : []), ...state.issues.map(String)],
      none: tb.all,
      next: (v) => ({
        ...state,
        crossChoice: v.includes(CROSS_ISSUE_VALUE),
        issues: v.filter((x) => x !== CROSS_ISSUE_VALUE).map(Number),
      }),
    },
    {
      kind: 'toggle',
      key: 'specialonly',
      label: tl.specialOnly,
      pressed: state.specialOnly,
      next: (pressed) => ({ ...state, specialOnly: pressed }),
    },
  ]
}

const NO_ISSUES: IssueFile[] = []

/** The card view (design 3.23.9): one card per stakeholder, in the order of
 * the sort. The cards need the issue files (資料根據 and 解法涵蓋), so the
 * card area waits for them. */
function CardView({ index, list, sort }: { index: IndexFile; list: Stakeholder[]; sort: ListSort }) {
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issuesState = useIssues(folders)
  const crossState = useCrossIssue()
  const issueFiles = issuesState.status === 'ready' ? issuesState.data : NO_ISSUES
  // A cross-issue file that fails to load is left out, like a missing one.
  const cross: CrossIssueFile | null = crossState.status === 'ready' ? crossState.data : null
  const ctx: ListContext = useMemo(() => ({ issues: issueFiles, cross }), [issueFiles, cross])
  const sorted = useMemo(() => sortStakeholders(list, sort, ctx), [list, sort, ctx])

  if (issuesState.status !== 'ready') return <LoadState state={issuesState} />
  if (crossState.status === 'loading') return <LoadState state={crossState} />
  const available = issueFiles.map((i) => i.number)
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((s) => (
        <li key={s.id}>
          <StakeholderCard variant="detailed" stakeholder={s} listFields={listFields(index, s, ctx, available, sort)} />
        </li>
      ))}
    </ul>
  )
}

/** The fields of one card (design 3.23.9). The percents are shown only
 * while their share sort is on. */
function listFields(
  index: IndexFile,
  s: Stakeholder,
  ctx: ListContext,
  available: number[],
  sort: ListSort,
): StakeholderListFields {
  const cells = stakeholderCells(ctx.issues, s.id)
  const needs = stakeholderSolutionCoverage(ctx.issues, ctx.cross, s.id)
  const share = sort === 'evidence' ? evidenceShare(cells) : null
  const root = t.sideMenu.roots[s.id.startsWith('O') ? 'O' : 'I']
  const trail = pathTrail(s.path, index.pathLabels).map((step) => step.label)
  return {
    path: [root, ...trail].join(' › '),
    issues: s.issues.filter((n) => available.includes(n)).sort((a, b) => a - b),
    issueTitles: index.issues,
    cells,
    evidencePercent: share === null ? null : sharePercent(share),
    needs,
    solutionsPercent: sort === 'solutions' && needs.total > 0 ? sharePercent({ part: needs.covered, total: needs.total }) : null,
  }
}

/** The tree view (design 3.23.11): the tree of the side menu with 組織 and
 * 個人 as h2 headings, side by side from md. Each stakeholder is a link to
 * its page with the 特別關注 badges, then its counts 「議題 2・解法 3」
 * (decision 117). 議題: the analyzed issues it is in, as 出現的議題 of the
 * card view. 解法: stakeholderSolutionCount. While the issue files load,
 * only 「議題 2」 shows. The counts never change the order. With a search,
 * every group is open, so every match is shown (decision 96). */
function TreeView({ index, ids, searching }: { index: IndexFile; ids: string[]; searching: boolean }) {
  const groups = useMemo(() => sideMenuTree(ids, index.stakeholders, index.pathLabels), [ids, index])
  const available = useMemo(() => availableIssues(index).map((i) => i.number), [index])
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issuesState = useIssues(folders)
  const crossState = useCrossIssue()
  // null while the issue files or the cross-issue file load. A cross-issue
  // file that fails to load is left out, like a missing one (as CardView).
  // When the issue files fail, only the issue count shows.
  const solutionFiles = issuesState.status === 'ready' && crossState.status !== 'loading'
    ? { issues: issuesState.data, cross: crossState.status === 'ready' ? crossState.data : null }
    : null
  return (
    <section aria-label={tl.treeLabel}>
      <StakeholderTree
        tree={groups}
        targetOf={(id) => (id === null ? '/stakeholders' : stakeholderTabPath(id, 'overview'))}
        showAll={false}
        current={null}
        ariaCurrent="page"
        forceOpen={searching}
        rootHeadings
        extraOf={(s) => (
          <>
            {s.focus.length > 0 && ' '}
            <FocusBadges stakeholder={s} />{' '}
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {tl.treeCounts(
                s.issues.filter((n) => available.includes(n)).length,
                solutionFiles === null ? null : stakeholderSolutionCount(solutionFiles.issues, solutionFiles.cross, s.id),
              )}
            </span>
          </>
        )}
      />
    </section>
  )
}

/** No stakeholder to show (design 3.23.6 and 3.23.13). With a search, the
 * text names it and offers 「清除搜尋」; with filters, 「清除篩選」 too. */
function EmptyState({ state, filtersOn, params }: { state: ListState; filtersOn: boolean; params: URLSearchParams }) {
  const text = state.q === null
    ? tl.none
    : filtersOn ? tq.noMatchFiltered(state.q, tl.noun) : tq.noMatch(state.q, tl.noun)
  return (
    <div className="space-y-2">
      <p>{text}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        {state.q !== null && (
          <Link
            to={{ pathname: '/stakeholders', search: listUrlSearch(PAGE, { ...state, q: null }) }}
            preventScrollReset
            className={linkClass}
          >
            {tl.clearSearch}
          </Link>
        )}
        {(state.q === null || filtersOn) && (
          <Link to={{ pathname: '/stakeholders', search: clearListFilters(params) }} preventScrollReset className={linkClass}>
            {tb.clear}
          </Link>
        )}
      </p>
    </div>
  )
}
