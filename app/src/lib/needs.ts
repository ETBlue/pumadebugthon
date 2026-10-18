// The 需求 list page #/needs (design 3.9). A 需求 is the 以便… cell of one
// story. 以便… cells have no groups, so each story is one item.
// Order: issue number, then the story order of the issue file. Never by a count.
import type { IssueFile, Story } from '@/types'
import { hasSoThat } from './counts'
import { DATA_BASED_TAGS } from './dataBasis'
import { stripMarkdown } from './markdown'

export interface NeedGroup {
  issueNumber: number
  title: string
  /** The stories with a 以便… cell, in the order of the issue file. */
  stories: Story[]
}

export interface NeedFilter {
  /** Search text. It is trimmed. Latin letters match in any case. It matches
   * the 以便… text without Markdown. */
  query: string
  /** 「只看有資料根據」: keep stories whose 以便… cell is [實證] or [AI整理].
   * The list shows only that cell, so only its tag counts. */
  dataBasedOnly: boolean
}

/** The 需求 of the given issue files, grouped by issue. Issues with no
 * matching story are left out. */
export function needGroups(issues: IssueFile[], filter: NeedFilter): NeedGroup[] {
  const q = filter.query.trim().toLowerCase()
  return [...issues]
    .sort((a, b) => a.number - b.number)
    .map((issue) => ({
      issueNumber: issue.number,
      title: issue.title,
      stories: issue.stories.filter(
        (s) =>
          hasSoThat(s) &&
          (!filter.dataBasedOnly || DATA_BASED_TAGS.includes(s.soThat.tag)) &&
          (q === '' || stripMarkdown(s.soThat.text).toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.stories.length > 0)
}

/** The opinion check pick key of the story: its W group (for example "W08"),
 * or the story ID when it has no group in the group table. The same keys as
 * pickList in opinion.ts. */
export function needPickKey(issue: IssueFile, story: Story): string {
  return story.group !== null && issue.groups.some((g) => g.id === story.group) ? story.group : story.id
}
