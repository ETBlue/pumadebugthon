// The ListBar band (design 3.23.2, decision 106). The band is full width.
// Its controls sit in the page column (containerClass), so they line up
// with the header content.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { t } from '@/i18n/zh-TW'
import { DEFAULT_LIST_STATE, PAGE_SORTS } from '@/lib/listParams'
import { ListBar, type ListBarFilter } from './ListBar'
import { containerClass, listBodyClass } from './styles'

function bar() {
  return renderToStaticMarkup(
    <ListBar
      page="issues"
      state={{ ...DEFAULT_LIST_STATE, issues: [], spaces: [] }}
      sorts={PAGE_SORTS.issues}
      filters={[]}
      onNavigate={() => {}}
    />,
  )
}

/** The class attribute of the first element with this tag. */
function classOf(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*class="([^"]*)"`))
  return m ? m[1] : ''
}

describe('ListBar band', () => {
  it('is a full-width band with the muted background and a bottom border', () => {
    const cls = classOf(bar(), 'section').split(' ')
    expect(cls).toEqual(expect.arrayContaining(['border-b', 'bg-muted']))
    // No page column, no rounded box and no side padding on the band itself.
    expect(cls).not.toContain('mx-auto')
    expect(cls.some((c) => c.startsWith('max-w-'))).toBe(false)
    expect(cls.some((c) => c.startsWith('rounded'))).toBe(false)
    expect(cls.some((c) => /^p[xl]-/.test(c))).toBe(false)
  })

  it('puts the controls in the page column, the same as the header', () => {
    const html = bar()
    const inner = html.slice(html.indexOf('>') + 1)
    expect(classOf(inner, 'div')).toContain(containerClass)
  })
})

// The order of the bar (decision 114): sort, filters, view switch, then the
// search box. The DOM order is the keyboard order, so the test reads the
// order of the controls in the markup.
const STATE = { ...DEFAULT_LIST_STATE, issues: [], spaces: [] }
const FILTERS: ListBarFilter[] = [
  { kind: 'choices', key: 'issue', label: '議題', options: [{ value: '1', label: '#1' }], value: [], next: () => STATE },
  { kind: 'toggle', key: 'special', label: '只看特別關注族群', pressed: false, next: () => STATE },
]

function fullBar(page: 'issues' | 'stakeholders', viewSwitch: boolean, view: 'cards' | 'tree' = 'cards') {
  return renderToStaticMarkup(
    <ListBar
      page={page}
      state={{ ...STATE, view }}
      sorts={PAGE_SORTS[page]}
      filters={FILTERS}
      viewSwitch={viewSwitch}
      onNavigate={() => {}}
    />,
  )
}

/** The place of a piece of markup. Fails when it is not there. */
function at(html: string, part: string): number {
  const i = html.indexOf(part)
  expect(i, part).toBeGreaterThanOrEqual(0)
  return i
}

describe('ListBar order', () => {
  it('puts the search box after the sort and the filters', () => {
    const html = fullBar('issues', false)
    const search = at(html, 'role="search"')
    expect(at(html, '<select')).toBeLessThan(search)
    expect(at(html, '議題')).toBeLessThan(search)
    expect(at(html, '只看特別關注族群')).toBeLessThan(search)
  })

  it('puts the search box after the view switch on #/stakeholders', () => {
    const html = fullBar('stakeholders', true)
    const search = at(html, 'role="search"')
    const view = at(html, `aria-label="${t.listBar.view}"`)
    expect(at(html, '<select')).toBeLessThan(view)
    expect(at(html, '只看特別關注族群')).toBeLessThan(view)
    expect(view).toBeLessThan(search)
  })

  it('pushes the search box to the right end of the row from md', () => {
    expect(classOf(fullBar('issues', false), 'div role="search"')).toContain('md:ml-auto')
  })

  it('keeps the tree note as the last line, after the search box', () => {
    const html = fullBar('stakeholders', true, 'tree')
    expect(at(html, 'role="search"')).toBeLessThan(at(html, t.listBar.treeSortNote))
  })
})

describe('listBodyClass', () => {
  it('uses the page column for the content under the band', () => {
    expect(listBodyClass).toContain(containerClass)
  })
})
