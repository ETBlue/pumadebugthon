import { Link } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { storyPath } from '@/lib/entityPaths'
import { storyPriority } from '@/lib/needs'
import { priorityLabel } from '@/lib/priority'
import { cn } from '@/lib/utils'
import type { IssueFile, Story } from '@/types'
import { CellText } from './CellText'
import { targetLinkClass } from './styles'
import { TagBadge } from './TagBadge'

const tl = t.storyLine

/** The stories of one stakeholder in one issue as a short list (the cards of
 * the issue's 利害關係人 tab, decision 116). Each story is 「我想要 …，以便 …」
 * with the tag of each cell (CellText), then a small line with the story ID
 * (a link to the story page, 3.15) and the priority with its tag
 * (storyPriority, as on StoryCard). The stories keep the order they come in
 * (the file order of the issue). The caller filters them (只看有資料根據). */
export function StoryLines({ stories, issue, label, className }: {
  stories: Story[]
  /** The issue of the stories, for the story page links and the priority. */
  issue: Pick<IssueFile, 'number' | 'needs'>
  /** The accessible name of the list. */
  label: string
  className?: string
}) {
  if (stories.length === 0) return null
  return (
    <ul aria-label={label} className={cn('space-y-2 text-sm', className)}>
      {stories.map((story) => {
        const priority = storyPriority(issue, story)
        return (
          <li key={story.id} className="min-w-0 border-l-2 pl-3">
            <p className="break-words">
              {tl.want} <CellText cell={story.want} />{tl.soThat} <CellText cell={story.soThat} />
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Link to={storyPath(issue.number, story.id)} className={cn(targetLinkClass, 'font-mono')}>{story.id}</Link>
              <span>
                {tl.priority}
                <TagBadge kind={priority.tag} className="mr-1" />
                {priorityLabel(priority.priority)}
              </span>
            </p>
          </li>
        )
      })}
    </ul>
  )
}
