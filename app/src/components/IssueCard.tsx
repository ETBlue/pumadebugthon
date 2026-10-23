import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n/zh-TW'
import { CellBasis } from './CellBasis'
import { Field } from './Field'
import { sharePercent, type Share } from '@/lib/coverage'
import { focusGapsText } from '@/lib/focusGroups'
import { isParticipantIssue, type SharedForCard } from '@/lib/issues'
import { CROSS_STAKEHOLDERS_PATH } from '@/lib/listParams'
import type { IssueSummary, SpaceType } from '@/types'
import { SpaceLinks } from './SpaceLinks'
import { linkClass } from './styles'

const tc = t.issueCard
const ti = t.issuesPage

/** The props of IssueCard. Each variant has its own props.
 * - detailed: the issue list (#/issues). shared is null when fewer than 2
 *   issues are available; then the 跨議題 field is left out.
 * - compact: short lists, for example the home page and the space page.
 *   shared works as in detailed. */
export type IssueCardProps =
  | {
      variant: 'detailed'
      issue: IssueSummary
      spaceTypes: SpaceType[]
      shared: SharedForCard | null
      headingLevel?: 2 | 3
      /** The 資料根據比例 share, shown as a percent next to the counts. Only
       * while the 資料根據比例 sort is on (design 3.23.3). */
      share?: Share | null
    }
  | { variant: 'compact'; issue: IssueSummary; spaceTypes: SpaceType[]; shared: SharedForCard | null }

/** One issue in a list (design 3.9). Two variants:
 * - detailed: a box with all the counts, 資料根據, 特別關注族群 (the groups not
 *   included yet), 更新日期 and 空間類型.
 * - compact: the title link, 跨議題共用的利害關係人, 資料根據 (counts and bar
 *   only, decision 72), 更新日期 and 空間類型, in a smaller box. It uses
 *   the same box as the compact SolutionCard, so the home blocks look alike.
 *   The home page and the space page list only analyzed issues, but an issue
 *   that is 製作中 still shows its badge and a dashed border, and no fields.
 * An issue without an analysis shows 製作中, with no numbers and no link. */
export function IssueCard(props: IssueCardProps) {
  const { issue, spaceTypes } = props
  const title = tc.numberTitle(issue.number, issue.title)
  const updated = issue.updated && <Field label={tc.updated}><time dateTime={issue.updated}>{issue.updated}</time></Field>
  const spaces = issue.spaces.length > 0 && (
    <Field label={tc.spaces}>
      <SpaceLinks spaceTypes={spaceTypes} codes={issue.spaces} />
    </Field>
  )
  // The same text and link in both variants (decision 72). The other
  // issues show their titles (decision 112).
  const sharedField = props.shared && (
    <Field label={tc.shared}>
      <Link to={CROSS_STAKEHOLDERS_PATH} className={linkClass}>
        {tc.sharedValue(props.shared.count, props.shared.titles)}
      </Link>
    </Field>
  )
  const titleLink = issue.available && (
    <Link to={`/issues/${issue.number}`} className={linkClass}>{title}</Link>
  )

  if (props.variant === 'compact') {
    return (
      <article className={`h-full rounded-md border p-3${issue.available ? '' : ' border-dashed'}`}>
        <p className="font-medium">
          {titleLink || title}
          {!issue.available && <Badge variant="secondary" className="ml-2 rounded-sm">{tc.inProgress}</Badge>}
        </p>
        {issue.available && (
          <dl className="mt-1 space-y-1 text-sm">
            {sharedField}
            <Field label={t.basis.label}>
              <CellBasis cells={issue.counts.cells} stories={issue.counts.stories} compact inlineLabel={false} />
            </Field>
            {updated}
            {spaces}
          </dl>
        )}
      </article>
    )
  }

  const H = `h${props.headingLevel ?? 3}` as const
  // An issue a participant added (not the host) says so under its title.
  const note = isParticipantIssue(issue) && (
    <p className="mt-1 text-sm text-muted-foreground">{tc.participantNote}</p>
  )
  if (!issue.available) {
    return (
      <article className="h-full rounded-lg border border-dashed p-4">
        <H className="font-semibold text-muted-foreground">{title}</H>
        {note}
        <Badge variant="secondary" className="mt-2 rounded-sm">{tc.inProgress}</Badge>
      </article>
    )
  }
  const c = issue.counts
  // 特別關注族群: the groups not included yet, or 都已納入. Never a count (design 13).
  const gaps = focusGapsText(issue)
  return (
    <article className="h-full rounded-lg border p-4">
      <H className="text-lg font-semibold">{titleLink}</H>
      {note}
      <dl className="mt-3 space-y-1.5 text-sm">
        <Field label={tc.stakeholders}>{tc.stakeholdersValue(c.stakeholdersO, c.stakeholdersI)}</Field>
        <Field label={tc.stories}>{tc.storiesValue(c.stories)}</Field>
        <Field label={tc.conflicts}>{tc.itemsValue(c.conflicts)}</Field>
        <Field label={tc.solutions}>{tc.itemsValue(c.solutions)}</Field>
        {sharedField}
        <Field label={t.basis.label}>
          <CellBasis cells={c.cells} stories={c.stories} />
          {/* The share is shown next to the counts it comes from, never alone. */}
          {props.share && <p className="mt-1 font-medium">{ti.sharePercent(sharePercent(props.share))}</p>}
        </Field>
        {gaps && (gaps.kind === 'all' ? (
          <Field label={tc.focusAll}>{tc.focusAllValue}</Field>
        ) : (
          <Field label={tc.focusGaps}>{tc.focusGapsValue(gaps.groups)}</Field>
        ))}
        {/* A card shows only 更新日期 (decision 131). 新增日期 is on the issue page. */}
        {updated}
        {spaces}
      </dl>
    </article>
  )
}
