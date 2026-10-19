import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n/zh-TW'
import type { StakeholderIssueStories } from '@/lib/stakeholders'
import type { Stakeholder } from '@/types'
import { PriorityCounts } from './PriorityCounts'
import { linkClass } from './styles'

const tc = t.stakeholderCard

interface CommonProps {
  stakeholder: Stakeholder
  /** Extra content for one page, shown at the end of the card. For example
   * the issues and 加入日期 on the home page, or 「也出現在 #1」. */
  children?: ReactNode
}

/** The props of StakeholderCard. Each variant has its own props.
 * - detailed: the stakeholder lists with story counts (#/stakeholders and
 *   the issue's 利害關係人 tab). entries are the stories of the stakeholder
 *   per issue, from storyCountsByStakeholder.
 * - compact: short lists (home page, solution page, space page, opinion
 *   check). */
export type StakeholderCardProps =
  | (CommonProps & { variant: 'detailed'; entries: StakeholderIssueStories[] })
  | (CommonProps & { variant: 'compact' })

/** One stakeholder in a list (design 3.9). Both variants show the name as a
 * link to the stakeholder page, the ID and the 特別關注 badges. The detailed
 * variant also shows the story counts by priority for each issue. children
 * come last. The detailed box is larger, like IssueCard and SolutionCard. */
export function StakeholderCard(props: StakeholderCardProps) {
  const { stakeholder: s, children } = props
  const detailed = props.variant === 'detailed'
  return (
    <article className={detailed ? 'h-full rounded-lg border p-3 md:p-4' : 'h-full rounded-md border p-3'}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link to={`/stakeholders/${s.id}`} className={`${linkClass} font-medium`}>{s.name}</Link>
        <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
        {s.focus.length > 0 && (
          <span className="inline-flex flex-wrap gap-1">
            <span className="sr-only">{tc.focusLabel}</span>
            {s.focus.map((f) => (
              <Badge key={f} variant="secondary" className="rounded-sm">{f}</Badge>
            ))}
          </span>
        )}
      </p>
      {detailed && props.entries.length > 0 && (
        <ul className="mt-1 space-y-1 text-sm">
          {props.entries.map((e) => (
            <li key={e.issueNumber} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{tc.issueEntry(e.issueNumber)}</span>
              <PriorityCounts counts={e.counts} />
            </li>
          ))}
        </ul>
      )}
      {children}
    </article>
  )
}
