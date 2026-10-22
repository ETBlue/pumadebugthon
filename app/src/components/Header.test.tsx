// The header nav (design 3.7, decision 120): 議題, 利害關係人, 空間, 解法,
// each with a count. The data hooks are mocked, so the header renders on the
// server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { Header } from './Header'

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: indexJson as IndexFile }),
  useCrossIssueOrNull: () => null,
}))

vi.mock('./ThemeToggle', () => ({ ThemeToggle: () => null }))

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Header container="" />
    </MemoryRouter>,
  )
}

/** The <a> of the nav item that goes to href. */
function link(html: string, href: string): string {
  const start = html.lastIndexOf('<a ', html.indexOf(`href="${href}"`))
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</a>', start))
}

describe('the header nav', () => {
  it('has 空間 13 between 利害關係人 and 解法', () => {
    const html = render('/')
    const nav = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'))
    const hrefs = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    expect(hrefs).toEqual(['/issues', '/stakeholders', '/spaces', '/solutions'])
    expect(link(html, '/spaces')).toContain('<span>空間</span><span class="font-semibold tabular-nums">13</span>')
  })

  it('makes 空間 active on #/spaces, as the current page', () => {
    const html = render('/spaces')
    expect(link(html, '/spaces')).toContain('aria-current="page"')
    expect(link(html, '/spaces')).toContain('font-semibold underline')
    expect(link(html, '/issues')).not.toContain('aria-current')
  })

  it('makes 空間 active on a space page, as a page under it', () => {
    const html = render('/spaces/sidewalk')
    expect(link(html, '/spaces')).toContain('aria-current="true"')
    expect(link(html, '/spaces')).toContain('font-semibold underline')
    expect(link(html, '/issues')).not.toContain('aria-current')
  })
})
