import { Link } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { priorityLabel } from '@/lib/priority'
import type { Story } from '@/types'
import { CellText } from './CellText'
import { Markdown } from './Markdown'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

/** One user story: ID, stakeholder, 我想要, 以便, source and priority with its tag. */
export function StoryCard({ story, stakeholderName }: { story: Story; stakeholderName: string }) {
  const row = 'flex flex-col gap-0.5 md:flex-row md:gap-3'
  const label = 'shrink-0 text-muted-foreground md:w-20'
  return (
    <article className="rounded-md border p-4 text-sm">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono font-semibold">{story.id}</span>
        <Link to={`/stakeholders/${story.stakeholder}`} className={linkClass}>
          {stakeholderName}
        </Link>
      </p>
      <dl className="mt-2 space-y-2">
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
