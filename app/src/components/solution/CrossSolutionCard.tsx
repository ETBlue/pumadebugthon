import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Field } from '@/components/Field'
import { Markdown } from '@/components/Markdown'
import { CoveredBasisField, SolutionDateFields, type CoveredBasis } from '@/components/SolutionCard'
import { Badge } from '@/components/ui/badge'
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
const ts = t.solutionsList

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
 * the summary and the issues. The detailed variant (#/solutions, design
 * 3.23.9) also shows the badge 「跨議題解法」, 「也涵蓋 #1 的需求」 when it
 * covers needs of issues outside its parts, the space types, 新增日期,
 * 更新日期, the number of needs it covers and 「涵蓋需求的資料根據」.
 * children come last (for example the date on the home page). */
export function CrossSolutionCard({ solution: sol, detailed, children }: {
  solution: CrossSolution
  /** For #/solutions: spaceTypes for the links, the covered need count,
   * the cells of the covered needs (with the percent while 資料根據比例 is
   * on), and the issues of crossAlsoCovers. */
  detailed?: { spaceTypes: SpaceType[]; coveredNeeds: number | null; basis: CoveredBasis; alsoCovers: number[] }
  children?: ReactNode
}) {
  return (
    <div className="rounded-md border p-3">
      {detailed && (
        <p className="mb-1">
          <Badge variant="secondary" className="rounded-sm">{ts.crossBadge}</Badge>
        </p>
      )}
      <p className="font-medium"><CrossSolutionLink solution={sol} /></p>
      <p className="mt-1 text-sm"><Markdown text={sol.summary} /></p>
      <dl className="mt-2 space-y-1 text-sm">
        <Field label={tx.cardIssues}>
          <CrossIssueLinks solution={sol} />
          {detailed && detailed.alsoCovers.length > 0 && (
            <span className="block">{ts.alsoCovers(detailed.alsoCovers)}</span>
          )}
        </Field>
        {detailed && sol.spaces.length > 0 && (
          <Field label={tl.solutionSpaces}><SpaceLinks spaceTypes={detailed.spaceTypes} codes={sol.spaces} /></Field>
        )}
        {detailed && <SolutionDateFields added={sol.added} updated={sol.updated} />}
      </dl>
      {detailed && detailed.coveredNeeds !== null && <p className="mt-1 text-sm">{tl.solutionNeeds(detailed.coveredNeeds)}</p>}
      {detailed && (
        <dl className="mt-1 text-sm">
          <CoveredBasisField basis={detailed.basis} />
        </dl>
      )}
      {children}
    </div>
  )
}
