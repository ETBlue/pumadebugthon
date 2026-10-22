// The issue page with the five 分析摘要 topic tabs (ETBlue, 2026-10-22;
// design 3.2, decision 102). The data hooks and the page title are mocked,
// so the page renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile } from '@/types'
import Issue from './Issue'

const index = indexJson as IndexFile
const files: Record<string, IssueFile> = {
  [(treesJson as IssueFile).folder]: treesJson as IssueFile,
  [(trashcansJson as IssueFile).folder]: trashcansJson as IssueFile,
}

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssue: (folder: string) => ({ status: 'ready', data: files[folder] }),
}))

// PageTitle sets document.title in an effect. Here it writes the title into
// the HTML instead, so a test can read it.
vi.mock('@/components/PageTitle', async () => {
  const { pageTitle } = await import('@/lib/pageTitle')
  return {
    PageTitle: ({ parts = [] }: { parts?: (string | null | undefined)[] }) => <meta data-title={pageTitle(...parts)} />,
  }
})

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="issues/:number/:tab?" element={<Issue />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The accessible names of the tabs, in order. */
function tabNames(html: string): string[] {
  return [...html.matchAll(/role="tab"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
}

const titleOf = (html: string) => /data-title="([^"]*)"/.exec(html)?.[1]
const activeTab = (html: string) => /role="tab" aria-selected="true"[^>]*aria-label="([^"]+)"/.exec(html)?.[1]

describe('the issue page tabs', () => {
  it('has nine tabs: the five 分析摘要 topics after 解法, with their counts (#1)', () => {
    expect(tabNames(render('/issues/1'))).toEqual([
      '總覽', '訴求 50・衝突 9', '需求 31', '解法 5',
      '難以取捨的決定 5', '可能的爭議 5', '受影響較大的弱勢族群 4', '法規上的障礙 5', '相依與現行政策 6',
    ])
  })

  it('does not count the 【待補】 rows of 受影響較大的弱勢族群 (#2: 6 rows, 1 待補)', () => {
    expect(tabNames(render('/issues/2'))).toContain('受影響較大的弱勢族群 5')
  })

  it('opens a topic tab from its URL, with the tab name in the page title', () => {
    const html = render('/issues/1/disadvantaged')
    expect(activeTab(html)).toBe('受影響較大的弱勢族群 4')
    expect(titleOf(html)).toContain('受影響較大的弱勢族群')
    expect(titleOf(html)).toContain('#1')
  })

  it('shows every row of the topic, also the 【待補】 rows, with a dashed border', () => {
    const html = render('/issues/1/disadvantaged')
    expect(html).toContain('呼吸道疾病（尚未納入）')
    expect(html).toContain('外籍（尚未納入）')
    expect(html.match(/<li class="[^"]*border-dashed/g)).toHaveLength(2)
    expect(html).toContain('分析摘要不加入新的事實')
  })

  it('a topic tab has no stakeholder side menu; the 訴求 tab has one', () => {
    const menu = 'data-slot="collapsible"'
    for (const tab of ['decisions', 'controversies', 'disadvantaged', 'legal', 'dependencies']) {
      expect(render(`/issues/2/${tab}`), tab).not.toContain(menu)
    }
    expect(render('/issues/2/wants')).toContain(menu)
  })

  it('a reference link keeps 「只看有資料根據」 (?evidence=1)', () => {
    expect(render('/issues/2/controversies?evidence=1')).toContain('href="/issues/2/wants?focus=C9&amp;evidence=1"')
    expect(render('/issues/2/controversies')).toContain('href="/issues/2/wants?focus=C9"')
  })

  it('總覽 no longer shows the 分析摘要', () => {
    const html = render('/issues/1')
    expect(html).not.toContain('分析摘要')
    expect(html).not.toContain('呼吸道疾病（尚未納入）')
    expect(titleOf(html)).not.toContain('難以取捨')
  })

  it('an unknown tab shows 「找不到這個分頁。」', () => {
    const html = render('/issues/1/summary')
    expect(html).toContain('找不到這個分頁。')
    expect(activeTab(html)).toBeUndefined()
  })

  it('the tab list scrolls sideways below md and wraps from md', () => {
    const list = /role="tablist"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*role="tablist"/.exec(render('/issues/1'))
    const cls = (list?.[1] ?? list?.[2] ?? '').split(' ')
    expect(cls).toEqual(expect.arrayContaining(['flex-nowrap', 'overflow-x-auto', 'md:flex-wrap']))
  })
})
