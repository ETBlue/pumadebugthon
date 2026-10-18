// Light (Solarized Light) or dark (Solarized Dark) theme (design 3.10).
// Pure functions only. The DOM and storage code is in src/theme.ts.

export type Theme = 'light' | 'dark'

/** The localStorage key for the reader's choice. index.html repeats it in
 * its inline script. GitHub Pages shares one origin for all of the owner's
 * projects, so the key has the repo name in it. */
export const THEME_STORAGE_KEY = 'pumadebugthon-theme'

/** A saved value, or null when it is missing or not a theme. */
export function parseTheme(value: unknown): Theme | null {
  return value === 'light' || value === 'dark' ? value : null
}

/** The saved choice wins. With no saved choice, follow the system setting. */
export function resolveTheme(saved: Theme | null, systemDark: boolean): Theme {
  return saved ?? (systemDark ? 'dark' : 'light')
}

export function nextTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark'
}
