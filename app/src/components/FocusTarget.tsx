import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { FOCUS_PARAM, FOCUS_WAIT_MS, focusElementId, focusScrollBehavior } from '@/lib/focus'

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The ?focus= parameter (design 3.2, decision 53). Reads ?focus=<value>,
 * waits until the element "focus-<value>" is on the page (the tab content
 * may still be loading), then scrolls to it and moves keyboard focus to it.
 * With prefers-reduced-motion, the scroll has no animation. An unknown value
 * does nothing. It gives up after FOCUS_WAIT_MS.
 *
 * It runs again only when the path or the focus value changes. So turning
 * the 「只看有資料根據」 toggle does not jump back to the target.
 *
 * The target element needs tabIndex={-1} and focusTargetClass (styles.ts). */
export function useFocusTarget(): void {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const elementId = focusElementId(params.get(FOCUS_PARAM))

  useEffect(() => {
    if (elementId === null) return
    const go = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: focusScrollBehavior(prefersReducedMotion()), block: 'start' })
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
    }
    observer.observe(document.body, { childList: true, subtree: true })
    return stop
  }, [pathname, elementId])
}

/** The props for an element that ?focus=<key> can point to: its element ID
 * (focus-<key>) and tabIndex={-1}. An invalid key gets no ID. Add
 * focusTargetClass for the visible focus outline. */
export function focusTargetProps(key: string): { id?: string; tabIndex: -1 } {
  return { id: focusElementId(key) ?? undefined, tabIndex: -1 }
}
