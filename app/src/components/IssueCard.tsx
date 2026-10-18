import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n/zh-TW'
import { Field } from './Field'
import type { Shared } from '@/lib/issues'
import type { IssueSummary, SpaceType } from '@/types'
import { SpaceLinks } from './SpaceLinks'
import { linkClass } from './styles'

const tc = t.issueCard

/** One issue on the home page (design 3.1). An issue without an analysis
 * shows 製作中, with no numbers and no link. shared is null when fewer than 2
 * issues are available; then the 跨議題 field is left out. */
export function IssueCard({ issue, spaceTypes, shared }: { issue: IssueSummary; spaceTypes: SpaceType[]; shared: Shared | null }) {
  const title = tc.numberTitle(issue.number, issue.title)
  if (!issue.available) {
    return (
      <article className="h-full rounded-lg border border-dashed p-4">
        <h3 className="font-semibold text-muted-foreground">{title}</h3>
        <Badge variant="secondary" className="mt-2 rounded-sm">{tc.inProgress}</Badge>
      </article>
    )
  }
  const c = issue.counts
  return (
    <article className="h-full rounded-lg border p-4">
      <h3 className="text-lg font-semibold">
        <Link to={`/issues/${issue.number}`} className={linkClass}>{title}</Link>
      </h3>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Field label={tc.stakeholders}>{tc.stakeholdersValue(c.stakeholdersO, c.stakeholdersI)}</Field>
        <Field label={tc.stories}>{tc.storiesValue(c.stories)}</Field>
        <Field label={tc.conflicts}>{tc.itemsValue(c.conflicts)}</Field>
        <Field label={tc.solutions}>{tc.itemsValue(c.solutions)}</Field>
        {shared && (
          <Field label={tc.shared}>
            <Link
              to={{ pathname: '/', search: '?cross=1' }}
              state={{ focus: 'stakeholders' }}
              preventScrollReset
              className={linkClass}
            >
              {tc.sharedValue(shared.count, shared.issues)}
            </Link>
          </Field>
        )}
        <Field label={tc.dataBasis}>
          <span title={tc.dataBasisHint}>{tc.dataBasisValue(c.wantsEvidence, c.wantsAiSummary, c.stories)}</span>
        </Field>
        {issue.updated && <Field label={tc.updated}><time dateTime={issue.updated}>{issue.updated}</time></Field>}
        {issue.spaces.length > 0 && (
          <Field label={tc.spaces}>
            <SpaceLinks spaceTypes={spaceTypes} codes={issue.spaces} />
          </Field>
        )}
      </dl>
    </article>
  )
}
