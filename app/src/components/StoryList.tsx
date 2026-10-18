import { StoryCard } from '@/components/StoryCard'
import { stakeholderName } from '@/lib/stakeholders'
import type { Stakeholder, Story } from '@/types'

/** A list of compact story cards. */
export function StoryList({ stories, stakeholders }: { stories: Story[]; stakeholders: Stakeholder[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {stories.map((s) => (
        <li key={s.id}>
          <StoryCard story={s} stakeholderName={stakeholderName(stakeholders, s.stakeholder)} compact />
        </li>
      ))}
    </ul>
  )
}
