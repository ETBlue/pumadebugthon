import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { cn } from '@/lib/utils'
import { t } from '@/i18n/zh-TW'
import { isDataBasisFilterOn } from '@/lib/dataBasis'
import { needFocusPath, storyPath, wantFocusPath } from '@/lib/entityPaths'
import { priorityLabel } from '@/lib/priority'
import type { Story } from '@/types'
import { CellText } from './CellText'
import { Markdown } from './Markdown'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

export interface StoryCardProps {
  story: Story
  /** The issue of the story. The story ID links to its story page (design 3.15). */
  issueNumber: number
  stakeholderName: string
  /** Less padding, for long lists of stories. The 來源 row stays, so a [實證] story keeps its source. */
  compact?: boolean
  /** Shown after the stakeholder name, for example the 「也出現在 #1」 mark. */
  stakeholderNote?: ReactNode
  /** The want key of the story (wantKey). When given, the card links to the
   * want on the issue's 訴求 tab (?focus=, decision 57). */
  wantKey?: string
  /** The need key of the story (needKey). When given, the card links to the
   * need on the issue's 需求 tab (?focus=, decision 57). */
  needKey?: string
}

/** One user story: ID, stakeholder, 我想要, 以便, source and priority with its tag.
 * The story ID links to the story page. The story page has no data filter,
 * so that link drops ?evidence=1. The 訴求 and 需求 links go to issue tabs,
 * so they keep it. */
export function StoryCard({
  story, issueNumber, stakeholderName, compact = false, stakeholderNote, wantKey, needKey,
}: StoryCardProps) {
  const [params] = useSearchParams()
  const dataBasedOnly = isDataBasisFilterOn(params)
  const row = 'flex flex-col gap-0.5 md:flex-row md:gap-3'
  const label = 'shrink-0 text-muted-foreground md:w-20'
  return (
    <article className={cn('rounded-md border text-sm', compact ? 'p-3' : 'p-4')}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <Link to={storyPath(issueNumber, story.id)} className={cn(linkClass, 'font-mono font-semibold')}>
          {story.id}
        </Link>
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
            {/* A long URL in the source can break anywhere, so a narrow column never scrolls sideways. */}
            <dd className="min-w-0 wrap-anywhere"><Markdown text={story.source} /></dd>
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
      {(wantKey !== undefined || needKey !== undefined) && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {wantKey !== undefined && (
            <Link to={wantFocusPath(issueNumber, wantKey, dataBasedOnly)} className={linkClass}>
              {t.story.wantLink(wantKey)}
            </Link>
          )}
          {needKey !== undefined && (
            <Link to={needFocusPath(issueNumber, needKey, dataBasedOnly)} className={linkClass}>
              {t.story.needLink(needKey)}
            </Link>
          )}
        </p>
      )}
    </article>
  )
}
