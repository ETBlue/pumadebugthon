import { useMemo } from 'react'
import { Link, NavLink } from 'react-router'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { issueCount, solutionCount, stakeholderCount, wantCount } from '@/lib/counts'
import { availableIssues } from '@/lib/issues'
import type { IndexFile } from '@/types'
import { ThemeToggle } from './ThemeToggle'

const th = t.header
const linkBase = 'inline-flex min-h-10 items-center gap-1.5 rounded-sm underline-offset-4 hover:underline'

/** One header link with its count. count is null while the data loads. */
function CountLink({ to, label, count }: { to: string; label: string; count: number | null }) {
  const content = (
    <>
      <span>{label}</span>
      {count !== null && <span className="font-semibold tabular-nums">{count}</span>}
    </>
  )
  return (
    <NavLink to={to} end className={({ isActive }) => `${linkBase} ${isActive ? 'font-semibold underline' : ''}`}>
      {content}
    </NavLink>
  )
}

function Links({ index }: { index: IndexFile | null }) {
  const folders = useMemo(() => (index ? availableIssues(index).map((i) => i.folder) : []), [index])
  const issues = useIssues(folders)
  const wants = index && issues.status === 'ready' ? wantCount(issues.data) : null
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-0 text-sm md:gap-x-5">
      <li><CountLink to="/issues" label={th.issues} count={index && issueCount(index)} /></li>
      <li><CountLink to="/stakeholders" label={th.stakeholders} count={index && stakeholderCount(index)} /></li>
      <li><CountLink to="/wants" label={th.wants} count={wants} /></li>
      <li><CountLink to="/solutions" label={th.solutions} count={index && solutionCount(index)} /></li>
    </ul>
  )
}

/** The page header (design 3.7): app name, the four count links, and the
 * theme toggle. On a phone the links and the toggle wrap to a second row,
 * in the same order as the keyboard order. */
export function Header({ container }: { container: string }) {
  const index = useIndex()
  return (
    <header className="border-b">
      <div className={`${container} flex flex-wrap items-center gap-x-6 gap-y-1 py-2`}>
        <div className="w-full md:w-auto">
          <Link to="/" className="inline-flex min-h-10 items-center rounded-sm text-lg font-bold">
            {t.appTitle}
          </Link>
        </div>
        <nav aria-label={th.nav} className="min-w-0 flex-1">
          <Links index={index.status === 'ready' ? index.data : null} />
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
