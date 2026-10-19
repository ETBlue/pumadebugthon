import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import { FOCUS_JUMP_ATTRIBUTE, FOCUS_PARAM, FOCUS_WAIT_MS, focusElementId, focusScrollBehavior, shouldFocusJump, type FocusVisit } from '@/lib/focus'

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The ?focus= parameter (design 3.2, decision 53). Reads ?focus=<value>,
 * waits until the element "focus-<value>" is on the page (the tab content
 * may still be loading), then scrolls to it and moves keyboard focus to it.
 * With prefers-reduced-motion, the scroll has no animation. An unknown value
 * does nothing. It gives up after FOCUS_WAIT_MS.
 *
 * When it jumps is decided by shouldFocusJump (src/lib/focus.ts): a new
 * target, a new path, or a link to the same target clicked again. Turning
 * the 「只看有資料根據」 toggle (it replaces the URL with another search) does
 * not jump back to the target.
 *
 * The target element needs tabIndex={-1} and focusTargetClass (styles.ts).
 * It gets FOCUS_JUMP_ATTRIBUTE until it loses focus, so only a jump shows
 * the outline, not a mouse click inside it. */
export function useFocusTarget(): void {
  const location = useLocation()
  const navigationType = useNavigationType()
  const elementId = focusElementId(new URLSearchParams(location.search).get(FOCUS_PARAM))
  const last = useRef<FocusVisit | null>(null)
  // The wait for an element that is not on the page yet. A new jump stops
  // it. A navigation that does not jump (the toggle) lets it go on.
  const stopWaiting = useRef<(() => void) | null>(null)

  useEffect(() => {
    const visit: FocusVisit = { key: location.key, pathname: location.pathname, search: location.search, elementId }
    const jump = shouldFocusJump(last.current, visit, navigationType)
    last.current = visit
    if (!jump || elementId === null) return
    stopWaiting.current?.()
    stopWaiting.current = null

    const go = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: focusScrollBehavior(prefersReducedMotion()), block: 'start' })
      // Mark the element, so it shows the focus outline (focusTargetClass).
      // The mark goes away when the focus leaves it.
      el.setAttribute(FOCUS_JUMP_ATTRIBUTE, '')
      el.addEventListener('blur', () => el.removeAttribute(FOCUS_JUMP_ATTRIBUTE), { once: true })
      el.focus({ preventScroll: true })
    }
    const now = document.getElementById(elementId)
    if (now) {
      go(now)
      return
    }
    // Not on the page yet: watch the page until it appears.
    const observer = new MutationObserver(() => {
      const el = document.getElementById(elementId)
      if (el) {
        stop()
        go(el)
      }
    })
    const timer = window.setTimeout(() => stop(), FOCUS_WAIT_MS)
    function stop() {
      observer.disconnect()
      window.clearTimeout(timer)
      if (stopWaiting.current === stop) stopWaiting.current = null
    }
    observer.observe(document.body, { childList: true, subtree: true })
    stopWaiting.current = stop
  }, [location.key, location.pathname, location.search, elementId, navigationType])

  // Stop the wait when the page goes away.
  useEffect(() => () => stopWaiting.current?.(), [])
}

/** The props for an element that ?focus=<key> can point to: its element ID
 * (focus-<key>) and tabIndex={-1}. An invalid key gets no ID. Add
 * focusTargetClass for the visible focus outline. */
export function focusTargetProps(key: string): { id?: string; tabIndex: -1 } {
  return { id: focusElementId(key) ?? undefined, tabIndex: -1 }
}
