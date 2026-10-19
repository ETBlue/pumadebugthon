// Needs (需求) for the 需求 tabs (design 3.2, 3.3, 3.16).
// A need is a row of step 5.2 (`needs` in the issue JSON): an N group, or one
// story in no N group. There is no need page (design decision 45), so there is
// no findNeed or needView here.
// Order is always the file order, the fixed priority order or ID order.
// Nothing here sorts by a count.
import type { Cell, Conflict, IssueFile, Need, Priority, Solution, Story } from '@/types'
import { DATA_BASED_TAGS, dataBasedOnly } from './dataBasis'
import { compareIds } from './ids'
import { PRIORITIES } from './priority'

/** The need key of a story: its N group, or its own ID when it is in no
 * N group. It is the same ID as the row of step 5.2. */
export function needKey(story: Story): string {
  return story.needGroup ?? story.id
}

export interface NeedSolution {
  solution: Solution
  /** The part of step 6.2 that lists the need: 涵蓋的 Must or 涵蓋的 Should / Could. */
  part: 'must' | 'shouldCould'
}

export interface NeedItem {
  need: Need
  /** For an N group: the group's summary and tag. For a need with no group:
   * the 以便… cell of its story. */
  summary: Cell
  /** The stories of the need, in the order of the 5.2 row. */
  stories: Story[]
  /** The stakeholders of its stories, in ID order, each once. */
  stakeholders: string[]
  /** The solutions that list the need in needs.must or needs.shouldCould,
   * in letter order. */
  solutions: NeedSolution[]
  /** The conflicts that list the need in needsA or needsB, in file order. */
  conflicts: Conflict[]
}

/** The summary of a need with its tag: for an N group, the group's summary
 * and tag; for a need with no group, the 以便… cell of its story. */
export function needSummaryOf(issue: IssueFile, need: Need): Cell {
  const stories = need.stories.flatMap((id) => issue.stories.find((s) => s.id === id) ?? [])
  return needSummary(issue, need, stories)
}

function needSummary(issue: IssueFile, need: Need, stories: Story[]): Cell {
  if (need.kind === 'group') {
    const group = issue.needGroups.find((g) => g.id === need.id)
    if (group) return { text: group.summary, tag: group.tag, pending: false }
  }
  // A need with no group has one story. Use its 以便… cell. When the story
  // is missing, fall back to the 5.2 summary with no tag.
  return stories[0]?.soThat ?? { text: need.summary, tag: null, pending: false }
}

function needSolutions(issue: IssueFile, id: string): NeedSolution[] {
  const out: NeedSolution[] = []
  for (const solution of issue.solutions) {
    if (!solution.needs) continue
    if (solution.needs.must.includes(id)) out.push({ solution, part: 'must' })
    else if (solution.needs.shouldCould.includes(id)) out.push({ solution, part: 'shouldCould' })
  }
  return out.sort((a, b) => compareIds(a.solution.id, b.solution.id))
}

function needItem(issue: IssueFile, need: Need): NeedItem {
  const stories = need.stories
    .map((id) => issue.stories.find((s) => s.id === id))
    .filter((s): s is Story => s !== undefined)
  const stakeholders = [...new Set(stories.map((s) => s.stakeholder))].sort(compareIds)
  return {
    need,
    summary: needSummary(issue, need, stories),
    stories,
    stakeholders,
    solutions: needSolutions(issue, need.id),
    conflicts: issue.conflicts.filter((c) => c.needsA.includes(need.id) || c.needsB.includes(need.id)),
  }
}

/** One item per row of step 5.2, in file order. Empty in the old format. */
export function issueNeeds(issue: IssueFile): NeedItem[] {
  return issue.needs.map((need) => needItem(issue, need))
}

export interface NeedPriorityGroup {
  priority: Priority
  items: NeedItem[]
}

/** The items grouped by priority, in the fixed order M, S, C, W. Inside a
 * group, the order of the list it gets. Empty groups are left out. */
export function needsByPriority(items: NeedItem[]): NeedPriorityGroup[] {
  return PRIORITIES.map((priority) => ({ priority, items: items.filter((i) => i.need.priority === priority) })).filter(
    (g) => g.items.length > 0,
  )
}

export interface StakeholderNeedItem extends NeedItem {
  /** The stories of this need that belong to the stakeholder. */
  ownStories: Story[]
}

/** The needs with a story of the stakeholder, each once, in the order of
 * step 5.2. Several stories with the same need key are one need. */
export function needsOfStakeholder(issue: IssueFile, id: string): StakeholderNeedItem[] {
  const out: StakeholderNeedItem[] = []
  for (const item of issueNeeds(issue)) {
    const ownStories = item.stories.filter((s) => s.stakeholder === id)
    if (ownStories.length > 0) out.push({ ...item, ownStories })
  }
  return out
}

/** The 「只看有資料根據」 filter on the 需求 tab: keep a need when at least one
 * of its stories has a [實證] or [AI整理] 以便… cell. The 我想要… cell is not
 * checked. Keeps the order of the list. */
export function dataBasedNeeds<T extends NeedItem>(items: T[]): T[] {
  return items.filter((i) => i.stories.some((s) => DATA_BASED_TAGS.includes(s.soThat.tag)))
}

/** The stories in the story list of one need (NeedItem). With the
 * 「只看有資料根據」 filter on, only the stories with a [實證] or [AI整理]
 * cell (hasDataBasis), as in every other story list. A need that
 * dataBasedNeeds keeps always has at least one story left. */
export function shownNeedStories(item: NeedItem, dataBased: boolean): Story[] {
  return dataBased ? dataBasedOnly(item.stories) : item.stories
}

/** The stakeholder filter (design 3.14): with null, every item. With an ID,
 * the items with a story of that stakeholder. Keeps the order of the list. */
export function needsForStakeholder<T extends NeedItem>(items: T[], id: string | null): T[] {
  if (id === null) return items
  return items.filter((i) => i.stakeholders.includes(id))
}
