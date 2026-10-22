// The ListBar band (design 3.23.2, decision 106). The band is full width.
// Its controls sit in the page column (containerClass), so they line up
// with the header content.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LIST_STATE, PAGE_SORTS } from '@/lib/listParams'
import { ListBar } from './ListBar'
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

describe('listBodyClass', () => {
  it('uses the page column for the content under the band', () => {
    expect(listBodyClass).toContain(containerClass)
  })
})
