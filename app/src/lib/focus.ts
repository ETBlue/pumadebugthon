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
