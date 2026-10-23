// Wants (訴求) and conflicts on the 訴求 and 衝突 tabs (design 3.2, 3.16).
// There is no want page (design decision 45), so there is no findWant or wantView.
import type { Cell, Conflict, IssueFile, Need, Solution, Story } from '@/types'
import { compareIds } from './ids'
import { solutionsOfStories } from './needs'
import { pickList, type PickItem } from './opinion'
import { storyStakeholderOf } from './stories'

/** One want: an opinion check pick item, with the links the 訴求 tab shows. */
export interface WantItem extends PickItem {
  /** The stakeholders of its stories, in ID order, each once. */
  stakeholders: string[]
  /** The conflicts with a story of the item on a side, in file order. The
   * same type as NeedItem.conflicts. */
  conflicts: Conflict[]
  /** The solutions that cover the need of one of its stories, in ID order
   * (solutionsOfStories). */
  solutions: Solution[]
}

/** The want key of a story (design 3.16): its W group (for example "W08"),
 * or the story ID when it has no group in the group table. These are the
 * same keys as the opinion check pick list (pickList, design 4.1). */
export function wantKey(issue: IssueFile, story: Story): string {
  return story.group !== null && issue.groups.some((g) => g.id === story.group) ? story.group : story.id
}

/** The wants of an issue, in the order of pickList. */
export function issueWants(issue: IssueFile): WantItem[] {
  const stakeholderOf = storyStakeholderOf(issue)
  return pickList(issue).map((item) => {
    const own = new Set(item.storyIds)
    const stakeholders = [...new Set(item.storyIds.map(stakeholderOf))].sort(compareIds)
    const conflicts = issue.conflicts.filter(
      (c) => c.sideA.some((id) => own.has(id)) || c.sideB.some((id) => own.has(id)),
    )
    const solutions = solutionsOfStories(issue, item.storyIds)
    return { ...item, stakeholders, conflicts, solutions }
  })
}

/** The wants with a story of the stakeholder. null keeps every item. */
export function wantsForStakeholder(items: WantItem[], id: string | null): WantItem[] {
  if (id === null) return items
  return items.filter((i) => i.stakeholders.includes(id))
}

/** The 特別關注 filter (decision 75): the wants with a story of one of these
 * stakeholders. null keeps every item. */
export function wantsForStakeholderSet(items: WantItem[], ids: ReadonlySet<string> | null): WantItem[] {
  if (ids === null) return items
  return items.filter((i) => i.stakeholders.some((id) => ids.has(id)))
}

/** The wants of one stakeholder in an issue, in the order of pickList. */
export function wantsOfStakeholder(issue: IssueFile, id: string): WantItem[] {
  return wantsForStakeholder(issueWants(issue), id)
}

/** The conflicts with a story of the stakeholder on either side, in file
 * order. null keeps every conflict. */
export function conflictsForStakeholder(issue: IssueFile, id: string | null): Conflict[] {
  if (id === null) return issue.conflicts
  const stakeholderOf = storyStakeholderOf(issue)
  const has = (side: string[]) => side.some((s) => stakeholderOf(s) === id)
  return issue.conflicts.filter((c) => has(c.sideA) || has(c.sideB))
}

/** The 特別關注 filter (decision 75): the conflicts with a story of one of
 * these stakeholders on either side, in file order. null keeps every one. */
export function conflictsForStakeholderSet(issue: IssueFile, ids: ReadonlySet<string> | null): Conflict[] {
  if (ids === null) return issue.conflicts
  const stakeholderOf = storyStakeholderOf(issue)
  const has = (side: string[]) => side.some((s) => ids.has(stakeholderOf(s)))
  return issue.conflicts.filter((c) => has(c.sideA) || has(c.sideB))
}

/** What the 衝突 tab shows for one conflict (design 3.2). */
export interface ConflictView {
  conflict: Conflict
  /** The stories of each side, in the order of the conflict row. */
  storiesA: Story[]
  storiesB: Story[]
  /** 雙方的需求: the rows of issue.needs, in the order of the conflict row. */
  needsA: Need[]
  needsB: Need[]
  /** 以需求為本的解方. null in the old format. */
  wayOut: Cell | null
  /** The solutions of the way out, in the order of the cell. */
  wayOutSolutions: Solution[]
  /** True when the way out names at least one solution. False for 「未找到…」. */
  hasWayOut: boolean
}

/** The stories, needs and way out of a conflict. Unknown IDs are left out. */
export function conflictView(issue: IssueFile, conflict: Conflict): ConflictView {
  const stories = new Map(issue.stories.map((s) => [s.id, s]))
  const needs = new Map(issue.needs.map((n) => [n.id, n]))
  const solutions = new Map(issue.solutions.map((s) => [s.id, s]))
  const pick = <T>(map: Map<string, T>, list: string[]) => list.flatMap((id) => map.get(id) ?? [])
  const wayOutSolutions = pick(solutions, conflict.wayOutSolutions)
  return {
    conflict,
    storiesA: pick(stories, conflict.sideA),
    storiesB: pick(stories, conflict.sideB),
    needsA: pick(needs, conflict.needsA),
    needsB: pick(needs, conflict.needsB),
    wayOut: conflict.wayOut,
    wayOutSolutions,
    hasWayOut: wayOutSolutions.length > 0,
  }
}
