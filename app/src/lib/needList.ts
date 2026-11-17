// The need list page #/needs (plan-needs.md, Task N3): one flat list of the
// needs of every analyzed issue (needRecords.ts). The list is filtered, then
// searched, then sorted by the sort the reader picks (listSort.ts). The
// search never changes the order. Nothing here sorts by a count.
import type { Cell, CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { filterNeeds } from './listFilter'
import { listParamsOf, type ListParams, type ListState, type OfferedCodes } from './listParams'
import { needMatches, parseListQuery } from './listSearch'
import { sortNeeds } from './listSort'
import { needRecords, type NeedRecord } from './needRecords'
import { needSummaryOf } from './needs'
import { typesOf, type TypeOfKind } from './typeKinds'

/** One item of #/needs: the need record and its summary with its tag (the
 * N group's summary, or the 以便… cell of a single-story need). */
export interface NeedListItem extends NeedRecord {
  summary: Cell
}

/** Every need of the given issue files, in the fixed ID order (issue
 * number, then need ID). cross is null when cross-issue.json does not
 * exist or is not loaded. */
export function needListItems(issues: IssueFile[], cross: CrossIssueFile | null): NeedListItem[] {
  return needRecords(issues, cross).map((r) => {
    const issue = issues.find((i) => i.number === r.issue)!
    return { ...r, summary: needSummaryOf(issue, r.need) }
  })
}

/** The 空間類型 or 領域 types that at least one need has (record.spaces or
 * record.domains), in file order (level 2 only). For the bar filters.
 * Never ordered by a count. */
export function needTypeOptions<K extends 'space' | 'domain'>(
  kind: K,
  index: IndexFile,
  items: readonly Pick<NeedRecord, 'spaces' | 'domains'>[],
): TypeOfKind[K][] {
  const used = new Set(items.flatMap((r) => (kind === 'space' ? r.spaces : r.domains)))
  return typesOf(kind, index).filter((t) => used.has(t.code))
}

/** The state of #/needs from its URL params (listParamsOf). The space and
 * 領域 codes are the ones the needs use. Without
 * cross-issue.json, 「跨議題」 (issue=X) is dropped, as on #/solutions.
 * replace is true when the URL must be replaced with the cleaned state. */
export function needsParams(
  params: URLSearchParams,
  index: IndexFile,
  cross: CrossIssueFile | null,
  items: NeedListItem[],
): ListParams {
  const offered: OfferedCodes = {
    space: needTypeOptions('space', index, items).map((t) => t.code),
    domain: needTypeOptions('domain', index, items).map((t) => t.code),
  }
  const read = listParamsOf('needs', params, index, offered)
  if (cross !== null || !read.crossChoice) return read
  return { ...read, crossChoice: false, replace: true }
}

/** The cards of #/needs: the filters (ALL of them), then the search (q),
 * then the sort. items: needListItems. */
export function needListView(items: NeedListItem[], state: ListState): NeedListItem[] {
  const query = state.q === null ? null : parseListQuery(state.q)
  const kept = filterNeeds(items, state).filter((r) => needMatches({ summary: r.summary.text, stories: r.stories }, query))
  return sortNeeds(kept, state.sort === 'solutions' ? 'updated' : state.sort)
}
