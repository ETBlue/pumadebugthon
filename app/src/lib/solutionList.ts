// The solution list page #/solutions (design 3.23, decision 89): one flat
// list of the issue solutions and the cross-issue solutions. The list is
// filtered, then searched, then sorted by the sort the reader picks
// (listSort.ts). The search never changes the order.
import type { CellCounts, CrossIssueFile, CrossSolution, IndexFile, IssueFile, Solution } from '@/types'
import { crossSolutionCells, solutionCells } from './coverage'
import { crossCoverageIssueNumbers, crossIssueNumbers } from './crossIssue'
import { filterSolutions } from './listFilter'
import { listParamsOf, type ListParams, type ListState, type OfferedCodes } from './listParams'
import { parseListQuery, solutionMatches } from './listSearch'
import { compareSolutionItems, sortSolutions, type ListContext } from './listSort'
import type { RecentSolution } from './recent'
import { solutionCodes, TYPE_KINDS, typesOf, type TypeKind, type TypeOfKind } from './typeKinds'

/** Every solution of the given issue files and every cross-issue solution,
 * in the fixed ID order: the cross-issue solutions first, then by issue
 * number, then by the number of the code (S2 before S10). cross is null when cross-issue.json does not
 * exist. */
export function solutionListItems(issues: IssueFile[], cross: CrossIssueFile | null): RecentSolution[] {
  const items: RecentSolution[] = [
    ...(cross?.solutions ?? []).map((solution): RecentSolution => ({ kind: 'cross', solution })),
    ...issues.flatMap((issue) =>
      issue.solutions.map((solution): RecentSolution => ({ kind: 'issue', issueNumber: issue.number, solution })),
    ),
  ]
  return items.sort(compareSolutionItems)
}

/** The state of #/solutions from its URL params (listParamsOf). The space,
 * 領域 and 解法類型 codes are the ones a solution uses (solutionTypeOptions). Without
 * cross-issue.json, 「跨議題解法」 (issue=X) is dropped too. replace is true
 * when the URL must be replaced with the cleaned state. */
export function solutionsParams(
  params: URLSearchParams,
  index: IndexFile,
  issues: IssueFile[],
  cross: CrossIssueFile | null,
): ListParams {
  const offered: OfferedCodes = {}
  for (const kind of TYPE_KINDS) offered[kind] = solutionTypeOptions(kind, index, issues, cross).map((t) => t.code)
  const read = listParamsOf('solutions', params, index, offered)
  if (cross !== null || !read.crossChoice) return read
  return { ...read, crossChoice: false, replace: true }
}

/** The cards of #/solutions: the filters (ALL of them), then the search
 * (q), then the sort. items: solutionListItems. */
export function solutionListView(items: RecentSolution[], state: ListState, ctx: ListContext): RecentSolution[] {
  const query = state.q === null ? null : parseListQuery(state.q)
  const kept = filterSolutions(items, state, ctx).filter((item) => solutionMatches(item, query))
  return sortSolutions(kept, state.sort === 'solutions' ? 'updated' : state.sort, ctx)
}

/** The issues whose needs a cross-issue solution covers, but which are not
 * in its parts, in number order. For 「也涵蓋 #1 的需求」 on the card (X-S5). */
export function crossAlsoCovers(cross: CrossIssueFile, solution: CrossSolution): number[] {
  const parts = new Set(crossIssueNumbers(solution))
  return crossCoverageIssueNumbers(cross, solution).filter((n) => !parts.has(n))
}

/** The cells of the stories of the needs a solution covers (design 3.23.4),
 * for 「涵蓋需求的資料根據」 on the card. All zero when the issue file or
 * cross-issue.json is missing. */
export function solutionItemCells(item: RecentSolution, ctx: ListContext): CellCounts {
  const none: CellCounts = { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 }
  if (item.kind === 'cross') return ctx.cross === null ? none : crossSolutionCells(ctx.cross, item.solution, ctx.issues)
  const issue = ctx.issues.find((i) => i.number === item.issueNumber)
  return issue ? solutionCells(issue, item.solution) : none
}

/** The types of the kind that at least one solution uses (solutionCodes),
 * in file order (level 2 only). For the 空間類型, 領域 and 解法類型 filters
 * (Task U5). Never ordered by a count. cross adds the codes of the
 * cross-issue solutions (null when cross-issue.json does not exist). */
export function solutionTypeOptions<K extends TypeKind>(
  kind: K,
  index: IndexFile,
  issues: IssueFile[],
  cross: CrossIssueFile | null = null,
): TypeOfKind[K][] {
  const used = new Set([
    ...issues.flatMap((i) => i.solutions.flatMap((s) => solutionCodes(kind, s))),
    ...(cross?.solutions.flatMap((s) => solutionCodes(kind, s)) ?? []),
  ])
  return typesOf(kind, index).filter((t) => used.has(t.code))
}

/** The number of needs the solution covers, for 「涵蓋 9 個需求」 on
 * #/solutions (decision 54): the rows of step 5.2 that it lists in
 * needs.must or needs.shouldCould. The same number as the covered count of
 * the solution page's 需求 tab. null in the old format (needs is null). */
export function coveredNeedCount(issue: IssueFile, solution: Solution): number | null {
  const needs = solution.needs
  if (needs === null) return null
  return issue.needs.filter((n) => needs.must.includes(n.id) || needs.shouldCould.includes(n.id)).length
}
