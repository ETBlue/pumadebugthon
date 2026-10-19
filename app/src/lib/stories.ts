// Small lookups on the stories of one issue.
import type { IssueFile } from '@/types'

/** The stakeholder of a story ID in the issue: the story's own `stakeholder`
 * field. For an ID that is not in the issue's stories, the part of the ID
 * before 「-」 ("I06-US01" -> "I06"). Every list that needs the stakeholder
 * of a story ID uses this one rule. Build it once per issue and call it per ID. */
export function storyStakeholderOf(issue: Pick<IssueFile, 'stories'>): (storyId: string) => string {
  const byId = new Map(issue.stories.map((s) => [s.id, s.stakeholder]))
  return (storyId) => byId.get(storyId) ?? storyId.split('-')[0]
}
