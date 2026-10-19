import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { stripMarkdown } from '@/lib/markdown'
import { solutionPath } from '@/lib/entityPaths'
import type { Solution, SpaceType } from '@/types'
import { Field } from './Field'
import { Markdown } from './Markdown'
import { SpaceLinks } from './SpaceLinks'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

const tl = t.lists

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
 *   space type links and coveredNeeds for 「涵蓋 9 個需求」.
 * - compact: short lists (home page, space page, stakeholder page, opinion
 *   check). */
export type SolutionCardProps =
  | (CommonProps & {
      variant: 'detailed'
      spaceTypes: SpaceType[]
      /** The number of needs it covers (coveredNeedCount). null: not shown. */
      coveredNeeds: number | null
    })
  | (CommonProps & { variant: 'compact' })

/** One solution in a list (design 3.9). Both variants show the tag, the code
 * and name as a link to the solution page, and the one-line summary. The
 * detailed variant also shows 空間類型, 新增日期 and the number of needs it
 * covers (decision 54). children come last. */
export function SolutionCard(props: SolutionCardProps) {
  const { solution: sol, issueNumber, showIssue = false, children } = props
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">
        <SolutionTitleLink solution={sol} issueNumber={issueNumber} showIssue={showIssue} />
      </p>
      <p className="mt-1 text-sm"><Markdown text={sol.summary} /></p>
      {props.variant === 'detailed' && (
        <dl className="mt-2 space-y-1 text-sm">
          {sol.spaces.length > 0 && (
            <Field label={tl.solutionSpaces}><SpaceLinks spaceTypes={props.spaceTypes} codes={sol.spaces} /></Field>
          )}
          {sol.added && <Field label={tl.solutionAdded}><time dateTime={sol.added}>{sol.added}</time></Field>}
        </dl>
      )}
      {props.variant === 'detailed' && props.coveredNeeds !== null && (
        <p className="mt-1 text-sm">{tl.solutionNeeds(props.coveredNeeds)}</p>
      )}
      {children}
    </div>
  )
}
