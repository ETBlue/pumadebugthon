import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { typeTabPath } from '@/lib/entityPaths'
import type { IssueTitles } from '@/lib/issues'
import type { TypeKind } from '@/lib/typeKinds'
import { UpdatedField } from './DateFields'
import { Field } from './Field'
import { IssueTitleLinks } from './IssueTitleLinks'
import { linkClass } from './styles'
import { TYPE_LIST_TEXT } from './typeText'

/** The counts of the 利害關係人 and 解法 fields. null while the issue files
 * load or when they fail: then the two fields are left out, so the card
 * never shows a wrong 0. */
export interface TypeCardCounts {
  stakeholders: number
  solutions: number
}

/** One type on a type list page: a space type on #/spaces (design 3.9,
 * decision 120), a 領域 on #/domains or a 解法類型 on #/solution-types
 * (Task U3). The same box as the compact IssueCard and SolutionCard. It
 * shows the name as a link to the type page, the code and the description.
 * A type with an analyzed issue then shows 議題 (the count and the titles,
 * one per line), 利害關係人 and 解法. A type with no analyzed issue shows
 * 「尚無議題」 and a dashed border, like a 製作中 issue card. Every type
 * shows 更新日期 last (decision 131).
 * heading: h3 under a group heading (h2); h2 on a list with no group
 * headings (#/solution-types), so no heading level is skipped. */
export function TypeCard({ kind, type, issues, titles, counts, heading = 'h3' }: {
  kind: TypeKind
  type: { code: string; name: string; description: string; updated?: string | null }
  /** The numbers of the analyzed issues that use the type (typeIssues). */
  issues: number[]
  titles: IssueTitles
  counts: TypeCardCounts | null
  heading?: 'h2' | 'h3'
}) {
  const ts = TYPE_LIST_TEXT[kind]
  const used = issues.length > 0
  const Heading = heading
  return (
    <article className={`h-full rounded-md border p-3${used ? '' : ' border-dashed'}`}>
      <Heading className="font-medium">
        <Link to={typeTabPath(kind, type.code, 'overview')} className={linkClass}>{type.name}</Link>
        {!used && <Badge variant="secondary" className="ml-2 rounded-sm">{ts.noIssues}</Badge>}
      </Heading>
      <p className="mt-0.5 font-mono text-sm text-muted-foreground">{type.code}</p>
      {type.description && <p className="mt-1 text-sm">{type.description}</p>}
      {(used || type.updated) && (
        <dl className="mt-2 space-y-1 text-sm">
          {used && (
            <Field label={ts.issues}>
              {ts.issuesValue(issues.length)}
              <IssueTitleLinks numbers={issues} titles={titles} to={(n) => `/issues/${n}`} />
            </Field>
          )}
          {used && counts && (
            <>
              <Field label={ts.stakeholders}>{ts.stakeholdersValue(counts.stakeholders)}</Field>
              <Field label={ts.solutions}>{ts.solutionsValue(counts.solutions)}</Field>
            </>
          )}
          {/* A card shows only 更新日期 (decision 131), also for an unused type. */}
          <UpdatedField updated={type.updated} />
        </dl>
      )}
    </article>
  )
}
