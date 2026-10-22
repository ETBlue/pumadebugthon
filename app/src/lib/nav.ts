/** The four header nav items, in header order (design 3.7, decision 120). */
export type NavItem = 'issues' | 'stakeholders' | 'spaces' | 'solutions'

const items: readonly NavItem[] = ['issues', 'stakeholders', 'spaces', 'solutions']

/** Split a path into its non-empty segments. "/issues/2/" gives ["issues", "2"]. */
function segments(pathname: string): string[] {
  return pathname.split('/').filter((s) => s !== '')
}

/**
 * The header nav item that the page at `pathname` belongs to, or null.
 * Pass `useLocation().pathname`, so the query string is not part of it.
 * Only whole segments match: "/issuesx" is not 議題.
 * Solution pages (`/solutions/2-A`, `/solutions/X-A` and their tabs) belong
 * to 解法. So does the old `/issues/<n>/solutions/<code>[/<tab>]`. It does
 * not redirect any more (decision 110); it shows the not-found page. The
 * issue's own 解法 tab `/issues/<n>/solutions` stays under 議題. Story pages `/stakeholders/<id>/stories/…` belong to 利害關係人.
 * Space pages `/spaces/<code>` belong to 空間 (decision 120).
 */
export function activeNavItem(pathname: string): NavItem | null {
  const parts = segments(pathname)
  const first = parts[0]
  if (first === 'issues' && parts.length >= 4 && parts[2] === 'solutions') return 'solutions'
  return items.find((item) => item === first) ?? null
}

/** True only on one of the four list pages itself, for example "/issues". */
export function isNavListPage(pathname: string): boolean {
  const parts = segments(pathname)
  return parts.length === 1 && activeNavItem(pathname) !== null
}
