// Lookups for the stakeholder page (design 3.3).
// Order is always the order of the issue file, or ID order. Nothing here sorts by a count.
import type { Cell, Conflict, Group, InputSource, IssueFile, Solution, Stakeholder, Story } from '@/types'
import { compareIds } from './ids'
import { priorityCounts, type TagPriorityCounts } from './priority'
import { resolveId, storiesWithoutSolution } from './stakeholders'

export interface PathStep {
  /** The prefix, for example "gov-local". */
  path: string
  /** Its name from pathLabels, or the last code when there is no name. */
  label: string
}

/** The 分類路徑 as names, one per prefix, for example 政府 › 地方政府 ›
 * 臺北市 › 環保局. Empty for no path. */
export function pathTrail(path: string | null, pathLabels: Record<string, string>): PathStep[] {
  if (!path) return []
  const codes = path.split('-')
  return codes.map((code, i) => {
    const prefix = codes.slice(0, i + 1).join('-')
    return { path: prefix, label: pathLabels[prefix] ?? code }
  })
}

/** The old ID for the note 「O02 已改為 I12」: from, when from is a moved ID
 * that leads to id. Else null, so a wrong ?from= value shows no note. */
export function movedFrom(stakeholders: Stakeholder[], from: string | null, id: string): string | null {
  if (from === null || from === id) return null
  return resolveId(stakeholders, from) === id ? from : null
}

/** The issues of the stakeholder that are available, by number. */
export function stakeholderIssueNumbers(stakeholder: Stakeholder, available: number[]): number[] {
  return stakeholder.issues.filter((n) => available.includes(n)).sort((a, b) => a - b)
}

export interface StakeholderGroup {
  group: Group
  /** The other stakeholders of the group, in ID order, each once. */
  others: string[]
}

export interface StakeholderConflict {
  conflict: Conflict
  /** The stories of the side without this stakeholder's stories. When its
   * stories are on both sides: the stories of both sides that are not its own. */
  otherStories: Story[]
}

export interface StakeholderIssueView {
  /** 與本題的關係. null when the stakeholder is not in step 1. */
  relation: Cell | null
  stories: Story[]
  counts: TagPriorityCounts[]
  groups: StakeholderGroup[]
  conflicts: StakeholderConflict[]
  /** Solutions that list one of its stories, in file order. */
  solutions: Solution[]
  /** Its stories that no solution lists. */
  uncovered: Story[]
  /** Rows of 1.2 that name the stakeholder. */
  inputSources: InputSource[]
}

/** Everything the stakeholder page shows for one issue (design 3.3). */
export function stakeholderIssueView(issue: IssueFile, id: string): StakeholderIssueView {
  const byId = new Map(issue.stories.map((s) => [s.id, s]))
  const stakeholderOf = (storyId: string) => byId.get(storyId)?.stakeholder ?? storyId.split('-')[0]
  const stories = issue.stories.filter((s) => s.stakeholder === id)
  const own = new Set(stories.map((s) => s.id))

  const groups = issue.groups
    .filter((g) => g.stories.some((s) => own.has(s)))
    .map((group) => ({
      group,
      others: [...new Set(group.stories.map(stakeholderOf))].filter((x) => x !== id).sort(compareIds),
    }))

  const conflicts: StakeholderConflict[] = []
  for (const conflict of issue.conflicts) {
    const onA = conflict.sideA.some((s) => own.has(s))
    const onB = conflict.sideB.some((s) => own.has(s))
    if (!onA && !onB) continue
    // Side A first, then side B, so the order matches the conflicts tab.
    const other = [...(onB ? conflict.sideA : []), ...(onA ? conflict.sideB : [])].filter((s) => !own.has(s))
    if (other.length === 0) continue
    conflicts.push({ conflict, otherStories: other.flatMap((s) => byId.get(s) ?? []) })
  }

  return {
    relation: issue.stakeholders.find((s) => s.id === id)?.relation ?? null,
    stories,
    counts: priorityCounts(stories),
    groups,
    conflicts,
    solutions: issue.solutions.filter((sol) => sol.stories.some((s) => own.has(s))),
    uncovered: storiesWithoutSolution(issue, id),
    inputSources: issue.inputSources.filter((src) => src.stakeholders.includes(id)),
  }
}
