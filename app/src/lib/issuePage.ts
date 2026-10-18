// Lookups for the issue page (design 3.2).
// Order is always the order of the issue file. Nothing here sorts by a count.
import type { IndexFile, IssueFile, IssueSummary, Pending, Priority, Story } from '@/types'
import { PRIORITIES } from './priority'

/** The tabs of the issue page, in display order. The first one is the default. */
export const ISSUE_TABS = ['overview', 'opinion', 'stakeholders', 'conflicts', 'solutions'] as const

export type IssueTab = (typeof ISSUE_TABS)[number]

/** The tab of the URL segment. No segment is the overview. An unknown name
 * returns null. */
export function parseTab(segment: string | undefined): IssueTab | null {
  if (segment === undefined) return 'overview'
  return (ISSUE_TABS as readonly string[]).includes(segment) ? (segment as IssueTab) : null
}

/** The URL path of a tab, for example "/issues/2/conflicts". The overview has
 * no tab segment: "/issues/2". */
export function tabPath(issueNumber: number, tab: IssueTab): string {
  return tab === 'overview' ? `/issues/${issueNumber}` : `/issues/${issueNumber}/${tab}`
}

export type FoundIssue =
  | { kind: 'available'; issue: Extract<IssueSummary, { available: true }> }
  | { kind: 'unavailable'; issue: Extract<IssueSummary, { available: false }> }
  | { kind: 'notFound' }

/** The issue for the number in the URL. The number must be written as a plain
 * positive number, for example "2" (not "02" or "2.0"). */
export function findIssue(index: IndexFile, segment: string | undefined): FoundIssue {
  if (segment === undefined || !/^[1-9]\d*$/.test(segment)) return { kind: 'notFound' }
  const issue = index.issues.find((i) => i.number === Number(segment))
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
