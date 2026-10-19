// Lookups for the issue page (design 3.2).
// Order is always the order of the issue file. Nothing here sorts by a count.
import type { IndexFile, IssueFile, IssueSummary, Pending, Priority, Story } from '@/types'
import { FOCUS_PARAM } from './focus'
import { PRIORITIES } from './priority'

/** The tabs of the issue page, in display order (design 3.2). The first one
 * is the default. */
export const ISSUE_TABS = ['overview', 'wants', 'needs', 'solutions'] as const

export type IssueTab = (typeof ISSUE_TABS)[number]

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
  stakeholders: { tab: 'overview', focus: 'stakeholders' },
}

/** The new place of an old tab name (design 3.2). These URLs were shared on
 * Discord, so they must keep working. null for any other segment. */
export function legacyIssueTab(segment: string | undefined): LegacyIssueTab | null {
  return segment !== undefined && Object.hasOwn(LEGACY_TABS, segment) ? LEGACY_TABS[segment] : null
}

/** The redirect target of an old tab URL, for example "/issues/2/conflicts"
 * goes to { pathname: "/issues/2/wants", search: "?focus=conflicts" }. The
 * old query (search, "" or "?…") is kept. null when the segment is not an
 * old tab name. */
export function legacyIssueTabTarget(
  issueNumber: number,
  segment: string | undefined,
  search: string,
): { pathname: string; search: string } | null {
  const legacy = legacyIssueTab(segment)
  if (!legacy) return null
  const params = new URLSearchParams(search)
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

export interface PriorityGroup {
  priority: Priority
  stories: Story[]
}

/** The stories of storyIds grouped by priority, in the order M, S, C, W.
 * Stories keep the order of storyIds. Groups with no story and unknown IDs
 * are left out. */
export function storiesByPriority(issue: IssueFile, storyIds: string[]): PriorityGroup[] {
  const byId = new Map(issue.stories.map((s) => [s.id, s]))
  const stories = storyIds.flatMap((id) => byId.get(id) ?? [])
  return PRIORITIES.map((priority) => ({ priority, stories: stories.filter((s) => s.priority === priority) })).filter(
    (g) => g.stories.length > 0,
  )
}
