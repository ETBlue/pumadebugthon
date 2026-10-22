// Lookups for the issue page (design 3.2).
// Order is always the order of the issue file. Nothing here sorts by a count.
import type { IndexFile, IssueSummary, Pending } from '@/types'
import { FOCUS_PARAM } from './focus'

/** The tabs that show one 分析摘要 topic, in the fixed topic order (design
 * 3.2, decision 102): 難以取捨的決定, 可能的爭議, 法規上的障礙,
 * 相依事項與現行政策的關係. summaryTopicOf in summary.ts gives the topic of
 * each tab. The rows of 受影響較大的弱勢族群 are on the 利害關係人 tab
 * (`stakeholders`, decision 109), not on a topic tab. */
export const SUMMARY_TABS = ['decisions', 'controversies', 'legal', 'dependencies'] as const

export type SummaryTab = (typeof SUMMARY_TABS)[number]

/** The tabs of the issue page, in display order (design 3.2). The first one
 * is the default. */
export const ISSUE_TABS = [
  'overview', 'wants', 'needs', 'solutions', 'decisions', 'controversies', 'stakeholders', 'legal', 'dependencies',
] as const

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

/** Where an old tab goes: the new tab, and the ?focus= value to add (null: none). */
export interface LegacyIssueTab {
  tab: IssueTab
  focus: string | null
}

const LEGACY_TABS: Record<string, LegacyIssueTab> = {
  opinion: { tab: 'wants', focus: null },
  conflicts: { tab: 'wants', focus: 'conflicts' },
  // 影響到弱勢 is part of the 利害關係人 tab now (decision 109).
  disadvantaged: { tab: 'stakeholders', focus: null },
}

/** The new place of an old tab name (design 3.2). These URLs were shared on
 * Discord, so they must keep working. null for any other segment.
 * `stakeholders` was an old tab name too (it went to 總覽), but it is a tab
 * again since decision 109. */
export function legacyIssueTab(segment: string | undefined): LegacyIssueTab | null {
  return segment !== undefined && Object.hasOwn(LEGACY_TABS, segment) ? LEGACY_TABS[segment] : null
}

/** The redirect target of an old issue URL. The old query (search, "" or
 * "?…") is kept.
 * - An old tab name: "/issues/2/conflicts" goes to
 *   { pathname: "/issues/2/wants", search: "?focus=conflicts" }.
 * - 總覽 with ?focus=stakeholders (the old place of the stakeholder list,
 *   decision 38) goes to the 利害關係人 tab with the same query, so the
 *   page still scrolls to the list (decision 109).
 * null for any other URL. */
export function legacyIssueTabTarget(
  issueNumber: number,
  segment: string | undefined,
  search: string,
): { pathname: string; search: string } | null {
  const params = new URLSearchParams(search)
  if (segment === undefined && params.get(FOCUS_PARAM) === 'stakeholders') {
    return { pathname: tabPath(issueNumber, 'stakeholders'), search: `?${params.toString()}` }
  }
  const legacy = legacyIssueTab(segment)
  if (!legacy) return null
  if (legacy.focus !== null) params.set(FOCUS_PARAM, legacy.focus)
  const s = params.toString()
  return { pathname: tabPath(issueNumber, legacy.tab), search: s ? `?${s}` : '' }
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

