// Lookups for the issue page (design 3.2).
// Order is always the order of the issue file. Nothing here sorts by a count.
import type { IndexFile, IssueSummary, Pending } from '@/types'

/** The tabs that show one 分析摘要 topic (design 3.2, decisions 102 and
 * 140): only 難以取捨的決定 now. summaryTopicOf in summary.ts gives the topic
 * of each tab. The rows of 受影響較大的弱勢族群 are on the 利害關係人 tab
 * (`stakeholders`, decision 109). The rows of 可能的爭議, 法規上的障礙 and
 * 相依事項與現行政策的關係 are on the solution pages when they name a
 * solution, and on the issue 總覽 tab when they name none (decision 140). */
export const SUMMARY_TABS = ['decisions'] as const

export type SummaryTab = (typeof SUMMARY_TABS)[number]

/** The tabs of the issue page, in display order (design 3.2). The first one
 * is the default. 利害關係人 is second, right after 總覽 (decision 116).
 * 衝突 has its own tab after 需求 (decision 142). Before, the conflicts were
 * in the 訴求 tab. 難以取捨 is before 解法 (decision 140). The old tabs
 * controversies, legal and dependencies are gone: their URLs show
 * 「找不到這個分頁」. */
export const ISSUE_TABS = ['overview', 'stakeholders', 'wants', 'needs', 'conflicts', 'decisions', 'solutions'] as const

export type IssueTab = (typeof ISSUE_TABS)[number]

/** True for the tab of a 分析摘要 topic. */
export function isSummaryTab(tab: IssueTab): tab is SummaryTab {
  return (SUMMARY_TABS as readonly string[]).includes(tab)
}

/** The tab of the URL segment. No segment is the overview. An unknown name
 * returns null. */
export function parseTab(segment: string | undefined): IssueTab | null {
  if (segment === undefined) return 'overview'
  return (ISSUE_TABS as readonly string[]).includes(segment) ? (segment as IssueTab) : null
}

/** The URL path of a tab, for example "/issues/2/wants". The overview has
 * no tab segment: "/issues/2". */
export function tabPath(issueNumber: number, tab: IssueTab): string {
  return tab === 'overview' ? `/issues/${issueNumber}` : `/issues/${issueNumber}/${tab}`
}

export type FoundIssue =
  | { kind: 'available'; issue: Extract<IssueSummary, { available: true }> }
  | { kind: 'unavailable'; issue: Extract<IssueSummary, { available: false }> }
  | { kind: 'notFound' }

/** The issue number of a URL segment. It must be written as a plain positive
 * number, for example "2" (not "02" or "2.0"). null for anything else. */
export function parseIssueNumber(segment: string | undefined): number | null {
  return segment !== undefined && /^[1-9]\d*$/.test(segment) ? Number(segment) : null
}

/** The issue for the number in the URL (see parseIssueNumber). */
export function findIssue(index: IndexFile, segment: string | undefined): FoundIssue {
  const number = parseIssueNumber(segment)
  if (number === null) return { kind: 'notFound' }
  const issue = index.issues.find((i) => i.number === number)
  if (!issue) return { kind: 'notFound' }
  return issue.available ? { kind: 'available', issue } : { kind: 'unavailable', issue }
}

export interface PendingGroup {
  section: string | null
  items: Pending[]
}

/** The 待補清單 grouped by section. Sections are in the order of their first
 * item in the issue file. Items keep their order. Every item is kept. */
export function pendingBySection(pending: Pending[]): PendingGroup[] {
  const groups: PendingGroup[] = []
  for (const item of pending) {
    const group = groups.find((g) => g.section === item.section)
    if (group) group.items.push(item)
    else groups.push({ section: item.section, items: [item] })
  }
  return groups
}

