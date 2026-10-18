import { StoryCard } from '@/components/StoryCard'
import { evidenceOnly as onlyEvidence } from '@/lib/evidence'
import { stakeholderName } from '@/lib/stakeholders'
import type { Stakeholder, Story } from '@/types'
import { EvidenceEmpty } from './EvidenceToggle'

/** A list of compact story cards. evidenceOnly: show only the stories with
 * the 實證 tag; when none is left, show a short text instead. */
export function StoryList({ stories, stakeholders, evidenceOnly = false }: {
  stories: Story[]
  stakeholders: Stakeholder[]
  evidenceOnly?: boolean
}) {
  const shown = evidenceOnly ? onlyEvidence(stories) : stories
  if (evidenceOnly && shown.length === 0 && stories.length > 0) return <EvidenceEmpty />
  return (
    <ul className="mt-2 space-y-2">
      {shown.map((s) => (
        <li key={s.id}>
          <StoryCard story={s} stakeholderName={stakeholderName(stakeholders, s.stakeholder)} compact />
        </li>
      ))}
    </ul>
  )
}
