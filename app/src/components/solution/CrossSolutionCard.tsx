import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Field } from '@/components/Field'
import { Markdown } from '@/components/Markdown'
import { SpaceLinks } from '@/components/SpaceLinks'
import { linkClass } from '@/components/styles'
import { TagBadge } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { crossIssueNumbers } from '@/lib/crossIssue'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { crossSolutionPath } from '@/lib/entityPaths'
import { tabPath } from '@/lib/issuePage'
import type { CrossSolution, SpaceType } from '@/types'

const tx = t.crossIssue
const tl = t.lists

/** The tag badge, then the code and name as a link to the cross-issue
 * solution page (#/solutions/X-A). The badge is outside the link. The link
 * keeps the 「只看有資料根據」 setting. */
export function CrossSolutionLink({ solution: sol }: { solution: CrossSolution }) {
  const [params] = useSearchParams()
  return (
    <>
      {sol.tag && <TagBadge kind={sol.tag} className="mr-1.5" />}
      <Link to={{ pathname: crossSolutionPath(sol.code), search: dataBasisFilterSearch(params) }} className={linkClass}>
        <span className="mr-1 font-mono">{sol.code}</span> {sol.name}
      </Link>
    </>
  )
}

/** The issues of a cross-issue solution as links: 「#1、#2、#8」. The links
 * keep the 「只看有資料根據」 setting. */
export function CrossIssueLinks({ solution }: { solution: CrossSolution }) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  return (
    <>
      {crossIssueNumbers(solution).map((n, i) => (
        <span key={n}>
          {i > 0 && t.listSeparator}
          <Link to={{ pathname: tabPath(n, 'overview'), search }} className={linkClass}>{tx.issueLink(n)}</Link>
        </span>
      ))}
    </>
  )
}

/** One cross-issue solution in a list (design 3.9, 3.18): the code and name,
 * the summary and the issues. The detailed variant (#/solutions) also shows
 * the space types, 新增日期 and the number of needs it covers. children
 * come last (for example the date on the home page). */
export function CrossSolutionCard({ solution: sol, detailed, children }: {
  solution: CrossSolution
  /** For #/solutions: spaceTypes for the links, and the covered need count. */
  detailed?: { spaceTypes: SpaceType[]; coveredNeeds: number | null }
  children?: ReactNode
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium"><CrossSolutionLink solution={sol} /></p>
      <p className="mt-1 text-sm"><Markdown text={sol.summary} /></p>
      <dl className="mt-2 space-y-1 text-sm">
        <Field label={tx.cardIssues}><CrossIssueLinks solution={sol} /></Field>
        {detailed && sol.spaces.length > 0 && (
          <Field label={tl.solutionSpaces}><SpaceLinks spaceTypes={detailed.spaceTypes} codes={sol.spaces} /></Field>
        )}
        {detailed && sol.added && <Field label={tl.solutionAdded}><time dateTime={sol.added}>{sol.added}</time></Field>}
      </dl>
      {detailed && detailed.coveredNeeds !== null && <p className="mt-1 text-sm">{tl.solutionNeeds(detailed.coveredNeeds)}</p>}
      {children}
    </div>
  )
}
