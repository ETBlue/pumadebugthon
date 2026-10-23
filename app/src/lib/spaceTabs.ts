// The sort, filter and search of the 解法 and 利害關係人 tabs of the space
// page (design 3.6, decision 138). They use the URL params, the sorts and
// the search rules of #/solutions and #/stakeholders, limited to the items
// of one space. The list is filtered, then searched, then sorted, as on the
// list pages.
import type { IndexFile, IssueFile, Stakeholder } from '@/types'
import { filterSolutions } from './listFilter'
import { listOnlySearch, listParamsOf, listUrlSearch, type ListParams, type ListState } from './listParams'
import { parseListQuery, solutionMatches, stakeholderMatches } from './listSearch'
import { sortSolutions, sortStakeholders, type ListContext } from './listSort'
import type { RecentSolution } from './recent'
import { solutionsBySpace, stakeholdersBySpace, stakeholdersInSeveralIssues, type SharedSpaceStakeholder, type SpaceStakeholders } from './spaces'
import { findStakeholder } from './stakeholders'

/** The page of each tab: its URL params, its sorts and its result line. */
export const SPACE_TAB_PAGE = { solutions: 'solutions', stakeholders: 'stakeholders' } as const
export type SpaceListTab = keyof typeof SPACE_TAB_PAGE

/** The state of a space tab from the URL. It reads the params of the list
 * page (listParamsOf), then drops what the tab does not offer:
 * - 議題: only the issues of the tab (issueNumbers). No 「跨議題」.
 * - 空間類型 (space=): every item already uses this space.
 * - The view of #/stakeholders (view=tree): the tab has no tree view.
 * replace is true when the URL had a list param that was dropped or
 * changed. Params that are not list params (evidence, …) are not looked at. */
export function spaceTabParams(
  tab: SpaceListTab,
  params: URLSearchParams,
  index: IndexFile,
  issueNumbers: number[],
): ListParams {
  const page = SPACE_TAB_PAGE[tab]
  const read = listParamsOf(page, params, index)
  const state: ListState = {
    ...read,
    issues: read.issues.filter((n) => issueNumbers.includes(n)),
    crossChoice: false,
    spaces: [],
    view: 'cards',
  }
  delete (state as Partial<ListParams>).replace
  return { ...state, replace: listUrlSearch(page, state) !== listOnlySearch(params) }
}

/** True when a filter or the search is on (the sort is not a filter). */
export function spaceTabFiltered(state: ListState): boolean {
  return state.q !== null || state.issues.length > 0 || state.who !== null || state.specialOnly
}

// ---------- 解法 ----------

/** The solutions of the space as list items, in the fixed order: by issue
 * number, then by letter. */
export function spaceSolutionItems(issues: IssueFile[], code: string): RecentSolution[] {
  return solutionsBySpace(issues, code).map((s): RecentSolution => ({ kind: 'issue', ...s }))
}

/** The issues that have a solution in the space, by number. The options of
 * the 議題 filter of the 解法 tab. */
export function spaceSolutionIssues(issues: IssueFile[], code: string): number[] {
  return [...new Set(solutionsBySpace(issues, code).map((s) => s.issueNumber))]
}

/** The 解法 tab (decision 138): 議題 and 利害關係人 (the same rules as
 * #/solutions, filterSolutions), then the search (solutionMatches), then the
 * sort of #/solutions (sortSolutions). 資料根據比例 uses the cells of the
 * solution's issue, as the card. */
export function spaceSolutionsView(items: RecentSolution[], state: ListState, issues: IssueFile[]): RecentSolution[] {
  const ctx: ListContext = { issues, cross: null }
  const query = state.q === null ? null : parseListQuery(state.q)
  const kept = filterSolutions(items, state, ctx).filter((item) => solutionMatches(item, query))
  return sortSolutions(kept, state.sort === 'solutions' ? 'updated' : state.sort, ctx)
}

type IssueItem = Extract<RecentSolution, { kind: 'issue' }>

/** The items grouped by issue, in issue number order. Inside a group the
 * order of items is kept (the sort). */
export function groupByIssue(items: RecentSolution[]): { issueNumber: number; items: IssueItem[] }[] {
  const groups = new Map<number, IssueItem[]>()
  for (const item of items) {
    if (item.kind !== 'issue') continue
    const list = groups.get(item.issueNumber) ?? []
    list.push(item)
    groups.set(item.issueNumber, list)
  }
  return [...groups].sort((a, b) => a[0] - b[0]).map(([issueNumber, list]) => ({ issueNumber, items: list }))
}

// ---------- 利害關係人 ----------

export interface SpaceStakeholdersView {
  /** 在多個議題都出現的利害關係人, after the filters, the search and the sort. */
  shared: SharedSpaceStakeholder[]
  /** True when the space has such stakeholders before the filters. */
  sharedAny: boolean
  /** 各議題的利害關係人: one group per issue, after the filters, the search
   * and the sort. A group with nothing left is left out. */
  byIssue: SpaceStakeholders[]
  /** The number of different stakeholders shown, and of all of them. */
  shown: number
  total: number
}

/** The issues that have a stakeholder in the space, by number. The options
 * of the 議題 filter of the 利害關係人 tab. */
export function spaceStakeholderIssues(issues: IssueFile[], code: string): number[] {
  return stakeholdersBySpace(issues, code).map((e) => e.issueNumber)
}

/** The 利害關係人 tab (decision 138). The filters and the search, as on
 * #/stakeholders:
 * - 議題: a group of another issue is left out. A stakeholder of
 *   「在多個議題都出現」 stays when one of its issues is picked.
 * - 只看特別關注族群: only stakeholders with a 特別關注 group.
 * - The search: the ID or a part of the name (stakeholderMatches).
 * Which stakeholders are 「在多個議題都出現」 is decided before the filters.
 * The sort is the sort of #/stakeholders (sortStakeholders). The shares use
 * the issues the card shows: the one issue of a group, and every issue of
 * the space for 「在多個議題都出現」. cross-issue.json is not used. */
export function spaceStakeholdersView(
  index: IndexFile,
  issues: IssueFile[],
  code: string,
  state: ListState,
): SpaceStakeholdersView {
  const all = stakeholdersBySpace(issues, code)
  const sharedAll = stakeholdersInSeveralIssues(all)
  const query = state.q === null ? null : parseListQuery(state.q)
  const keep = (id: string) => {
    const s = findStakeholder(index.stakeholders, id)
    return (!state.specialOnly || s.focus.length > 0) && stakeholderMatches(s, query)
  }
  const sort = (ids: string[], files: IssueFile[]): string[] =>
    sortStakeholders(ids.map((id) => findStakeholder(index.stakeholders, id)), state.sort, { issues: files, cross: null })
      .map((s: Stakeholder) => s.id)

  const picked = (n: number) => state.issues.length === 0 || state.issues.includes(n)
  const sharedKept = sharedAll.filter((s) => s.issues.some(picked) && keep(s.id))
  const sharedOrder = sort(sharedKept.map((s) => s.id), issues)
  const shared = sharedOrder.map((id) => sharedKept.find((s) => s.id === id)!)

  const byIssue = all
    .filter((e) => picked(e.issueNumber))
    .map((e) => ({
      issueNumber: e.issueNumber,
      stakeholders: sort(e.stakeholders.filter(keep), issues.filter((i) => i.number === e.issueNumber)),
    }))
    .filter((e) => e.stakeholders.length > 0)

  return {
    shared,
    sharedAny: sharedAll.length > 0,
    byIssue,
    shown: new Set(byIssue.flatMap((e) => e.stakeholders)).size,
    total: new Set(all.flatMap((e) => e.stakeholders)).size,
  }
}
