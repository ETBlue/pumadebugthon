import { useMemo } from 'react'
import { Link, useLocation } from 'react-router'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { issueCount, needCount, solutionCount, stakeholderCount, wantCount } from '@/lib/counts'
import { availableIssues } from '@/lib/issues'
import { activeNavItem, isNavListPage, type NavItem } from '@/lib/nav'
import type { IndexFile } from '@/types'
import { ThemeToggle } from './ThemeToggle'

const th = t.header
const linkBase = 'inline-flex min-h-10 items-center gap-1.5 rounded-sm underline-offset-4 hover:underline'

/** One header link with its count. count is null while the data loads.
 * The link looks active on its list page and on its subpages (design 3.7).
 * aria-current is "page" only on the list page itself, and "true" on a subpage. */
function CountLink({ item, label, count }: { item: NavItem; label: string; count: number | null }) {
  const { pathname } = useLocation()
  const active = activeNavItem(pathname) === item
  const current = active ? (isNavListPage(pathname) ? 'page' : 'true') : undefined
  const content = (
    <>
      <span>{label}</span>
      {count !== null && <span className="font-semibold tabular-nums">{count}</span>}
    </>
  )
  return (
    <Link to={`/${item}`} aria-current={current} className={`${linkBase} ${active ? 'font-semibold underline' : ''}`}>
      {content}
    </Link>
  )
}

function Links({ index }: { index: IndexFile | null }) {
  const folders = useMemo(() => (index ? availableIssues(index).map((i) => i.folder) : []), [index])
  const issues = useIssues(folders)
  const ready = index && issues.status === 'ready' ? issues.data : null
  const wants = ready && wantCount(ready)
  const needs = ready && needCount(ready)
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-0 text-sm md:gap-x-5">
      <li><CountLink item="issues" label={th.issues} count={index && issueCount(index)} /></li>
      <li><CountLink item="stakeholders" label={th.stakeholders} count={index && stakeholderCount(index)} /></li>
      <li><CountLink item="wants" label={th.wants} count={wants} /></li>
      <li><CountLink item="needs" label={th.needs} count={needs} /></li>
      <li><CountLink item="solutions" label={th.solutions} count={index && solutionCount(index)} /></li>
    </ul>
  )
}

/** The page header (design 3.7): app name, the five count links, and the
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
