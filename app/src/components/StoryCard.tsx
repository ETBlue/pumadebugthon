import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/zh-TW'
import { priorityLabel } from '@/lib/priority'
import type { Story } from '@/types'
import { CellText } from './CellText'
import { Markdown } from './Markdown'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

export interface StoryCardProps {
  story: Story
  stakeholderName: string
  /** Less padding, for long lists of stories. The 來源 row stays, so a [實證] story keeps its source. */
  compact?: boolean
  /** Shown after the stakeholder name, for example the 「也出現在 #1」 mark. */
  stakeholderNote?: ReactNode
}

/** One user story: ID, stakeholder, 我想要, 以便, source and priority with its tag. */
export function StoryCard({ story, stakeholderName, compact = false, stakeholderNote }: StoryCardProps) {
  const row = 'flex flex-col gap-0.5 md:flex-row md:gap-3'
  const label = 'shrink-0 text-muted-foreground md:w-20'
  return (
    <article className={cn('rounded-md border text-sm', compact ? 'p-3' : 'p-4')}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono font-semibold">{story.id}</span>
        <Link to={`/stakeholders/${story.stakeholder}`} className={linkClass}>
          {stakeholderName}
        </Link>
        {stakeholderNote}
      </p>
      <dl className={cn('mt-2', compact ? 'space-y-1' : 'space-y-2')}>
        <div className={row}>
          <dt className={label}>{t.story.want}</dt>
          <dd><CellText cell={story.want} /></dd>
        </div>
        <div className={row}>
          <dt className={label}>{t.story.soThat}</dt>
          <dd><CellText cell={story.soThat} /></dd>
        </div>
        {story.source !== null && (
          <div className={row}>
            <dt className={label}>{t.story.source}</dt>
            <dd><Markdown text={story.source} /></dd>
          </div>
        )}
        <div className={row}>
          <dt className={label}>{t.story.priority}</dt>
          <dd>
            <TagBadge kind={story.priorityTag} className="mr-1.5" />
            {priorityLabel(story.priority)}
          </dd>
        </div>
      </dl>
    </article>
  )
}
