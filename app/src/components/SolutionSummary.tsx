import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
import type { Solution } from '@/types'
import { CellText } from './CellText'
import { Markdown } from './Markdown'
import { linkClass } from './styles'

/** A short box for one solution: ID, name, one-line summary and a link to the
 * solutions tab. children are shown after the summary. */
export function SolutionSummary({ solution: sol, linkTo, linkLabel, children }: {
  solution: Solution
  linkTo: To
  linkLabel: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium">
        <span className="mr-2 font-mono">{sol.id}</span>
        <CellText cell={sol.name} />
      </p>
      <p className="mt-1 text-sm"><Markdown text={sol.summary} /></p>
      {children}
      <p className="mt-1 text-sm">
        <Link to={linkTo} className={linkClass}>{linkLabel}</Link>
      </p>
    </div>
  )
}
