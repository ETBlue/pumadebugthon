// Wants (訴求) and conflicts on the 訴求 tab (design 3.2, 3.16).
// There is no want page (design decision 45), so there is no findWant or wantView.
import type { Cell, Conflict, IssueFile, Need, Solution, Story } from '@/types'
import { compareIds } from './ids'
import { pickList, type PickItem } from './opinion'

/** One want: an opinion check pick item, with the links the 訴求 tab shows. */
export interface WantItem extends PickItem {
  /** The stakeholders of its stories, in ID order, each once. */
  stakeholders: string[]
  /** The conflicts with a story of the item on a side, in file order. The
   * same type as NeedItem.conflicts. */
  conflicts: Conflict[]
  /** The solutions that cover the need of one of its stories, in file order. */
  solutions: Solution[]
}

/** The stakeholder of a story ID: the part before 「-」. */
function stakeholderOfStory(storyId: string): string {
  return storyId.split('-')[0]
}

/** The want key of a story: its W group (for example "W08"), or the story ID
 * when it has no group. The same key as storyPickKey in opinion.ts (design 3.16). */
export function wantKey(story: Story): string {
  return story.group ?? story.id
}

/** The wants of an issue, in the order of pickList. */
export function issueWants(issue: IssueFile): WantItem[] {
  return pickList(issue).map((item) => {
    const own = new Set(item.storyIds)
    const stakeholders = [...new Set(item.storyIds.map(stakeholderOfStory))].sort(compareIds)
    const conflicts = issue.conflicts.filter(
      (c) => c.sideA.some((id) => own.has(id)) || c.sideB.some((id) => own.has(id)),
    )
    // Solution.stories holds the stories whose need the solution covers.
    const solutions = issue.solutions.filter((sol) => sol.stories.some((id) => own.has(id)))
    return { ...item, stakeholders, conflicts, solutions }
  })
}

/** The wants with a story of the stakeholder. null keeps every item. */
export function wantsForStakeholder(items: WantItem[], id: string | null): WantItem[] {
  if (id === null) return items
  return items.filter((i) => i.stakeholders.includes(id))
}

/** The wants of one stakeholder in an issue, in the order of pickList. */
export function wantsOfStakeholder(issue: IssueFile, id: string): WantItem[] {
  return wantsForStakeholder(issueWants(issue), id)
}

/** The conflicts with a story of the stakeholder on either side, in file
 * order. null keeps every conflict. */
export function conflictsForStakeholder(conflicts: Conflict[], id: string | null): Conflict[] {
  if (id === null) return conflicts
  const has = (side: string[]) => side.some((s) => stakeholderOfStory(s) === id)
  return conflicts.filter((c) => has(c.sideA) || has(c.sideB))
}

/** What the 訴求 tab shows for one conflict (design 3.2). */
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
