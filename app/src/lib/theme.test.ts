import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { THEME_STORAGE_KEY, nextTheme, parseTheme, resolveTheme } from './theme'

describe('parseTheme', () => {
  it('accepts only "light" and "dark"', () => {
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('dark')).toBe('dark')
    for (const v of [null, undefined, '', 'Dark', 'system', 1]) expect(parseTheme(v)).toBeNull()
  })
})

describe('resolveTheme', () => {
  it('uses the saved choice first', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the system setting when nothing is saved', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })
})

describe('nextTheme', () => {
  it('switches between light and dark', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })
})

describe('index.html', () => {
  // The inline script sets the theme before the app loads, so there is no
  // flash of the wrong theme. It cannot import this module, so it repeats
  // the storage key and the class name.
  it('has an inline script that reads the same storage key and sets the dark class', () => {
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head).toContain(`'${THEME_STORAGE_KEY}'`)
    expect(head).toContain("prefers-color-scheme: dark")
    expect(head).toContain("classList.add('dark')")
    expect(head.indexOf('<script>')).toBeGreaterThan(-1)
  })
})
