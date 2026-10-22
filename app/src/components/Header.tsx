import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { useCrossIssueOrNull, useIndex } from '@/data'
import { t } from '@/i18n/zh-TW'
import { issueCount, solutionCount, spaceCount, stakeholderCount } from '@/lib/counts'
import { activeNavItem, isNavListPage, type NavItem } from '@/lib/nav'
import type { CrossIssueFile, IndexFile } from '@/types'
import { PHONE_SCROLL_CLASS } from './PageTabs'
import { ThemeToggle } from './ThemeToggle'

const th = t.header
const linkBase = 'inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-sm underline-offset-4 hover:underline'

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

/** The classes of the link list (decision 123). Below md: one row that
 * scrolls sideways, the same as the issue page tab list (PHONE_SCROLL_CLASS,
 * decision 102). It is as wide as the screen, with the 16 px page padding
 * inside. py-1 keeps the focus outline (2 px, offset 2 px) inside the list,
 * because the list hides what goes past its top and bottom. From md: the
 * row of decision 120, with no scroll and no extra space. */
export const NAV_LIST_CLASS =
  `flex items-center gap-x-4 py-1 text-sm ${PHONE_SCROLL_CLASS} ` +
  'md:mx-0 md:w-auto md:flex-wrap md:gap-x-5 md:overflow-visible md:px-0 md:py-0'

function Links({ index, cross }: { index: IndexFile | null; cross: CrossIssueFile | null }) {
  const { pathname } = useLocation()
  const listRef = useRef<HTMLUListElement>(null)
  // The same rule as the issue page tab list (PageTabs): when the active
  // link is outside the visible part of a list that scrolls, the list (not
  // the page) scrolls to put it in the middle. It runs again when the counts
  // come in, because they make the links wider. From md the list does not
  // scroll, so nothing happens.
  const loaded = index !== null
  useEffect(() => {
    const list = listRef.current
    if (!list || list.scrollWidth <= list.clientWidth) return
    const active = list.querySelector<HTMLElement>('[aria-current]')
    if (!active) return
    const l = list.getBoundingClientRect()
    const a = active.getBoundingClientRect()
    if (a.left < l.left || a.right > l.right) list.scrollLeft += a.left - l.left - (l.width - a.width) / 2
  }, [pathname, loaded])
  return (
    <ul ref={listRef} className={NAV_LIST_CLASS}>
      <li className="flex-none"><CountLink item="issues" label={th.issues} count={index && issueCount(index)} /></li>
      <li className="flex-none"><CountLink item="stakeholders" label={th.stakeholders} count={index && stakeholderCount(index)} /></li>
      <li className="flex-none"><CountLink item="spaces" label={th.spaces} count={index && spaceCount(index)} /></li>
      <li className="flex-none"><CountLink item="solutions" label={th.solutions} count={index && solutionCount(index, cross)} /></li>
    </ul>
  )
}

/** The page header (design 3.7): app name, the four count links, and the
 * theme toggle. From md: one row, in this order. Below md (decision 123):
 * row 1 has the app name and the toggle, row 2 has the links in one row
 * that scrolls sideways. The links come before the toggle in the HTML, so
 * the keyboard order is the same at every width: app name, links, toggle.
 * Below md the nav is moved to the second row with order-last. */
export function Header({ container }: { container: string }) {
  const index = useIndex()
  const cross = useCrossIssueOrNull()
  return (
    <header className="border-b">
      <div className={`${container} flex flex-wrap items-center gap-x-6 gap-y-1 py-2`}>
        <div className="min-w-0 flex-1 md:flex-none">
          <Link to="/" className="inline-flex min-h-10 items-center rounded-sm text-lg font-bold">
            {t.appTitle}
          </Link>
        </div>
        <nav aria-label={th.nav} className="order-last min-w-0 basis-full md:order-none md:basis-auto md:flex-1">
          <Links index={index.status === 'ready' ? index.data : null} cross={cross} />
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
