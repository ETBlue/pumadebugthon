// The story page (design 3.15).
import type { Group, IssueFile, Need, NeedGroup, Solution, Story } from '@/types'
import { compareIds } from './ids'
import { needKey as needKeyOf } from './needs'
import { conflictView, wantKey, type ConflictView } from './wantList'

/** The result of findStory. */
export type FindStoryResult =
  | { kind: 'found'; story: Story }
  /** The story belongs to another stakeholder. The page redirects there. */
  | { kind: 'redirect'; stakeholderId: string }
  | { kind: 'notFound' }

/** Find the story of the URL. issue is null for an unknown issue or an issue
 * with no analysis. */
export function findStory(issue: IssueFile | null, stakeholderId: string, storyId: string): FindStoryResult {
  const story = issue?.stories.find((s) => s.id === storyId)
  if (!story) return { kind: 'notFound' }
  if (story.stakeholder !== stakeholderId) return { kind: 'redirect', stakeholderId: story.stakeholder }
  return { kind: 'found', story }
}

/** A W group or an N group of the story, with the other stakeholders. */
export interface StoryGroup<G> {
  group: G
  /** The stakeholders of the group's other stories, in ID order, each once.
   * The story's own stakeholder is left out. */
  others: string[]
}

/** A conflict with the story on a side. */
export interface StoryConflict {
  view: ConflictView
  /** The stories of the other side. When the story is on both sides: the
   * stories of both sides, without the story itself. */
  otherStories: Story[]
}

/** Everything the story page shows (design 3.15). */
export interface StoryView {
  story: Story
  /** The W group ID, or the story ID (design 3.16). */
  wantKey: string
  /** The N group ID, or the story ID (design 3.16). */
  needKey: string
  /** null when the story is in no W group. */
  wantGroup: StoryGroup<Group> | null
  /** null when the story is in no N group. */
  needGroup: StoryGroup<NeedGroup> | null
  /** Its row of 5.2. null in the old format. */
  need: Need | null
  /** In file order. */
  conflicts: StoryConflict[]
  /** The solutions that cover its need, in file order. */
  solutions: Solution[]
}

/** The story page content for a story of the issue. */
export function storyView(issue: IssueFile, story: Story): StoryView {
  const byId = new Map(issue.stories.map((s) => [s.id, s]))
  const stakeholderOf = (id: string) => byId.get(id)?.stakeholder ?? id.split('-')[0]
  const groupOf = <G extends { stories: string[] }>(group: G | undefined): StoryGroup<G> | null =>
    group
      ? {
          group,
          others: [...new Set(group.stories.map(stakeholderOf))].filter((x) => x !== story.stakeholder).sort(compareIds),
        }
      : null

  const wantGroup = groupOf(issue.groups.find((g) => g.id === story.group))
  const needGroup = groupOf(issue.needGroups.find((g) => g.id === story.needGroup))
  const needKey = needKeyOf(story)

  const conflicts: StoryConflict[] = []
  for (const conflict of issue.conflicts) {
    const onA = conflict.sideA.includes(story.id)
    const onB = conflict.sideB.includes(story.id)
    if (!onA && !onB) continue
    const other = [...(onB ? conflict.sideA : []), ...(onA ? conflict.sideB : [])].filter((id) => id !== story.id)
    conflicts.push({ view: conflictView(issue, conflict), otherStories: other.flatMap((id) => byId.get(id) ?? []) })
  }

  return {
    story,
    wantKey: wantKey(issue, story),
    needKey,
    wantGroup,
    needGroup,
    need: issue.needs.find((n) => n.id === needKey) ?? null,
    conflicts,
    // Solution.stories holds the stories whose need the solution covers.
    solutions: issue.solutions.filter((sol) => sol.stories.includes(story.id)),
  }
}
