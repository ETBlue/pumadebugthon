import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n/zh-TW'
import type { IssueTitles } from '@/lib/issues'
import type { SpaceType } from '@/types'
import { Field } from './Field'
import { IssueTitleLinks } from './IssueTitleLinks'
import { linkClass } from './styles'

const ts = t.spacesList

/** The counts of the 利害關係人 and 解法 fields. null while the issue files
 * load or when they fail: then the two fields are left out, so the card
 * never shows a wrong 0. */
export interface SpaceCardCounts {
  stakeholders: number
  solutions: number
}

/** One space type on #/spaces (design 3.9, decision 120). The same box as
 * the compact IssueCard and SolutionCard. It shows the name as a link to the
 * space page, the code and the description. A space with an analyzed issue
 * then shows 議題 (the count and the titles, one per line), 利害關係人 and
 * 解法. A space with no analyzed issue shows 「尚無議題」 and a dashed
 * border, like a 製作中 issue card. */
export function SpaceCard({ space, issues, titles, counts }: {
  space: SpaceType
  /** The numbers of the analyzed issues that use the space (issuesBySpace). */
  issues: number[]
  titles: IssueTitles
  counts: SpaceCardCounts | null
}) {
  const used = issues.length > 0
  return (
    <article className={`h-full rounded-md border p-3${used ? '' : ' border-dashed'}`}>
      <h3 className="font-medium">
        <Link to={`/spaces/${space.code}`} className={linkClass}>{space.name}</Link>
        {!used && <Badge variant="secondary" className="ml-2 rounded-sm">{ts.noIssues}</Badge>}
      </h3>
      <p className="mt-0.5 font-mono text-sm text-muted-foreground">{space.code}</p>
      {space.description && <p className="mt-1 text-sm">{space.description}</p>}
      {used && (
        <dl className="mt-2 space-y-1 text-sm">
          <Field label={ts.issues}>
            {ts.issuesValue(issues.length)}
            <IssueTitleLinks numbers={issues} titles={titles} to={(n) => `/issues/${n}`} />
          </Field>
          {counts && (
            <>
              <Field label={ts.stakeholders}>{ts.stakeholdersValue(counts.stakeholders)}</Field>
              <Field label={ts.solutions}>{ts.solutionsValue(counts.solutions)}</Field>
            </>
          )}
        </dl>
      )}
    </article>
  )
}
