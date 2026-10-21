import { useEffect, useId, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ListBar, type ListBarFilter } from '@/components/ListBar'
import type { HistoryMode } from '@/components/ListSearchBox'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { ResultLine } from '@/components/ResultLine'
import { SolutionCard } from '@/components/SolutionCard'
import { CrossSolutionCard } from '@/components/solution/CrossSolutionCard'
import { StakeholderPicker } from '@/components/StakeholderPicker'
import { linkClass, proseClass } from '@/components/styles'
import { useCrossIssue, useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { evidenceShare, sharePercent } from '@/lib/coverage'
import { crossSolutionTabCounts, issuesOfCross } from '@/lib/crossIssue'
import { availableIssues } from '@/lib/issues'
import {
  clearListFilters, CROSS_ISSUE_VALUE, legacyListRedirect, LIST_PARAMS, listParamsOf, listUrlSearch, PAGE_SORTS, type ListParams, type ListState,
} from '@/lib/listParams'
import { solutionItemKey, type ListContext } from '@/lib/listSort'
import type { RecentSolution } from '@/lib/recent'
import {
  coveredNeedCount, crossAlsoCovers, solutionItemCells, solutionListItems, solutionListView, solutionSpaceOptions,
  solutionsParams,
} from '@/lib/solutionList'
import { findStakeholder } from '@/lib/stakeholders'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'

const tl = t.lists
const tb = t.listBar
const ts = t.solutionsList
const tq = t.listSearch

/** #/solutions (design 3.23, decision 89): the search, sort and filter bar,
 * the result line, the sort note, then one flat list of the issue solutions
 * and the cross-issue solutions. The list is filtered, then searched, then
 * sorted. Every sort, filter and search is in the URL. */
export default function Solutions() {
  const index = useIndex()
  return (
    <>
      <PageTitle parts={[tl.solutionsTitle]} />
      {/* The highlighted header link is the visible title (decision 79). */}
      <h1 className="sr-only">{tl.solutionsTitle}</h1>
      {index.status === 'ready' ? <SolutionsBody index={index.data} /> : <LoadState state={index} />}
    </>
  )
}

const NO_ISSUES: IssueFile[] = []

function SolutionsBody({ index }: { index: IndexFile }) {
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

  const search = params.toString()
  const p: ListParams = useMemo(() => {
    const read = new URLSearchParams(search)
    if (ready) return solutionsParams(read, index, issueFiles, cross)
    // While the data loads, keep every known space code, so nothing in the
    // URL is lost before the solutions are known. No replace yet.
    return { ...listParamsOf('solutions', read, index, index.spaceTypes.map((s) => s.code)), replace: false }
  }, [search, ready, index, issueFiles, cross])
  const replace = p.replace
  const state: ListState = useMemo(() => {
    const { replace: _drop, ...rest } = p
    return rest
  }, [p])

  // An old link with ?evidence=1 (decision 100), or a URL with unknown
  // values (design 3.23.5): replace it with the clean URL, so the back
  // button does not loop. The old param is dropped at once, also while the
  // data loads.
  const redirect = legacyListRedirect('solutions', search)
  const cleanSearch = listUrlSearch('solutions', state)
  useEffect(() => {
    if (redirect !== null) navigate({ pathname, search: redirect }, { replace: true, preventScrollReset: true })
    else if (replace) navigate({ pathname, search: cleanSearch }, { replace: true, preventScrollReset: true })
  }, [redirect, replace, cleanSearch, pathname, navigate])

  const onNavigate = (next: string, mode: HistoryMode) =>
    navigate({ pathname, search: next }, { replace: mode === 'replace', preventScrollReset: true })

  const ctx: ListContext = useMemo(() => ({ issues: issueFiles, cross }), [issueFiles, cross])
  const items = useMemo(() => solutionListItems(issueFiles, cross), [issueFiles, cross])
  const shown = useMemo(() => solutionListView(items, state, ctx), [items, ctx, state])

  const filters = barFilters(index, state, issueFiles, cross, ready)
  const parts = resultParts(index, state)
  const resultProps = { page: 'solutions' as const, shown: shown.length, total: items.length, q: state.q, parts }
  const shareOn = state.sort === 'evidence'

  return (
    <>
      <ListBar
        page="solutions"
        state={state}
        sorts={PAGE_SORTS.solutions}
        filters={filters}
        sortNoteId={shareOn ? noteId : undefined}
        resultLine={<ResultLine {...resultProps} clearLink={false} />}
        onNavigate={onNavigate}
        className="rounded-md border"
      />
      <ResultLine {...resultProps} className="mt-3" />
      {/* The sort note while 資料根據比例 is on. The 資料根據 explanation
          is part of it, as on #/stakeholders (design 3.23.9). */}
      {shareOn && (
        <div id={noteId} className={`mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground ${proseClass}`}>
          <p>{tb.sortNotes.evidence}</p>
          <p>{t.basis.listNote('解法')}</p>
        </div>
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
              <li key={solutionItemKey(item)}>
                <SolutionItemCard item={item} index={index} ctx={ctx} shareOn={shareOn} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

/** The filters of #/solutions, in the order of design 3.23.5: 議題 (with
 * 「跨議題解法」 when cross-issue.json exists), 空間類型, 利害關係人. */
function barFilters(
  index: IndexFile,
  state: ListState,
  issueFiles: IssueFile[],
  cross: CrossIssueFile | null,
  ready: boolean,
): ListBarFilter[] {
  const issueOptions = [
    ...(cross !== null ? [{ value: CROSS_ISSUE_VALUE, label: ts.crossChoice }] : []),
    ...availableIssues(index).map((i) => ({ value: String(i.number), label: ts.issueOption(i.number, i.title) })),
  ]
  const spaceOptions = ready ? solutionSpaceOptions(index.spaceTypes, issueFiles, cross) : []
  const filters: ListBarFilter[] = [
    {
      kind: 'choices',
      key: 'issue',
      label: ts.issueFilter,
      options: issueOptions,
      value: [...(state.crossChoice ? [CROSS_ISSUE_VALUE] : []), ...state.issues.map(String)],
      none: tb.all,
      next: (v) => ({
        ...state,
        crossChoice: v.includes(CROSS_ISSUE_VALUE),
        issues: v.filter((x) => x !== CROSS_ISSUE_VALUE).map(Number),
      }),
    },
  ]
  if (spaceOptions.length > 0) {
    filters.push({
      kind: 'choices',
      key: 'space',
      label: ts.spaceFilter,
      options: spaceOptions.map((s) => ({ value: s.code, label: s.name })),
      value: state.spaces,
      next: (v) => ({ ...state, spaces: v }),
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

/** The filters that are on, as text for the result line, in the order of
 * the bar. The search is added by ResultLine. */
function resultParts(index: IndexFile, state: ListState): string[] {
  const parts: string[] = []
  const issues = [...(state.crossChoice ? [ts.crossChoice] : []), ...state.issues.map(ts.issueShort)]
  if (issues.length > 0) parts.push(tb.filterPart(ts.issueFilter, issues))
  if (state.spaces.length > 0) {
    const names = index.spaceTypes.filter((s) => state.spaces.includes(s.code)).map((s) => s.name)
    parts.push(tb.filterPart(ts.spaceFilter, names))
  }
  if (state.who !== null) {
    const s = findStakeholder(index.stakeholders, state.who)
    parts.push(tb.filterPart(ts.whoFilter, [t.sideMenu.item(s.id, s.name)]))
  }
  return parts
}

/** The card area when nothing is shown (design 3.23.6 and 3.23.13). */
function EmptyState({ state, params, pathname }: { state: ListState; params: URLSearchParams; pathname: string }) {
  const filtersOn = state.issues.length > 0 || state.crossChoice || state.spaces.length > 0 || state.who !== null
  const noQ = new URLSearchParams(params)
  noQ.delete(LIST_PARAMS.q)
  const noQSearch = noQ.toString() ? `?${noQ.toString()}` : ''
  const clearSearch = (
    <Link to={{ pathname, search: noQSearch }} preventScrollReset className={linkClass}>{tq.clear}</Link>
  )
  const clearFilters = (
    <Link to={{ pathname, search: clearListFilters(params) }} preventScrollReset className={linkClass}>{tb.clear}</Link>
  )
  if (state.q === null) {
    return (
      <p>
        {ts.none} {clearFilters}
      </p>
    )
  }
  return (
    <p>
      {filtersOn ? tq.noMatchFiltered(state.q, ts.noun) : tq.noMatch(state.q, ts.noun)} {clearSearch}
      {filtersOn && <> {clearFilters}</>}
    </p>
  )
}

/** One card of the list: a SolutionCard or a CrossSolutionCard, detailed. */
function SolutionItemCard({ item, index, ctx, shareOn }: {
  item: RecentSolution
  index: IndexFile
  ctx: ListContext
  shareOn: boolean
}) {
  const cells = solutionItemCells(item, ctx)
  const share = shareOn ? evidenceShare(cells) : null
  const basis = { cells, percent: share === null ? null : sharePercent(share) }
  if (item.kind === 'cross') {
    const cross = ctx.cross!
    const sol = item.solution
    return (
      <CrossSolutionCard
        solution={sol}
        detailed={{
          spaceTypes: index.spaceTypes,
          coveredNeeds: issuesOfCross(sol, ctx.issues).length === 0 ? null : crossSolutionTabCounts(cross, sol, ctx.issues).needs.covered,
          basis,
          alsoCovers: crossAlsoCovers(cross, sol),
        }}
      />
    )
  }
  const issue = ctx.issues.find((i) => i.number === item.issueNumber)!
  return (
    <SolutionCard
      variant="detailed"
      solution={item.solution}
      issueNumber={item.issueNumber}
      showIssue
      spaceTypes={index.spaceTypes}
      coveredNeeds={coveredNeedCount(issue, item.solution)}
      issueTitle={issue.title}
      basis={basis}
    />
  )
}
