import { StoryCard } from '@/components/StoryCard'
import { dataBasedOnly as onlyDataBased } from '@/lib/dataBasis'
import { stakeholderName } from '@/lib/stakeholders'
import type { IssueFile, Stakeholder, Story } from '@/types'
import { DataBasisEmpty } from './DataBasisToggle'

/** A list of compact story cards. dataBasedOnly: show only the stories with
 * the 實證 or AI整理 tag; when none is left, show a short text instead. */
export function StoryList({ stories, issue, stakeholders, dataBasedOnly = false }: {
  stories: Story[]
  /** The issue of the stories, for the story page links and the priority. */
  issue: Pick<IssueFile, 'number' | 'needs'>
  stakeholders: Stakeholder[]
  dataBasedOnly?: boolean
}) {
  const shown = dataBasedOnly ? onlyDataBased(stories) : stories
  if (dataBasedOnly && shown.length === 0 && stories.length > 0) return <DataBasisEmpty />
  return (
    <ul className="mt-2 space-y-2">
      {shown.map((s) => (
        <li key={s.id}>
          <StoryCard story={s} issue={issue} stakeholderName={stakeholderName(stakeholders, s.stakeholder)} compact />
        </li>
      ))}
    </ul>
  )
}
