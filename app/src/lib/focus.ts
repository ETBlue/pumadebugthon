// The ?focus= parameter (design 3.2, decision 53). Hash URLs use the "#"
// for the route, so ?focus=<value> names the part of the page to scroll to.

export const FOCUS_PARAM = 'focus'

/** Section names, a conflict (C1), a W group (W08), an N group (N01) or a
 * story ID (I06-US01: a want or a need with no group). */
const FOCUS_VALUE = /^(?:conflicts|stakeholders|C\d+|W\d\d|N\d\d|[OI]\d+-US\d+)$/

/** The element ID to scroll to and focus: "focus-<value>". null for an
 * unknown value, so the page does nothing. */
export function focusElementId(value: string | null): string | null {
  return value !== null && FOCUS_VALUE.test(value) ? `focus-${value}` : null
}

/** How long the page waits for the ?focus= element to appear (for example
 * while the issue file loads). After this time it gives up and does nothing. */
export const FOCUS_WAIT_MS = 5000

/** The scroll behavior for a ?focus= jump. With prefers-reduced-motion, the
 * page jumps with no animation. */
export function focusScrollBehavior(reducedMotion: boolean): 'auto' | 'smooth' {
  return reducedMotion ? 'auto' : 'smooth'
}

/** One location, as useFocusTarget sees it. */
export interface FocusVisit {
  /** The location key of React Router. Each navigation gets a new key. */
  key: string
  pathname: string
  search: string
  /** focusElementId of the ?focus= value. */
  elementId: string | null
}

/** True when the page should scroll to the ?focus= target and focus it.
 * prev is the location of the last run, or null on the first run.
 * - The first visit, a new target and a new path always jump.
 * - A new navigation to the same target jumps (a link clicked again), but
 *   not when it replaces the URL with another search. That is a filter
 *   change on the page, for example the 「只看有資料根據」 toggle. React Router
 *   replaces the URL when a link points to the current URL, so a REPLACE
 *   with the same search is a link click. */
export function shouldFocusJump(
  prev: FocusVisit | null,
  next: FocusVisit,
  navigationType: 'PUSH' | 'REPLACE' | 'POP',
): boolean {
  if (next.elementId === null) return false
  if (prev === null) return true
  // A new target or path jumps first. A URL typed in the address bar has
  // no history state, so its key stays "default", like the first page.
  if (prev.pathname !== next.pathname || prev.elementId !== next.elementId) return true
  if (prev.key === next.key) return false
  return navigationType !== 'REPLACE' || prev.search === next.search
}
