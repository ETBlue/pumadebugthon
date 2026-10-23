// The solution page with its seven tabs (ETBlue, 2026-10-22; design 3.12,
// decision 103). The data hooks and the page title are mocked, so the page
// renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import { t } from '@/i18n/zh-TW'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import Solution from './Solution'

const index = indexJson as IndexFile
const cross = crossJson as CrossIssueFile
const files: Record<string, IssueFile> = Object.fromEntries(
  [treesJson, trashcansJson, smokefreeJson].map((f) => [(f as IssueFile).folder, f as IssueFile]),
)

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssue: (folder: string) => ({ status: 'ready', data: files[folder] }),
  useIssues: (folders: string[]) => ({ status: 'ready', data: folders.flatMap((f) => files[f] ?? []) }),
  useCrossIssue: () => ({ status: 'ready', data: cross }),
  useCrossIssueOrNull: () => cross,
}))

// PageTitle writes the title into the HTML, so a test can read it.
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
        <Route path="solutions/:slug/:tab?" element={<Solution />} />
      </Routes>
    </MemoryRouter>,
  )
}

const tabNames = (html: string) => [...html.matchAll(/role="tab"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
const titleOf = (html: string) => /data-title="([^"]*)"/.exec(html)?.[1]
const activeTab = (html: string) => /role="tab" aria-selected="true"[^>]*aria-label="([^"]+)"/.exec(html)?.[1]

describe('the solution page tabs (decision 103)', () => {
  it('has seven tabs in order, with their counts (#2 A)', () => {
    expect(tabNames(render('/solutions/2-A'))).toEqual([
      '總覽', '需求　涵蓋 9・未涵蓋 13', '訴求　涵蓋 28・未涵蓋 25', '利害關係人　涵蓋 14・未涵蓋 13',
      '衝突　解開 5・相關 3', '成效衡量 4', '相關政策　國內 2・國外 2',
    ])
  })

  it('opens each tab from its URL, with the tab name in the page title', () => {
    const cases: [string, string, string][] = [
      ['wants', '訴求　涵蓋 28・未涵蓋 25', '訴求'],
      ['conflicts', '衝突　解開 5・相關 3', '衝突'],
      ['measures', '成效衡量 4', '成效衡量'],
      ['policies', '相關政策　國內 2・國外 2', '相關政策'],
    ]
    for (const [tab, label, title] of cases) {
      const html = render(`/solutions/2-A/${tab}`)
      expect(activeTab(html), tab).toBe(label)
      expect(titleOf(html), tab).toMatch(new RegExp(`^#2 A .+ · ${title} · 解法 · 市政提案小幫手$`))
      // The same band on every tab: the back button, and no breadcrumb (decision 111).
      expect(html, tab).toContain('href="/solutions"')
      expect(html, tab).not.toContain('aria-label="頁面位置"')
    }
  })

  it('an unknown tab shows 「找不到這個分頁。」', () => {
    const html = render('/solutions/2-A/practices')
    expect(html).toContain('找不到這個分頁。')
    expect(activeTab(html)).toBeUndefined()
  })

  it('the tab list scrolls sideways on a phone, as on the issue page', () => {
    const list = /role="tablist"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*role="tablist"/.exec(render('/solutions/2-A'))
    const cls = (list?.[1] ?? list?.[2] ?? '').split(' ')
    expect(cls).toEqual(expect.arrayContaining(['flex-nowrap', 'overflow-x-auto']))
  })

  it('總覽 keeps step 7, but not the conflicts, the groups or the measures', () => {
    const html = render('/solutions/2-A')
    expect(html).toContain('資源、法規、隱私與風險')
    expect(html).not.toContain('id="solution-way-out"')
    expect(html).not.toContain('id="solution-conflicts"')
    expect(html).not.toContain('id="solution-groups"')
    expect(html).not.toContain('目前數值（基準值）')
  })

  it('訴求 has the groups and the two want lists', () => {
    const html = render('/solutions/2-A/wants')
    expect(html).toContain('涵蓋的相同訴求群組')
    expect(html).toContain('涵蓋的訴求')
    expect(html).toContain('未涵蓋的訴求')
    // A story ID links to its story page.
    expect(html).toMatch(/href="\/stakeholders\/[^"]+\/stories\/2\//)
  })

  it('訴求 follows 只看有資料根據: only wants with a [實證] or [AI整理] 我想要… cell', () => {
    const trashcans = trashcansJson as IssueFile
    const simulated = trashcans.stories.find((s) => s.want.tag === 'AI模擬')!
    const link = `/stories/2/${simulated.id}"`
    expect(render('/solutions/2-A/wants')).toContain(link)
    expect(render('/solutions/2-A/wants?evidence=1')).not.toContain(link)
  })

  it('衝突 has 解開的衝突 and 相關的衝突', () => {
    const html = render('/solutions/2-A/conflicts')
    expect(html).toContain('id="solution-way-out"')
    expect(html).toContain('id="solution-conflicts"')
  })

  it('相關政策 shows 國內 and 國外; a dependency row links to the issue tab', () => {
    const html = render('/solutions/2-A/policies')
    expect(html).toContain('國內 2')
    expect(html).toContain('國外 2')
    expect(html).toContain('本文件怎麼用')
    const trashcans = trashcansJson as IssueFile
    const a = trashcans.solutions.find((s) => s.id === 'A')!
    if (a.practices.some((p) => p.source === 'dependency')) {
      expect(html).toContain('href="/issues/2/dependencies"')
    }
  })

  it('相關政策 has an empty state (#8 E has no practices)', () => {
    const html = render('/solutions/8-E/policies')
    expect(tabNames(html)).toContain('相關政策　國內 0・國外 0')
    expect(html).toContain('分析裡沒有和這個解法相關或類似的政策與做法。')
  })
})

describe('the cross-issue solution page tabs (decision 103)', () => {
  it('has the same seven tabs (X-A)', () => {
    expect(tabNames(render('/solutions/X-A'))).toEqual([
      '總覽', '需求　涵蓋 17・未涵蓋 60', '訴求　涵蓋 44・未涵蓋 123', '利害關係人　涵蓋 21・未涵蓋 30',
      '衝突　解開 1・相關 1', '成效衡量 4', '相關政策　國內 2・國外 0',
    ])
  })

  it('moves 解開的衝突 and 成效衡量 out of 總覽', () => {
    const html = render('/solutions/X-A')
    expect(html).not.toContain('id="cross-way-out"')
    expect(html).not.toContain('新指標')
    expect(render('/solutions/X-A/conflicts')).toContain('id="cross-way-out"')
  })

  it('a dependency row of a cross-issue solution has no link: its topic has no page', () => {
    const html = render('/solutions/X-A/policies')
    expect(html).toContain('跨議題分析的分析摘要')
    expect(html).not.toContain('/dependencies"')
  })
})

describe('the dates in the metadata of 總覽 (decision 131)', () => {
  const field = (label: string, date: string) => `${label}</dt><dd><time dateTime="${date}">${date}</time>`

  it('an issue solution shows 新增日期 and 更新日期', () => {
    const sol = files['2-trashcans'].solutions.find((s) => s.id === 'A')!
    const html = render('/solutions/2-A')
    expect(html).toContain(field(t.dates.added, sol.added))
    expect(html).toContain(field(t.dates.updated, sol.updated!))
  })

  it('a cross-issue solution shows 新增日期 and 更新日期', () => {
    const sol = cross.solutions.find((s) => s.code === 'X-A')!
    const html = render('/solutions/X-A')
    expect(html).toContain(field(t.dates.added, sol.added))
    expect(html).toContain(field(t.dates.updated, sol.updated!))
  })

  it('the other tabs have no 新增日期', () => {
    expect(render('/solutions/2-A/needs')).not.toContain(t.dates.added)
  })
})

describe('items that are not entities are in article style (decision 137)', () => {
  const CARD = 'rounded-md border p-3'
  const listItems = (html: string, from: string) => html.slice(html.indexOf(from)).match(/<li[^>]*>/g) ?? []

  it('成效衡量: each row is an h3 with no card box (issue and cross-issue)', () => {
    for (const path of ['/solutions/2-A/measures', '/solutions/X-A/measures']) {
      const html = render(path)
      expect(html, path).toContain('<ul class="space-y-6"><li class="min-w-0"><h3 class="text-lg font-semibold">')
      expect(html, path).not.toContain(CARD)
    }
  })

  it('相關政策: each item is an h4 with no card box, inside the two columns', () => {
    for (const path of ['/solutions/2-A/policies', '/solutions/X-A/policies']) {
      const html = render(path)
      expect(html, path).not.toContain(CARD)
      expect(html, path).toMatch(/<li class="min-w-0[^"]*"><h4 class="text-lg font-semibold text-foreground">/)
    }
  })

  it('總覽: the 概覽 block and the ideas have no card box (#2 B has 2 ideas)', () => {
    const html = render('/solutions/2-B')
    expect(html).toContain('aria-labelledby="solution-overview" class="mt-6"')
    const ideas = files['2-trashcans'].solutions.find((s) => s.id === 'B')!.ideas
    expect(ideas).toHaveLength(2)
    const items = listItems(html, 'id="solution-ideas"').slice(0, 2)
    expect(items).toHaveLength(2)
    for (const li of items) expect(li).toMatch(/^<li class="min-w-0( text-muted-foreground)?">$/)
    expect(html.slice(html.indexOf('id="solution-ideas"'))).toContain('<h4 class="text-lg font-semibold text-foreground">')
  })

  it('cross-issue 總覽: the 特別關注族群 rows have no card box; the merged solutions keep their cards', () => {
    const html = render('/solutions/X-A')
    const focus = html.slice(html.indexOf('id="cross-focus"'), html.indexOf('id="cross-detail"'))
    expect(focus).not.toContain(CARD)
    const parts = html.slice(html.indexOf('id="cross-parts"'), html.indexOf('id="cross-focus"'))
    expect(parts).toContain(CARD)
  })
})

describe('two columns side by side from lg (decision 136)', () => {
  const COLS = 'class="grid gap-10 *:min-w-0 lg:grid-cols-2 lg:gap-8"'
  // The heading IDs of the sections after each two-column grid starts, in
  // page order. aria-labelledby can list outer headings first, so take the last ID.
  const columnPairs = (html: string) =>
    html.split(COLS).slice(1).map((chunk) =>
      [...chunk.matchAll(/<section aria-labelledby="([^"]+)"/g)].map((m) => m[1].split(' ').at(-1)!))

  it('需求: 涵蓋的需求 first, then 未涵蓋的需求, in one grid', () => {
    const pairs = columnPairs(render('/solutions/2-A/needs'))
    expect(pairs).toHaveLength(1)
    expect(pairs[0][0]).toBe('solution-needs-covered')
    expect(pairs[0].indexOf('solution-needs-not-covered')).toBeGreaterThan(0)
  })

  it('訴求: the two want lists in one grid; 涵蓋的相同訴求群組 stays above it, full width', () => {
    const html = render('/solutions/2-A/wants')
    const pairs = columnPairs(html)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].slice(0, 2)).toEqual(['solution-wants-covered', 'solution-wants-not-covered'])
    expect(html.indexOf('id="solution-groups"')).toBeLessThan(html.indexOf(COLS))
  })

  it('利害關係人: the two parts in one grid, with one card per row inside each part', () => {
    const html = render('/solutions/2-A/stakeholders')
    const chunks = html.split(COLS)
    expect(chunks).toHaveLength(2)
    expect(chunks[1].indexOf('id="solution-stakeholders-covered"'))
      .toBeLessThan(chunks[1].indexOf('id="solution-stakeholders-not-covered"'))
    // The card list is no longer a 2-column grid inside the half.
    expect(html).not.toContain('grid gap-3 lg:grid-cols-2')
  })

  it('相關政策: 國內 first, then 國外, in one grid', () => {
    const pairs = columnPairs(render('/solutions/2-A/policies'))
    expect(pairs).toHaveLength(1)
    expect(pairs[0].slice(0, 2)).toEqual(['policies-domestic', 'policies-foreign'])
  })

  it('cross-issue 需求 and 訴求: one grid per issue in parts, none for an issue not in parts (X-E)', () => {
    // X-E has parts in #2 and #8. Its group X-N03 covers #1 N15, so #1 shows
    // only its covered part, at full width.
    const needs = render('/solutions/X-E/needs')
    expect(columnPairs(needs).map((p) => p[0])).toEqual(['cross-needs-2-covered', 'cross-needs-8-covered'])
    expect(needs).toContain('id="cross-needs-1-covered"')
    expect(needs).not.toContain('id="cross-needs-1-not-covered"')
    const wants = render('/solutions/X-E/wants')
    expect(columnPairs(wants).map((p) => p[0])).toEqual(['cross-wants-2-covered', 'cross-wants-8-covered'])
    expect(wants).toContain('id="cross-wants-1-covered"')
  })

  it('cross-issue 利害關係人 and 相關政策 also have the two columns (X-A)', () => {
    expect(render('/solutions/X-A/stakeholders').split(COLS)).toHaveLength(2)
    expect(columnPairs(render('/solutions/X-A/policies'))[0].slice(0, 2)).toEqual(['policies-domestic', 'policies-foreign'])
  })
})
