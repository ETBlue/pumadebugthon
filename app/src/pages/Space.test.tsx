// The tabs of the space page (design 3.6, decision 129).
// The data hooks and the page title are mocked, so the page renders on the
// server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { issuesBySpace } from '@/lib/spaces'
import type { IndexFile, IssueFile } from '@/types'
import Space from './Space'

const index = indexJson as IndexFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

const state: { issuesReady: boolean } = { issuesReady: true }

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  // Like the real hook: the files of the folders asked for.
  useIssues: (folders: string[]) =>
    state.issuesReady
      ? { status: 'ready', data: issueFiles.filter((f) => folders.some((x) => x.startsWith(`${f.number}-`))) }
      : { status: 'loading', message: '載入中…' },
}))

vi.mock('@/components/PageTitle', async () => {
  const { pageTitle } = await import('@/lib/pageTitle')
  return {
    PageTitle: ({ parts = [] }: { parts?: (string | null | undefined)[] }) => <meta data-title={pageTitle(...parts)} />,
  }
})

beforeEach(() => {
  state.issuesReady = true
})

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="spaces/:code/:tab?" element={<Space />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The accessible names of the tabs, in order. */
const tabNames = (html: string) => [...html.matchAll(/role="tab"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
const activeTab = (html: string) => /role="tab" aria-selected="true"[^>]*aria-label="([^"]+)"/.exec(html)?.[1]
const titleOf = (html: string) => /data-title="([^"]*)"/.exec(html)?.[1]
/** The links of the side menu. */
const menuLinks = (html: string) => {
  const nav = /<nav aria-label="空間內容"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? ''
  return [...nav.matchAll(/<a ([^>]*)>/g)].map((m) => m[1])
}

const sidewalkIssues = issuesBySpace(index, 'sidewalk').length

describe('the space page tabs (decision 129)', () => {
  it('has four tabs with counts: the same numbers as the card on #/spaces', () => {
    expect(sidewalkIssues).toBeGreaterThan(0)
    // 50 and 14: the numbers of the sidewalk card test in Spaces.test.tsx.
    expect(tabNames(render('/spaces/sidewalk'))).toEqual(['總覽', `議題 ${sidewalkIssues}`, '解法 14', '利害關係人 50'])
  })

  it('while the issues load, 議題 has its count and the others the name only', () => {
    state.issuesReady = false
    const html = render('/spaces/sidewalk/solutions')
    expect(tabNames(html)).toEqual(['總覽', `議題 ${sidewalkIssues}`, '解法', '利害關係人'])
    expect(html).toContain('載入中…')
  })

  it('an old link with no tab opens 總覽, with 分組, 說明 and the intro', () => {
    const html = render('/spaces/sidewalk')
    expect(activeTab(html)).toBe('總覽')
    expect(html).toContain('分組')
    expect(html).toContain('道路兩側供行人通行的空間。')
    expect(html).toContain('城市的空間有限')
    // The other groups are on their own tabs.
    expect(html).not.toContain('在多個議題都出現的利害關係人')
  })

  it('has a side menu: a nav with the tab links, the current one marked', () => {
    const links = menuLinks(render('/spaces/sidewalk/stakeholders?evidence=1&pick=W08'))
    expect(links).toHaveLength(4)
    // The same URLs as the tabs: ?evidence= is kept, ?pick= is dropped.
    expect(links[0]).toContain('href="/spaces/sidewalk?evidence=1"')
    expect(links[1]).toContain('href="/spaces/sidewalk/issues?evidence=1"')
    expect(links[2]).toContain('href="/spaces/sidewalk/solutions?evidence=1"')
    expect(links[3]).toContain('href="/spaces/sidewalk/stakeholders?evidence=1"')
    expect(links.filter((a) => a.includes('aria-current="page"'))).toEqual([links[3]])
  })

  it('shows one content group per tab, with the old heading as the hidden h2', () => {
    const issues = render('/spaces/sidewalk/issues')
    expect(issues).toContain('<h2 class="sr-only">使用這個空間的議題</h2>')
    expect(issues).not.toContain('分組')
    expect([...issues.matchAll(/<article/g)]).toHaveLength(sidewalkIssues)

    const solutions = render('/spaces/sidewalk/solutions')
    expect(solutions).toContain('<h2 class="sr-only">使用這個空間的解法</h2>')
    expect(solutions).toContain('id="space-solutions-2"')
    expect(solutions).not.toContain('在多個議題都出現的利害關係人')

    const people = render('/spaces/sidewalk/stakeholders')
    expect(people).toContain('<h2 class="sr-only">相關的利害關係人</h2>')
    expect(people).toContain('>在多個議題都出現的利害關係人</h3>')
    expect(people).toContain('>各議題的利害關係人</h3>')
    expect(people).not.toContain('id="space-solutions-2"')
  })

  it('adds the tab name to the page title, but not for 總覽', () => {
    expect(titleOf(render('/spaces/sidewalk'))).toMatch(/^人行道/)
    expect(titleOf(render('/spaces/sidewalk'))).not.toContain('總覽')
    expect(titleOf(render('/spaces/sidewalk/solutions'))).toMatch(/^人行道.*解法/)
  })

  it('keeps the band with the back button and the h1 on every tab', () => {
    for (const tab of ['', '/issues', '/solutions', '/stakeholders']) {
      expect(render(`/spaces/sidewalk${tab}`)).toMatch(/<a [^>]*href="\/spaces"[^>]*>[\s\S]*?回到空間列表<\/span><\/a><h1[^>]*>人行道/)
    }
  })

  it('an unknown tab shows 「找不到這個分頁。」 and a link to 總覽', () => {
    const html = render('/spaces/sidewalk/people')
    expect(html).toContain('找不到這個分頁。')
    expect(html).toMatch(/href="\/spaces\/sidewalk"[^>]*>回到總覽/)
    expect(activeTab(html)).toBeUndefined()
  })

  it('a space that no issue uses has 0 counts and the empty texts', () => {
    const unused = index.spaceTypes.find((s) => issuesBySpace(index, s.code).length === 0)
    expect(unused).toBeDefined()
    const code = unused!.code
    expect(tabNames(render(`/spaces/${code}`))).toEqual(['總覽', '議題 0', '解法 0', '利害關係人 0'])
    expect(render(`/spaces/${code}/issues`)).toContain('目前沒有已完成分析的議題使用這個空間類型。')
    expect(render(`/spaces/${code}/solutions`)).toContain('目前沒有解法使用這個空間類型。')
    expect(render(`/spaces/${code}/stakeholders`)).toContain('目前沒有相關的利害關係人。')
  })

  it('has the same phone tab list as the issue page: one row that scrolls sideways', () => {
    const list = /role="tablist"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*role="tablist"/.exec(render('/spaces/sidewalk'))
    const cls = (list?.[1] ?? list?.[2] ?? '').split(' ')
    expect(cls).toEqual(expect.arrayContaining(['flex-nowrap', 'overflow-x-auto', 'md:hidden']))
  })
})
