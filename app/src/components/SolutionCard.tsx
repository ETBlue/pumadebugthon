import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { basisTotal } from '@/lib/cellBasis'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { stripMarkdown } from '@/lib/markdown'
import { solutionPath } from '@/lib/entityPaths'
import { tabPath } from '@/lib/issuePage'
import type { CellCounts, Solution, SpaceType } from '@/types'
import { CellBasis } from './CellBasis'
import { Field } from './Field'
import { Markdown } from './Markdown'
import { SpaceLinks } from './SpaceLinks'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

const tl = t.lists
const ts = t.solutionsList

/** The tag badge, then the code and name as a link to the solution page.
 * The badge is outside the link. showIssue: the code shows the issue too,
 * for example 「#2 A」, for lists across issues. The link keeps the
 * 「只看有資料根據」 setting. */
export function SolutionTitleLink({ solution: sol, issueNumber, showIssue = false }: {
  solution: Solution
  issueNumber: number
  showIssue?: boolean
}) {
  const [params] = useSearchParams()
  return (
    <>
      {sol.name.tag && <TagBadge kind={sol.name.tag} className="mr-1.5" />}
      <Link to={{ pathname: solutionPath(issueNumber, sol.id), search: dataBasisFilterSearch(params) }} className={linkClass}>
        <span className="mr-1 font-mono">{showIssue ? t.solutionId(issueNumber, sol.id) : sol.id}</span>{' '}
        {stripMarkdown(sol.name.text)}
      </Link>
    </>
  )
}

/** The cells of the covered needs and the share percent, for the cards of
 * #/solutions. percent is null while a date sort is on. */
export interface CoveredBasis {
  cells: CellCounts
  percent: number | null
}

/** 「涵蓋需求的資料根據」 on the #/solutions cards (design 3.23.4 and 3.23.9),
 * inside a <dl>: the cells of the stories of the needs the solution covers,
 * as counts and a bar. With 資料根據比例 on, 「實證＋AI整理 30%」 under
 * the counts. With no cells: 「沒有涵蓋的需求」 and no bar. */
export function CoveredBasisField({ basis }: { basis: CoveredBasis }) {
  const empty = basisTotal(basis.cells) === 0
  return (
    <div>
      <dt className="text-muted-foreground">{ts.basis}</dt>
      <dd className="mt-0.5">
        {empty ? (
          ts.basisNone
        ) : (
          <>
            <CellBasis cells={basis.cells} stories={0} compact inlineLabel={false} />
            {basis.percent !== null && <p className="mt-0.5 font-medium">{ts.sharePercent(basis.percent)}</p>}
          </>
        )}
      </dd>
    </div>
  )
}

/** 新增日期 and 更新日期 of a solution, as fields in a <dl>. A missing date
 * is left out (the data may not have 更新日期 yet). */
export function SolutionDateFields({ added, updated }: { added?: string | null; updated?: string | null }) {
  return (
    <>
      {added && <Field label={ts.added}><time dateTime={added}>{added}</time></Field>}
      {updated && <Field label={ts.updated}><time dateTime={updated}>{updated}</time></Field>}
    </>
  )
}

interface CommonProps {
  solution: Solution
  issueNumber: number
  /** The code shows the issue too (「#2 A」). See SolutionTitleLink. */
  showIssue?: boolean
  /** Extra content for one page, shown at the end of the card. For example
   * the 新增日期 on the home page, or the other space types on a space page. */
  children?: ReactNode
}

/** The props of SolutionCard. Each variant has its own props.
 * - detailed: the solution list (#/solutions). Needs spaceTypes for the
 *   space type links, coveredNeeds for 「涵蓋 9 個需求」, issueTitle for the
 *   issue line and basis for 「涵蓋需求的資料根據」.
 * - compact: short lists (home page, space page, stakeholder page, opinion
 *   check). */
export type SolutionCardProps =
  | (CommonProps & {
      variant: 'detailed'
      spaceTypes: SpaceType[]
      /** The number of needs it covers (coveredNeedCount). null: not shown. */
      coveredNeeds: number | null
      /** The title of its issue, for 「議題：#2 找回消失的垃圾桶」. */
      issueTitle: string
      basis: CoveredBasis
    })
  | (CommonProps & { variant: 'compact' })

/** One solution in a list (design 3.9). Both variants show the tag, the code
 * and name as a link to the solution page, and the one-line summary. The
 * detailed variant (#/solutions, design 3.23.9) also shows the issue,
 * 空間類型, 新增日期, 更新日期, the number of needs it covers (decision 54)
 * and 「涵蓋需求的資料根據」. children come last. */
export function SolutionCard(props: SolutionCardProps) {
  const { solution: sol, issueNumber, showIssue = false, children } = props
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">
        <SolutionTitleLink solution={sol} issueNumber={issueNumber} showIssue={showIssue} />
      </p>
      <p className="mt-1 text-sm"><Markdown text={sol.summary} /></p>
      {props.variant === 'detailed' && (
        <>
          <dl className="mt-2 space-y-1 text-sm">
            <Field label={ts.issue}>
              <Link to={tabPath(issueNumber, 'overview')} className={linkClass}>{ts.issueValue(issueNumber, props.issueTitle)}</Link>
            </Field>
            {sol.spaces.length > 0 && (
              <Field label={tl.solutionSpaces}><SpaceLinks spaceTypes={props.spaceTypes} codes={sol.spaces} /></Field>
            )}
            <SolutionDateFields added={sol.added} updated={sol.updated} />
          </dl>
          {props.coveredNeeds !== null && <p className="mt-1 text-sm">{tl.solutionNeeds(props.coveredNeeds)}</p>}
          <dl className="mt-1 text-sm">
            <CoveredBasisField basis={props.basis} />
          </dl>
        </>
      )}
      {children}
    </div>
  )
}
