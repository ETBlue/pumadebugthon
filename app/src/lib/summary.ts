// The 分析摘要 at the top of the 總覽 tab (design 3.2, decision 29).
// Topics keep the fixed order of the issue file. Nothing here sorts by a count.
import type { IssueFile, SummaryItem } from '@/types'
import { DATA_BASED_TAGS, withDataBasisFilter } from './dataBasis'
import { conflictFocusPath, crossSolutionPath, needFocusPath, solutionPath, storyPath } from './entityPaths'
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

/** A short key for each topic, in the same order as SUMMARY_TOPICS.
 * `decisions` is also a tab name of the issue page (SUMMARY_TABS in
 * issuePage.ts, decision 102). The rows of `disadvantaged`
 * (受影響較大的弱勢族群) are on the 利害關係人 tab (decision 109). The rows of
 * the other three are on the solution pages, or on the issue 總覽 tab when
 * they name no solution (decision 140). */
export const SUMMARY_TOPIC_KEYS = ['decisions', 'controversies', 'disadvantaged', 'legal', 'dependencies'] as const

export type SummaryTopicKey = (typeof SUMMARY_TOPIC_KEYS)[number]

/** The 分析摘要 topic of a key. */
export function summaryTopicOf(key: SummaryTopicKey): SummaryTopicName {
  return SUMMARY_TOPICS[SUMMARY_TOPIC_KEYS.indexOf(key)]
}

/** The rows of the topic in the issue file, in file order. An empty list
 * when the file has no such topic. */
export function summaryItemsOf(issue: Pick<IssueFile, 'summary'>, key: SummaryTopicKey): SummaryItem[] {
  const topic = summaryTopicOf(key)
  return issue.summary.find((t) => t.topic === topic)?.items ?? []
}

/** The rows a topic tab shows (decision 108). With 「只看有資料根據」 on,
 * only the rows whose 說明 is tagged [實證] or [AI整理]: the [AI模擬] rows
 * and the 【待補】 rows (no tag) are hidden, as the other filtered lists hide
 * a story with no data-based tag (hasDataBasis). File order is kept. */
export function summaryItemsShown(items: SummaryItem[], dataBasedOnly: boolean): SummaryItem[] {
  return dataBasedOnly ? items.filter((i) => DATA_BASED_TAGS.includes(i.text.tag)) : items
}

/** The count of a topic in a tab label: the number of rows. For
 * 受影響較大的弱勢族群 (「弱勢 M」 in the 利害關係人 tab label, decision 109)
 * only the filled rows count. A row whose 說明 is 【待補】 (for example
 * 「呼吸道疾病（尚未納入）」) is still shown in the tab, but it is not counted
 * (ETBlue, 2026-10-22). The count is the total: it does not change when
 * 「只看有資料根據」 is on (decision 49, 108). */
export function summaryTabCount(issue: Pick<IssueFile, 'summary'>, key: SummaryTopicKey): number {
  const items = summaryItemsOf(issue, key)
  return key === 'disadvantaged' ? items.filter((i) => !i.text.pending).length : items.length
}

/** The counts of the five topics. */
export function summaryTabCounts(issue: Pick<IssueFile, 'summary'>): Record<SummaryTopicKey, number> {
  return Object.fromEntries(SUMMARY_TOPIC_KEYS.map((key) => [key, summaryTabCount(issue, key)])) as Record<SummaryTopicKey, number>
}

/** The group name of a 受影響較大的弱勢族群 row: the 項目 without a note in
 * full-width brackets at the end, for example 「呼吸道疾病（尚未納入）」 ->
 * 「呼吸道疾病」. It is the same name as the 特別關注 tag of the group. */
export function summaryGroupTag(item: Pick<SummaryItem, 'item'>): string {
  return item.item.replace(/（[^（）]*）$/, '').trim()
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
 * - conflict: the 衝突 tab with ?focus= on the conflict (decision 142).
 * - solution: the solution page (/solutions/2-E).
 * A reference to another issue gets the same kind of target in that issue.
 * Every target is built from the IDs, so the other issue's file is not needed.
 * Issue and solution links keep the 「只看有資料根據」 filter. null when the
 * reference cannot be read or the ID is not in this issue. */
export function summaryRefTo(ref: string, issueNumber: number, issue: IssueFile, dataBasedOnly: boolean): RefTarget | null {
  const r = parseSummaryRef(ref)
  if (!r) return null
  if (r.kind === 'stakeholder') {
    if (r.issue === null && !issue.stakeholders.some((s) => s.id === r.id)) return null
    return { pathname: `/stakeholders/${r.id}`, search: '' }
  }
  const other = r.issue !== null && r.issue !== issueNumber
  // In this issue, the ID must exist. In another issue it is not checked.
  const lists: Record<Exclude<SummaryRefKind, 'stakeholder'>, { id: string }[]> = {
    story: issue.stories, group: issue.groups, need: issue.needGroups, conflict: issue.conflicts, solution: issue.solutions,
  }
  if (!other && !lists[r.kind].some((x) => x.id === r.id)) return null
  return issueRefTarget(r, other ? r.issue! : issueNumber, dataBasedOnly)
}

/** The search part of a link that keeps 「只看有資料根據」. */
const filterSearch = (dataBasedOnly: boolean) =>
  dataBasedOnly ? `?${withDataBasisFilter(new URLSearchParams(), true).toString()}` : ''

/** The target of a reference that is not a stakeholder, in issue n. */
function issueRefTarget(r: SummaryRef, n: number, dataBasedOnly: boolean): RefTarget | null {
  switch (r.kind) {
    case 'story': return { pathname: storyPath(n, r.id), search: '' }
    case 'group': return opinionPickTo(n, r.id, dataBasedOnly)
    case 'need': return needFocusPath(n, r.id, dataBasedOnly)
    case 'conflict': return conflictFocusPath(n, r.id, dataBasedOnly)
    case 'solution': return { pathname: solutionPath(n, r.id), search: filterSearch(dataBasedOnly) }
    case 'stakeholder': return null
  }
}

/** The link of a reference in the cross-issue file (decision 140), for the
 * 「相關：」 line on a cross-issue solution page:
 * - 「解法 X-A」: the cross-issue solution page.
 * - an ID of one issue (「#8 I25-US01」, 「#1 解法 C」, 「#2 C6」): the same
 *   target as on the issue page (summaryRefTo).
 * - a stakeholder (「I05」): its page, when the ID is in stakeholderIds.
 * - an X-N group or an X-C conflict: null, because they have no page.
 * null too when the reference cannot be read. */
export function crossSummaryRefTo(ref: string, stakeholderIds: ReadonlySet<string>, dataBasedOnly: boolean): RefTarget | null {
  const cross = /^解法 (X-[A-Z])$/.exec(ref)
  if (cross) return { pathname: crossSolutionPath(cross[1]), search: filterSearch(dataBasedOnly) }
  const r = parseSummaryRef(ref)
  if (!r) return null
  if (r.kind === 'stakeholder') return stakeholderIds.has(r.id) ? { pathname: `/stakeholders/${r.id}`, search: '' } : null
  return r.issue === null ? null : issueRefTarget(r, r.issue, dataBasedOnly)
}

/** The topics whose rows are not on an issue tab any more (decision 140). */
export const NO_TAB_TOPIC_KEYS = ['controversies', 'legal', 'dependencies'] as const

export interface UnlinkedTopic {
  key: (typeof NO_TAB_TOPIC_KEYS)[number]
  topic: SummaryTopicName
  /** The rows of the topic that name no solution (solutions is []), in file order. */
  items: SummaryItem[]
}

/** The rows of 可能的爭議, 法規上的障礙 and 相依事項與現行政策的關係 that name
 * no solution, for the issue 總覽 tab (ETBlue, 2026-10-23; decision 140).
 * A row that names a solution is on that solution's page instead. A topic
 * with no such row is left out. Fixed topic order, file order inside. */
export function unlinkedSummaryTopics(issue: Pick<IssueFile, 'summary'>): UnlinkedTopic[] {
  return NO_TAB_TOPIC_KEYS.flatMap((key) => {
    const items = summaryItemsOf(issue, key).filter((i) => i.solutions.length === 0)
    return items.length === 0 ? [] : [{ key, topic: summaryTopicOf(key), items }]
  })
}
