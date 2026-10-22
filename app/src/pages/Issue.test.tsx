// The issue page with the five 分析摘要 topic tabs (ETBlue, 2026-10-22;
// design 3.2, decision 102). The data hooks and the page title are mocked,
// so the page renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile } from '@/types'
import Issue from './Issue'

const index = indexJson as IndexFile
const files: Record<string, IssueFile> = {
  [(treesJson as IssueFile).folder]: treesJson as IssueFile,
  [(trashcansJson as IssueFile).folder]: trashcansJson as IssueFile,
  [(smokefreeJson as IssueFile).folder]: smokefreeJson as IssueFile,
  [(policyJson as IssueFile).folder]: policyJson as IssueFile,
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
      '難以取捨 5', '可能爭議 5', '影響到弱勢 4', '法規障礙 5', '相關解法與政策 6',
    ])
  })

  it('does not count the 【待補】 rows of 受影響較大的弱勢族群 (#2: 6 rows, 1 待補)', () => {
    expect(tabNames(render('/issues/2'))).toContain('影響到弱勢 5')
  })

  it('opens a topic tab from its URL, with the tab name in the page title', () => {
    const html = render('/issues/1/disadvantaged')
    expect(activeTab(html)).toBe('影響到弱勢 4')
    expect(titleOf(html)).toContain('影響到弱勢')
    // The hidden h2 of the tab keeps the full name of the topic.
    expect(html).toContain('<h2 class="sr-only">受影響較大的弱勢族群</h2>')
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
    // 參與式預算 is tagged [實證], so the filter keeps it.
    expect(render('/issues/9/dependencies?evidence=1')).toContain('href="/issues/9/wants?focus=C3&amp;evidence=1"')
    expect(render('/issues/9/dependencies')).toContain('href="/issues/9/wants?focus=C3"')
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

  it('on a phone the scrolling tab list is as wide as the screen and never scrolls up and down', () => {
    const html = render('/issues/1')
    const list = /role="tablist"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*role="tablist"/.exec(html)
    const cls = (list?.[1] ?? list?.[2] ?? '').split(' ')
    // -mx-4 cancels the px-4 of the page column; px-4 inside keeps the first tab in line.
    expect(cls).toEqual(expect.arrayContaining(['-mx-4', 'w-[calc(100%+2rem)]', 'px-4', 'overflow-y-hidden', 'md:mx-0']))
    // A label is one line in the scrolling list, so a tab is never taller than the others.
    const triggers = [...html.matchAll(/role="tab"[^>]*class="([^"]*)"/g)].map((m) => m[1])
    expect(triggers.every((c) => c.split(' ').includes('whitespace-nowrap'))).toBe(true)
  })
})

/** The row names of a topic tab, in order. */
function rowNames(html: string): string[] {
  const list = /<ul aria-label="[^"]*"[^>]*>([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? ''
  return [...list.matchAll(/<p class="font-medium">([^<]*)<\/p>/g)].map((m) => m[1])
}

describe('「只看有資料根據」 on the 分析摘要 tabs (decision 108)', () => {
  it('has the toggle above the rows, with the same label and hint, off by default', () => {
    const html = render('/issues/2/decisions')
    expect(html).toContain('只看有資料根據')
    expect(html).toContain('顯示標記 [實證] 或 [AI整理] 的內容。')
    expect(html).toMatch(/aria-pressed="false"/)
    expect(html.indexOf('只看有資料根據')).toBeLessThan(html.indexOf('<ul aria-label='))
    expect(html).not.toContain('清除篩選')
  })

  it('shows every row when the filter is off', () => {
    expect(rowNames(render('/issues/9/dependencies'))).toHaveLength(5)
    expect(rowNames(render('/issues/8/disadvantaged'))).toHaveLength(6)
  })

  it('hides the [AI模擬] rows and keeps the [實證] and [AI整理] rows', () => {
    const html = render('/issues/8/disadvantaged?evidence=1')
    expect(html).toMatch(/aria-pressed="true"/)
    // [AI整理] rows.
    expect(rowNames(html)).toEqual(['呼吸道疾病', '兒童與照顧者'])
    // A [實證] row next to [AI模擬] rows.
    expect(rowNames(render('/issues/9/legal?evidence=1'))).toEqual(['行政院的生成式 AI 參考指引'])
  })

  it('hides the 【待補】 rows too, as other lists hide items with no data-based tag', () => {
    const html = render('/issues/9/disadvantaged?evidence=1')
    expect(rowNames(html)).toEqual(['外籍'])
    expect(html).not.toContain('border-dashed')
  })

  it('shows the status line with the shown rows and 「清除篩選」', () => {
    const html = render('/issues/9/legal?evidence=1')
    expect(html).toContain('篩選：只看有資料根據。顯示 1 項。')
    expect(html).toMatch(/href="\/issues\/9\/legal"[^>]*>清除篩選<\/a>/)
  })

  it('shows a short note when the filter hides every row', () => {
    for (const path of ['/issues/2/decisions?evidence=1', '/issues/1/disadvantaged?evidence=1']) {
      const html = render(path)
      expect(html, path).toContain('這裡沒有說明標記 [實證] 或 [AI整理] 的項目。')
      expect(rowNames(html), path).toEqual([])
      expect(html, path).toContain('顯示 0 項。')
    }
  })

  it('does not change the tab counts (they are totals, decision 49)', () => {
    expect(tabNames(render('/issues/1/disadvantaged?evidence=1'))).toEqual(tabNames(render('/issues/1/disadvantaged')))
    expect(tabNames(render('/issues/2/decisions?evidence=1'))).toContain('難以取捨 4')
  })
})
