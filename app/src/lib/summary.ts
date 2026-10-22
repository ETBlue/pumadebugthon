// The 分析摘要 at the top of the 總覽 tab (design 3.2, decision 29).
// Topics keep the fixed order of the issue file. Nothing here sorts by a count.
import type { IssueFile, SummaryItem } from '@/types'
import { DATA_BASED_TAGS, withDataBasisFilter } from './dataBasis'
import { conflictFocusPath, needFocusPath, solutionPath, storyPath } from './entityPaths'
import { SUMMARY_TABS, type SummaryTab } from './issuePage'
import { opinionPickTo } from './opinion'

/** The topics of the 分析摘要, in the fixed order. The same list as
 * analysis_common.SUMMARY_TOPICS. */
export const SUMMARY_TOPICS = [
  '難以取捨的決定',
  '可能的爭議',
  '受影響較大的弱勢族群',
  '法規上的障礙',
  '相依事項與現行政策的關係',
] as const

export type SummaryTopicName = (typeof SUMMARY_TOPICS)[number]

/** The 分析摘要 topic of a tab of the issue page (decision 102). The tabs
 * and the topics have the same order. */
export function summaryTopicOf(tab: SummaryTab): SummaryTopicName {
  return SUMMARY_TOPICS[SUMMARY_TABS.indexOf(tab)]
}

/** The rows of the topic in the issue file, in file order. An empty list
 * when the file has no such topic. */
export function summaryItemsOf(issue: Pick<IssueFile, 'summary'>, tab: SummaryTab): SummaryItem[] {
  const topic = summaryTopicOf(tab)
  return issue.summary.find((t) => t.topic === topic)?.items ?? []
}

/** The rows a topic tab shows (decision 108). With 「只看有資料根據」 on,
 * only the rows whose 說明 is tagged [實證] or [AI整理]: the [AI模擬] rows
 * and the 【待補】 rows (no tag) are hidden, as the other filtered lists hide
 * a story with no data-based tag (hasDataBasis). File order is kept. */
export function summaryItemsShown(items: SummaryItem[], dataBasedOnly: boolean): SummaryItem[] {
  return dataBasedOnly ? items.filter((i) => DATA_BASED_TAGS.includes(i.text.tag)) : items
}

/** The count in the tab label of a topic: the number of rows. On the
 * 受影響較大的弱勢族群 tab only the filled rows count. A row whose 說明 is
 * 【待補】 (for example 「呼吸道疾病（尚未納入）」) is still shown in the tab,
 * but it is not counted (ETBlue, 2026-10-22). The count is the total: it
 * does not change when 「只看有資料根據」 is on (decision 49, 108). */
export function summaryTabCount(issue: Pick<IssueFile, 'summary'>, tab: SummaryTab): number {
  const items = summaryItemsOf(issue, tab)
  return tab === 'disadvantaged' ? items.filter((i) => !i.text.pending).length : items.length
}

/** The counts of the five topic tabs. */
export function summaryTabCounts(issue: Pick<IssueFile, 'summary'>): Record<SummaryTab, number> {
  return Object.fromEntries(SUMMARY_TABS.map((tab) => [tab, summaryTabCount(issue, tab)])) as Record<SummaryTab, number>
}

/** group: a 相同訴求群組 (W08). need: a 相同需求群組 (N01). */
export type SummaryRefKind = 'story' | 'stakeholder' | 'conflict' | 'group' | 'need' | 'solution'

/** One reference of a 相關編號 cell. */
export interface SummaryRef {
  /** The issue number for a reference to another issue (「#8 解法 B」), else null. */
  issue: number | null
  kind: SummaryRefKind
  /** The ID. For a solution, its code: 「解法 B」 -> "B". */
  id: string
}

// The same format as analysis_common.SUMMARY_REF.
const REF = /^(?:#(\d+) )?([OI]\d\d-US\d\d|[OI]\d\d|C\d+|W\d\d|N\d\d|解法 [A-Z])$/

/** Read one reference, for example "I01-US09", "C9", "N01", "解法 A" or "#8 解法 B".
 * null when the text is not a reference. */
export function parseSummaryRef(ref: string): SummaryRef | null {
  const m = REF.exec(ref)
  if (!m) return null
  const issue = m[1] === undefined ? null : Number(m[1])
  const id = m[2]
  if (id.startsWith('解法 ')) return { issue, kind: 'solution', id: id.slice(3) }
  if (id.includes('-US')) return { issue, kind: 'story', id }
  if (id[0] === 'O' || id[0] === 'I') return { issue, kind: 'stakeholder', id }
  if (id[0] === 'N') return { issue, kind: 'need', id }
  return { issue, kind: id[0] === 'C' ? 'conflict' : 'group', id }
}

export interface RefTarget {
  pathname: string
  search: string
}

/** The link of a reference in the summary of issue `issueNumber` (design 3.2).
 * - story: the story page.
 * - group (W08): the 訴求 tab with the group picked in the opinion check.
 * - need (N01): the 需求 tab with ?focus= on the N group.
 * - stakeholder: the stakeholder page.
 * - conflict: the 訴求 tab with ?focus= on the conflict.
 * - solution: the solution page (/solutions/2-E).
 * A reference to another issue gets the same kind of target in that issue.
 * Every target is built from the IDs, so the other issue's file is not needed.
 * Issue and solution links keep the 「只看有資料根據」 filter. null when the
 * reference cannot be read or the ID is not in this issue. */
export function summaryRefTo(ref: string, issueNumber: number, issue: IssueFile, dataBasedOnly: boolean): RefTarget | null {
  const r = parseSummaryRef(ref)
  if (!r) return null
  const filter = dataBasedOnly ? `?${withDataBasisFilter(new URLSearchParams(), true).toString()}` : ''
  if (r.kind === 'stakeholder') {
    if (r.issue === null && !issue.stakeholders.some((s) => s.id === r.id)) return null
    return { pathname: `/stakeholders/${r.id}`, search: '' }
  }
  const other = r.issue !== null && r.issue !== issueNumber
  const n = other ? r.issue! : issueNumber
  // In this issue, the ID must exist. In another issue it is not checked.
  const known = (list: { id: string }[]) => other || list.some((x) => x.id === r.id)
  switch (r.kind) {
    case 'story':
      return known(issue.stories) ? { pathname: storyPath(n, r.id), search: '' } : null
    case 'group':
      return known(issue.groups) ? opinionPickTo(n, r.id, dataBasedOnly) : null
    case 'need':
      return known(issue.needGroups) ? needFocusPath(n, r.id, dataBasedOnly) : null
    case 'conflict':
      return known(issue.conflicts) ? conflictFocusPath(n, r.id, dataBasedOnly) : null
    case 'solution':
      return known(issue.solutions) ? { pathname: solutionPath(n, r.id), search: filter } : null
  }
}
