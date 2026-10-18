import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { stripMarkdown } from '@/lib/markdown'
import { solutionPath } from '@/lib/solutionPage'
import type { Solution } from '@/types'
import { Markdown } from './Markdown'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

/** The tag badge, then the code and name as a link to the solution page.
 * showIssue: the code shows the issue too, for example 「#2 A」, for lists
 * across issues. The link keeps the 「只看有資料根據」 setting. */
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

/** A short box for one solution: the code and name as a link to the
 * solution page, and the one-line summary. children are shown after the
 * summary. showIssue: see SolutionTitleLink. */
export function SolutionSummary({ solution: sol, issueNumber, showIssue = false, children }: {
  solution: Solution
  issueNumber: number
  showIssue?: boolean
  children?: ReactNode
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">
        <SolutionTitleLink solution={sol} issueNumber={issueNumber} showIssue={showIssue} />
      </p>
      <p className="mt-1 text-sm"><Markdown text={sol.summary} /></p>
      {children}
    </div>
  )
}
