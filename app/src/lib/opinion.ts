// The opinion check (design section 4).
import type { Conflict, IssueFile, Solution, Story, Tag } from '@/types'
import { withDataBasisFilter } from './dataBasis'
import { compareIds } from './ids'
import { tabPath } from './issuePage'
import { stripMarkdown } from './markdown'

/** One thing a citizen can pick: a W group, or a story without a group. */
export interface PickItem {
  /** The group ID (for example "W08") or the story ID. */
  key: string
  /** The group summary, or the 我想要… text of the story. Can hold Markdown. */
  label: string
  /** The tag of the label: the group's tag, or the tag of the 我想要… cell. */
  tag: Tag
  /** True when the label is a 【待補…】 cell with no tag. Groups are never pending. */
  pending: boolean
  storyIds: string[]
  /** Plain text for search (design 4.1): the label and the 我想要… of every
   * story in the item, without Markdown, joined with new lines. */
  searchText: string
}

export interface OtherSide {
  conflict: Conflict
  /** The stories on the other side of the picked stories. When picked stories
   * are on both sides, the stories of both sides that are not picked. */
  otherStories: Story[]
}

export interface OpinionResult {
  /** 同樣想要的人: the picked stories, in the order of the issue file. */
  same: Story[]
  /** 可能有不同意見的人: conflicts with a picked story on one side, and at
   * least one story that is not picked. */
  otherSide: OtherSide[]
  /** 相關解法: solutions that list a picked story. */
  solutions: Solution[]
  /** 這個意見沒有直接提到的人: stakeholder IDs of the issue that are not
   * in same or otherSide, in ID order. */
  notMentioned: string[]
}

/** The pick list of an issue, in the order of the stories in the issue file.
 * A W group appears once, at the place of its first story. */
export function pickList(issue: IssueFile): PickItem[] {
  const groups = new Map(issue.groups.map((g) => [g.id, g]))
  const byId = new Map(issue.stories.map((s) => [s.id, s]))
  const seen = new Set<string>()
  const items: PickItem[] = []
  for (const s of issue.stories) {
    const g = s.group === null ? undefined : groups.get(s.group)
    if (!g) {
      const { text, tag, pending } = s.want
      items.push({ key: s.id, label: text, tag, pending, storyIds: [s.id], searchText: stripMarkdown(text) })
    } else if (!seen.has(g.id)) {
      seen.add(g.id)
      const wants = g.stories.flatMap((id) => byId.get(id)?.want.text ?? [])
      const searchText = [g.summary, ...wants].map(stripMarkdown).join('\n')
      items.push({ key: g.id, label: g.summary, tag: g.tag, pending: false, storyIds: [...g.stories], searchText })
    }
  }
  return items
}

/** Items whose searchText contains the query. The query is
 * trimmed. Latin letters match in any case. An empty query returns all. */
export function filterPickList(items: PickItem[], query: string): PickItem[] {
  const q = query.trim().toLowerCase()
  if (q === '') return items
  return items.filter((i) => i.searchText.toLowerCase().includes(q))
}

/** The result of the opinion check for the picked story IDs. Unknown IDs are
 * ignored. */
export function opinionResult(issue: IssueFile, storyIds: string[]): OpinionResult {
  const picked = new Set(storyIds)
  const byId = new Map(issue.stories.map((s) => [s.id, s]))
  const stories = (list: string[]) => list.flatMap((id) => byId.get(id) ?? [])

  const same = issue.stories.filter((s) => picked.has(s.id))

  const otherSide: OtherSide[] = []
  for (const c of issue.conflicts) {
    const onA = c.sideA.some((id) => picked.has(id))
    const onB = c.sideB.some((id) => picked.has(id))
    if (!onA && !onB) continue
    const other = [...(onA ? c.sideB : []), ...(onB ? c.sideA : [])].filter((id) => !picked.has(id))
    // When every story of the conflict was picked, nobody is on the other
    // side, so the conflict is left out.
    if (other.length === 0) continue
    otherSide.push({ conflict: c, otherStories: stories(other) })
  }

  const solutions = issue.solutions.filter((sol) => sol.stories.some((id) => picked.has(id)))

  const mentioned = new Set([
    ...same.map((s) => s.stakeholder),
    ...otherSide.flatMap((o) => o.otherStories.map((s) => s.stakeholder)),
  ])
  const notMentioned = issue.stakeholders
    .map((s) => s.id)
    .filter((id) => !mentioned.has(id))
    .sort(compareIds)

  return { same, otherSide, solutions, notMentioned }
}

/** The link to the opinion check of the issue with this item picked, for
 * example #/issues/2/wants?pick=W08. Keeps ?evidence=1 when the filter is on. */
export function opinionPickTo(issueNumber: number, key: string, dataBasedOnly: boolean): { pathname: string; search: string } {
  const params = withDataBasisFilter(new URLSearchParams({ pick: key }), dataBasedOnly)
  return { pathname: tabPath(issueNumber, 'wants'), search: `?${params.toString()}` }
}
