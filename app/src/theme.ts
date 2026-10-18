// The theme on the page: the .dark class on <html> (the tokens in index.css
// use it), the saved choice in localStorage, and a React hook for the toggle.
// The inline script in index.html sets the class first, before the app loads.
import { useSyncExternalStore } from 'react'
import { THEME_STORAGE_KEY, parseTheme, resolveTheme, type Theme } from '@/lib/theme'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

// Storage can fail (private window, blocked site data). The page then works
// without a saved choice.
function readSaved(): Theme | null {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

function save(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Keep the theme for this page only.
  }
}

function apply(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  listeners.forEach((l) => l())
}

/** Call once before the app renders. Without a saved choice, the theme
 * follows changes of the system setting. */
export function initTheme(): void {
  apply(resolveTheme(readSaved(), media().matches))
  media().addEventListener('change', (e) => {
    if (readSaved() === null) apply(e.matches ? 'dark' : 'light')
  })
}

function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The current theme, and a function that sets and saves the reader's choice. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme)
  return [
    theme,
    (next: Theme) => {
      save(next)
      apply(next)
    },
  ]
}
