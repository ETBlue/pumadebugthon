// The header nav (design 3.7, decisions 120 and 123): 議題, 利害關係人, 空間, 領域, 解法, 解法類型
// each with a count. The data hooks are mocked, so the header renders on the
// server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { Header, NAV_LIST_CLASS } from './Header'
import { PHONE_SCROLL_CLASS } from './PageTabs'

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
    expect(hrefs).toEqual(['/issues', '/stakeholders', '/spaces', '/domains', '/solutions', '/solution-types'])
    expect(link(html, '/spaces')).toContain('<span>空間</span><span class="font-semibold tabular-nums">13</span>')
  })

  it('has 領域 28 after 空間 and 解法類型 13 after 解法 (Task U3)', () => {
    const html = render('/')
    expect(link(html, '/domains')).toContain('<span>領域</span><span class="font-semibold tabular-nums">28</span>')
    expect(link(html, '/solution-types')).toContain('<span>解法類型</span><span class="font-semibold tabular-nums">13</span>')
  })

  it('makes 領域 and 解法類型 active on their list and detail pages', () => {
    expect(link(render('/domains'), '/domains')).toContain('aria-current="page"')
    expect(link(render('/domains/police/issues'), '/domains')).toContain('aria-current="true"')
    expect(link(render('/solution-types'), '/solution-types')).toContain('aria-current="page"')
    const detail = render('/solution-types/open-data')
    expect(link(detail, '/solution-types')).toContain('aria-current="true"')
    expect(link(detail, '/solutions')).not.toContain('aria-current')
  })

  it('makes 空間 active on #/spaces, as the current page', () => {
    const html = render('/spaces')
    expect(link(html, '/spaces')).toContain('aria-current="page"')
    expect(link(html, '/spaces')).toContain('font-semibold underline')
    expect(link(html, '/issues')).not.toContain('aria-current')
  })

  it('makes 空間 active on a space page, as a page under it', () => {
    const html = render('/spaces/sidewalk-furniture')
    expect(link(html, '/spaces')).toContain('aria-current="true"')
    expect(link(html, '/spaces')).toContain('font-semibold underline')
    expect(link(html, '/issues')).not.toContain('aria-current')
  })
})

// Decision 123: below md the nav is one row that scrolls sideways, like the
// issue page tab list (decision 102). From md it is the row of decision 120.
describe('the header layout', () => {
  /** The class attribute of the first tag that starts with open. */
  function classOf(html: string, open: string): string {
    const start = html.indexOf(open)
    expect(start).toBeGreaterThan(-1)
    const cls = html.slice(start, html.indexOf('>', start)).match(/class="([^"]*)"/)?.[1] ?? ''
    return cls.replaceAll('&amp;', '&')
  }

  it('makes the link list scroll sideways below md, with no up and down scroll', () => {
    const list = classOf(render('/'), '<ul')
    expect(list).toBe(NAV_LIST_CLASS)
    for (const c of PHONE_SCROLL_CLASS.split(' ')) expect(list.split(' ')).toContain(c)
    expect(list).toContain('flex-nowrap')
    expect(list).toContain('overflow-y-hidden')
    // Room for the focus outline inside the list, which clips top and bottom.
    expect(list.split(' ')).toContain('py-1')
  })

  it('undoes the scroll from md', () => {
    const list = classOf(render('/'), '<ul').split(' ')
    for (const c of ['md:mx-0', 'md:w-auto', 'md:px-0', 'md:py-0', 'md:flex-wrap', 'md:overflow-visible']) {
      expect(list).toContain(c)
    }
  })

  it('puts the nav on its own full-width row below md, and back in line from md', () => {
    const nav = classOf(render('/'), '<nav').split(' ')
    for (const c of ['order-last', 'basis-full', 'md:order-none', 'md:basis-auto', 'md:flex-1']) {
      expect(nav).toContain(c)
    }
  })

  it('keeps the keyboard order: app name, then the six links', () => {
    const html = render('/')
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
    expect(hrefs).toEqual(['/', '/issues', '/stakeholders', '/spaces', '/domains', '/solutions', '/solution-types'])
  })

  it('keeps each link on one line', () => {
    const html = render('/')
    for (const href of ['/issues', '/stakeholders', '/spaces', '/domains', '/solutions', '/solution-types']) {
      expect(link(html, href)).toContain('whitespace-nowrap')
    }
    expect(html.match(/<li class="flex-none">/g)).toHaveLength(6)
  })
})
