/** The six header nav items, in header order (design 3.7, decision 120,
 * Task U3): 議題 | 利害關係人 | 空間 | 領域 | 解法 | 解法類型. Each item is also
 * the first URL segment of its list page. */
export const NAV_ITEMS = ['issues', 'stakeholders', 'spaces', 'domains', 'solutions', 'solution-types'] as const

export type NavItem = (typeof NAV_ITEMS)[number]

/** Split a path into its non-empty segments. "/issues/2/" gives ["issues", "2"]. */
function segments(pathname: string): string[] {
  return pathname.split('/').filter((s) => s !== '')
}

/**
 * The header nav item that the page at `pathname` belongs to, or null.
 * Pass `useLocation().pathname`, so the query string is not part of it.
 * Only whole segments match: "/issuesx" is not 議題.
 * Solution pages (`/solutions/2-S1`, `/solutions/X-S1` and their tabs) belong
 * to 解法. So does the old `/issues/<n>/solutions/<code>[/<tab>]`. It does
 * not redirect any more (decision 110); it shows the not-found page. The
 * issue's own 解法 tab `/issues/<n>/solutions` stays under 議題. Story pages `/stakeholders/<id>/stories/…` belong to 利害關係人.
 * Space pages `/spaces/<code>` belong to 空間 (decision 120). In the same
 * way, `/domains/<code>` belongs to 領域 and `/solution-types/<code>` to
 * 解法類型 (Task U3).
 */
export function activeNavItem(pathname: string): NavItem | null {
  const parts = segments(pathname)
  const first = parts[0]
  if (first === 'issues' && parts.length >= 4 && parts[2] === 'solutions') return 'solutions'
  return NAV_ITEMS.find((item) => item === first) ?? null
}

/** True only on one of the six list pages itself, for example "/issues". */
export function isNavListPage(pathname: string): boolean {
  const parts = segments(pathname)
  return parts.length === 1 && activeNavItem(pathname) !== null
}
