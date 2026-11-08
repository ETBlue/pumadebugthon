// The solution page with its eleven tabs (ETBlue, 2026-10-22 to 2026-10-24;
// design 3.12, decisions 103, 140 and 143). The data hooks and the page title are mocked, so the page
// renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import newFormatJson from '@/test/fixtures/new-format-2-S1.json'
import { GanttView, ganttState } from '@/components/solution/Schedule'
import { METHOD_URL } from '@/components/links'
import { t } from '@/i18n/zh-TW'
import { crossIssueNumbers } from '@/lib/crossIssue'
import { stripMarkdown } from '@/lib/markdown'
import type { CrossIssueFile, IndexFile, IssueFile, Solution as SolutionData } from '@/types'
import Solution from './Solution'

const index = indexJson as IndexFile
const cross = crossJson as CrossIssueFile
const files: Record<string, IssueFile> = Object.fromEntries(
  [treesJson, trashcansJson, smokefreeJson].map((f) => [(f as IssueFile).folder, f as IssueFile]),
)

// crossLoading: true makes useCrossIssue return the loading state.
const mockState = vi.hoisted(() => ({ crossLoading: false }))

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssue: (folder: string) => ({ status: 'ready', data: files[folder] }),
  useIssues: (folders: string[]) => ({ status: 'ready', data: folders.flatMap((f) => files[f] ?? []) }),
  useCrossIssue: () => (mockState.crossLoading ? { status: 'loading', message: '載入中' } : { status: 'ready', data: cross }),
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
  it('has twelve tabs in order, with their counts (#2 S1); 利害關係人, 訴求, 需求, 衝突 in the order of the issue page (decision 142); 潛在風險 after 成效衡量 (decision 143); 可能合併 last (Task U6)', () => {
    expect(tabNames(render('/solutions/2-S1'))).toEqual([
      '總覽', '利害關係人　涵蓋 14・未涵蓋 13', '訴求　涵蓋 28・未涵蓋 25', '需求　滿足 9・未滿足 13',
      '衝突　解開 5・相關 3', '執行計畫', '成效衡量 4', '潛在風險 2', '可能爭議 2', '法規障礙 2', '相關政策　國內 2・國外 2',
      '可能合併 1',
    ])
  })

  it('opens each tab from its URL, with the tab name in the page title', () => {
    const cases: [string, string, string][] = [
      ['wants', '訴求　涵蓋 28・未涵蓋 25', '訴求'],
      ['conflicts', '衝突　解開 5・相關 3', '衝突'],
      ['risks', '潛在風險 2', '潛在風險'],
      ['controversies', '可能爭議 2', '可能爭議'],
      ['legal', '法規障礙 2', '法規障礙'],
      ['plan', '執行計畫', '執行計畫'],
      ['measures', '成效衡量 4', '成效衡量'],
      ['policies', '相關政策　國內 2・國外 2', '相關政策'],
    ]
    for (const [tab, label, title] of cases) {
      const html = render(`/solutions/2-S1/${tab}`)
      expect(activeTab(html), tab).toBe(label)
      expect(titleOf(html), tab).toMatch(new RegExp(`^#2 S1 .+ · ${title} · 解法 · 市政提案小幫手$`))
      // The same band on every tab: the back button, and no breadcrumb (decision 111).
      expect(html, tab).toContain('href="/solutions"')
      expect(html, tab).not.toContain('aria-label="頁面位置"')
    }
  })

  it('an unknown tab shows 「找不到這個分頁。」', () => {
    const html = render('/solutions/2-S1/practices')
    expect(html).toContain('找不到這個分頁。')
    expect(activeTab(html)).toBeUndefined()
  })

  it('the tab list scrolls sideways on a phone, as on the issue page', () => {
    const list = /role="tablist"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*role="tablist"/.exec(render('/solutions/2-S1'))
    const cls = (list?.[1] ?? list?.[2] ?? '').split(' ')
    expect(cls).toEqual(expect.arrayContaining(['flex-nowrap', 'overflow-x-auto']))
  })

  it('總覽 keeps the 概覽 block, but not the other step 7 rows, the conflicts, the groups or the measures', () => {
    const html = render('/solutions/2-S1')
    expect(html).toContain('>概覽</h3>')
    for (const label of ['成本', '可行性', '主要風險', '主責單位']) expect(html, label).toContain(`>${label}</dt>`)
    // The rest of step 7 moved to 執行計畫, 潛在風險, 可能爭議 and 法規障礙
    // (decisions 140 and 143).
    expect(html).not.toContain('資源、法規、隱私與風險')
    // (相關法規 can still be the context of a 待補 item.)
    for (const label of ['相關法規', '隱私', '其他顧慮與風險', '災害風險', '需要的資料／API／資源', '執行步驟']) {
      expect(html, label).not.toContain(`>${label}</dt>`)
      expect(html, label).not.toContain(`>${label}</h3>`)
      expect(html, label).not.toContain(`>${label}</h4>`)
    }
    expect(html).not.toContain('id="solution-way-out"')
    expect(html).not.toContain('id="solution-conflicts"')
    expect(html).not.toContain('id="solution-groups"')
    expect(html).not.toContain('目前數值（基準值）')
  })

  it('訴求 has the groups and the two want lists', () => {
    const html = render('/solutions/2-S1/wants')
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
    expect(render('/solutions/2-S1/wants')).toContain(link)
    expect(render('/solutions/2-S1/wants?evidence=1')).not.toContain(link)
  })

  it('衝突 has 解開的衝突 and 相關的衝突', () => {
    const html = render('/solutions/2-S1/conflicts')
    expect(html).toContain('id="solution-way-out"')
    expect(html).toContain('id="solution-conflicts"')
  })

  it('相關政策 shows 國內 and 國外; a dependency row names its step 7 source', () => {
    const html = render('/solutions/2-S1/policies')
    expect(html).toContain('國內 2')
    expect(html).toContain('國外 2')
    expect(html).toContain('本文件怎麼用')
    const trashcans = trashcansJson as IssueFile
    const a = trashcans.solutions.find((s) => s.id === 'S1')!
    // The rows of the 相依事項 table of 7.1 (ETBlue, 2026-10-23). The issue's
    // 分析摘要 tab no longer has them, so there is no link to it.
    expect(a.practices.some((p) => p.source === 'dependency')).toBe(true)
    expect(html).toContain('議題分析步驟 7 這個解法的「相依事項與現行政策的關係」')
    expect(html).not.toContain('href="/issues/2/dependencies"')
  })

  it('相關政策 has an empty state (#8 S5 has no practices)', () => {
    const html = render('/solutions/8-S5/policies')
    expect(tabNames(html)).toContain('相關政策　國內 0・國外 0')
    expect(html).toContain('分析裡沒有和這個解法相關或類似的政策與做法。')
  })
})

describe('the cross-issue solution page tabs (decision 103)', () => {
  it('has the same eleven tabs (X-S1)', () => {
    expect(tabNames(render('/solutions/X-S1'))).toEqual([
      '總覽', '利害關係人　涵蓋 21・未涵蓋 30', '訴求　涵蓋 44・未涵蓋 123', '需求　滿足 17・未滿足 60',
      '衝突　解開 1・相關 1', '執行計畫', '成效衡量 4', '潛在風險 2', '可能爭議 2', '法規障礙 2', '相關政策　國內 2・國外 0',
    ])
  })

  it('總覽 has no step 7 block any more: it moved to the new tabs (decision 140)', () => {
    const html = render('/solutions/X-S1')
    expect(html).not.toContain('id="cross-detail"')
    expect(html).not.toContain('主責單位、法規、隱私與風險')
    expect(html).not.toContain('>相關法規<')
  })

  it('the 衝突 tab links each conflict to the 衝突 tab of the issue (decision 142)', () => {
    const html = render('/solutions/2-S1/conflicts')
    expect(html).toContain('href="/issues/2/conflicts?focus=C1"')
    expect(html).toContain('href="/issues/2/conflicts?focus=conflicts"')
    expect(html).toContain('到 #2 的衝突分頁看所有衝突')
    expect(html).not.toMatch(/href="\/issues\/\d+\/wants\?focus=C/)
    // A cross-issue conflict links to the conflicts of each issue.
    expect(render('/solutions/X-S1/conflicts')).toMatch(/href="\/issues\/\d+\/conflicts\?focus=C\d+"/)
  })

  it('moves 解開的衝突 and 成效衡量 out of 總覽', () => {
    const html = render('/solutions/X-S1')
    expect(html).not.toContain('id="cross-way-out"')
    expect(html).not.toContain('新指標')
    expect(render('/solutions/X-S1/conflicts')).toContain('id="cross-way-out"')
  })

  it('a dependency row of a cross-issue solution has no link: its topic has no page', () => {
    const html = render('/solutions/X-S1/policies')
    expect(html).toContain('跨議題分析 4.5')
    expect(html).not.toContain('/dependencies"')
  })
})

describe('the dates in the metadata of 總覽 (decision 131)', () => {
  const field = (label: string, date: string) => `${label}</dt><dd><time dateTime="${date}">${date}</time>`

  it('an issue solution shows 新增日期 and 更新日期', () => {
    const sol = files['2-trashcans'].solutions.find((s) => s.id === 'S1')!
    const html = render('/solutions/2-S1')
    expect(html).toContain(field(t.dates.added, sol.added))
    expect(html).toContain(field(t.dates.updated, sol.updated!))
  })

  it('a cross-issue solution shows 新增日期 and 更新日期', () => {
    const sol = cross.solutions.find((s) => s.code === 'X-S1')!
    const html = render('/solutions/X-S1')
    expect(html).toContain(field(t.dates.added, sol.added))
    expect(html).toContain(field(t.dates.updated, sol.updated!))
  })

  it('a cross-issue solution names its issues with their titles in the first line', () => {
    const sol = cross.solutions.find((s) => s.code === 'X-S1')!
    const html = render('/solutions/X-S1')
    const numbers = crossIssueNumbers(sol)
    expect(numbers.length).toBeGreaterThan(1)
    for (const n of numbers) {
      const issue = indexJson.issues.find((i) => i.number === n)!
      expect(html).toContain(t.issueCard.numberTitle(n, issue.title))
    }
  })

  it('the other tabs have no 新增日期', () => {
    expect(render('/solutions/2-S1/needs')).not.toContain(t.dates.added)
  })
})

describe('items that are not entities are in article style (decision 137)', () => {
  const CARD = 'rounded-md border p-3'
  const listItems = (html: string, from: string) => html.slice(html.indexOf(from)).match(/<li[^>]*>/g) ?? []

  it('成效衡量: each row is an h3 with no card box (issue and cross-issue)', () => {
    for (const path of ['/solutions/2-S1/measures', '/solutions/X-S1/measures']) {
      const html = render(path)
      expect(html, path).toContain('<ul class="space-y-6"><li class="min-w-0"><h3 class="text-lg font-semibold">')
      expect(html, path).not.toContain(CARD)
    }
  })

  it('相關政策: each item is an h4 with no card box, inside the two columns', () => {
    for (const path of ['/solutions/2-S1/policies', '/solutions/X-S1/policies']) {
      const html = render(path)
      expect(html, path).not.toContain(CARD)
      expect(html, path).toMatch(/<li class="min-w-0[^"]*"><h4 class="text-lg font-semibold text-foreground">/)
    }
  })

  it('總覽: the 概覽 block and the ideas have no card box (#2 S2 has 2 ideas)', () => {
    const html = render('/solutions/2-S2')
    const overview = html.slice(html.indexOf('id="solution-overview"'), html.indexOf('id="solution-ideas"'))
    expect(overview).toContain('>概覽</h3>')
    expect(overview).not.toContain(CARD)
    const ideas = files['2-trashcans'].solutions.find((s) => s.id === 'S2')!.ideas
    expect(ideas).toHaveLength(2)
    const items = listItems(html, 'id="solution-ideas"').slice(0, 2)
    expect(items).toHaveLength(2)
    for (const li of items) expect(li).toMatch(/^<li class="min-w-0( text-muted-foreground)?">$/)
    expect(html.slice(html.indexOf('id="solution-ideas"'))).toContain('<h4 class="text-lg font-semibold text-foreground">')
  })

  it('cross-issue 總覽: the 特別關注族群 rows have no card box; the merged solutions keep their cards', () => {
    const html = render('/solutions/X-S1')
    const focus = html.slice(html.indexOf('id="cross-focus"'), html.indexOf('id="cross-more"'))
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
    const pairs = columnPairs(render('/solutions/2-S1/needs'))
    expect(pairs).toHaveLength(1)
    expect(pairs[0][0]).toBe('solution-needs-covered')
    expect(pairs[0].indexOf('solution-needs-not-covered')).toBeGreaterThan(0)
  })

  it('訴求: the two want lists in one grid; 涵蓋的相同訴求群組 stays above it, full width', () => {
    const html = render('/solutions/2-S1/wants')
    const pairs = columnPairs(html)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].slice(0, 2)).toEqual(['solution-wants-covered', 'solution-wants-not-covered'])
    expect(html.indexOf('id="solution-groups"')).toBeLessThan(html.indexOf(COLS))
  })

  it('利害關係人: the two parts in one grid, with one card per row inside each part', () => {
    const html = render('/solutions/2-S1/stakeholders')
    const chunks = html.split(COLS)
    expect(chunks).toHaveLength(2)
    expect(chunks[1].indexOf('id="solution-stakeholders-covered"'))
      .toBeLessThan(chunks[1].indexOf('id="solution-stakeholders-not-covered"'))
    // The card list is no longer a 2-column grid inside the half.
    expect(html).not.toContain('grid gap-3 lg:grid-cols-2')
  })

  it('相關政策: 國內 first, then 國外, in one grid', () => {
    const pairs = columnPairs(render('/solutions/2-S1/policies'))
    expect(pairs).toHaveLength(1)
    expect(pairs[0].slice(0, 2)).toEqual(['policies-domestic', 'policies-foreign'])
  })

  it('cross-issue 需求 and 訴求: one grid per issue in parts, none for an issue not in parts (X-S5)', () => {
    // X-S5 has parts in #2 and #8. Its group X-N3 covers #1 N15, so #1 shows
    // only its covered part, at full width.
    const needs = render('/solutions/X-S5/needs')
    expect(columnPairs(needs).map((p) => p[0])).toEqual(['cross-needs-2-covered', 'cross-needs-8-covered'])
    expect(needs).toContain('id="cross-needs-1-covered"')
    expect(needs).not.toContain('id="cross-needs-1-not-covered"')
    const wants = render('/solutions/X-S5/wants')
    expect(columnPairs(wants).map((p) => p[0])).toEqual(['cross-wants-2-covered', 'cross-wants-8-covered'])
    expect(wants).toContain('id="cross-wants-1-covered"')
  })

  it('cross-issue 利害關係人 and 相關政策 also have the two columns (X-S1)', () => {
    expect(render('/solutions/X-S1/stakeholders').split(COLS)).toHaveLength(2)
    expect(columnPairs(render('/solutions/X-S1/policies'))[0].slice(0, 2)).toEqual(['policies-domestic', 'policies-foreign'])
  })
})

describe('the plain card lists of the solution tabs (decision 139)', () => {
  const GRID = /<ul class="mt-3 grid gap-4 lg:grid-cols-2">/
  const COLS = 'class="grid gap-10 *:min-w-0 lg:grid-cols-2 lg:gap-8"'

  it('訴求: 涵蓋的相同訴求群組 is a grid; the two halves keep one card per row', () => {
    const [above, halves] = render('/solutions/2-S1/wants').split(COLS)
    expect(above.split('id="solution-groups"')[1]).toMatch(GRID)
    expect(halves).not.toContain('grid gap-4 lg:grid-cols-2')
  })

  it('需求: the two halves keep one card per row', () => {
    expect(render('/solutions/2-S1/needs').split(COLS)[1]).not.toContain('grid gap-4 lg:grid-cols-2')
  })

  it('衝突: 相關的衝突 is a grid; 解開的衝突 keeps one conflict per row', () => {
    const html = render('/solutions/2-S1/conflicts')
    const [wayOut, related] = html.split('id="solution-way-out"')[1].split('id="solution-conflicts"')
    expect(wayOut).toContain('<li')
    expect(wayOut).not.toContain('grid gap-4 lg:grid-cols-2')
    expect(related).toContain('<li')
    expect(related).toMatch(GRID)
  })

  it('cross-issue 需求: 跨議題的共同需求 is a grid of cards with equal height', () => {
    const groups = render('/solutions/X-S1/needs').split('id="cross-groups"')[1]
    expect(groups).toMatch(GRID)
    expect(groups).toContain('class="h-full rounded-md border p-3"')
  })

  it('cross-issue 總覽: the merged solutions are a grid', () => {
    expect(render('/solutions/X-S1').split('id="cross-parts"')[1]).toMatch(GRID)
  })
})

/** The headings of the items of a concern or plan tab, in order. */
const itemHeadings = (html: string) => {
  const list = /<ul aria-label="[^"]*" class="mt-6 space-y-6">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? ''
  return [...list.matchAll(/<h3 [^>]*>([^<]+)<\/h3>/g)].map((m) => m[1])
}

describe('the 潛在風險, 可能爭議 and 法規障礙 tabs (decisions 140 and 143)', () => {
  it('潛在風險: 其他顧慮與風險 and 災害風險, with its own intro line (#2 S2)', () => {
    const html = render('/solutions/2-S2/risks')
    expect(itemHeadings(html)).toEqual(['其他顧慮與風險', '災害風險'])
    expect(html).toContain('<h2 class="sr-only">潛在風險</h2>')
    expect(html).toContain('這個解法可能帶來的風險')
    expect(html).toContain('來源：議題分析步驟 7 這個解法的評估表。')
  })

  it('可能爭議: the 分析摘要 rows that name the solution, then 隱私; no longer 其他顧慮與風險 or 災害風險 (#2 S2)', () => {
    const html = render('/solutions/2-S2/controversies')
    expect(itemHeadings(html)).toEqual(['試點的採購與資料', '清潔隊員的手機回報', '隱私'])
    expect(html).toContain('<h2 class="sr-only">可能爭議</h2>')
    expect(html).not.toContain('>其他顧慮與風險</h3>')
    expect(html).not.toContain('>災害風險</h3>')
  })

  it('法規障礙: the 分析摘要 rows that name the solution, then 相關法規 (#2 S2)', () => {
    expect(itemHeadings(render('/solutions/2-S2/legal'))).toEqual(['感測器的採購與認證', '照片與定位的個資', '相關法規'])
  })

  it('a solution that no 分析摘要 row names still shows its step 7 rows (#2 S3)', () => {
    expect(itemHeadings(render('/solutions/2-S3/controversies'))).toEqual(['隱私'])
    expect(itemHeadings(render('/solutions/2-S3/risks'))).toEqual(['其他顧慮與風險', '災害風險'])
    expect(tabNames(render('/solutions/2-S3'))).toEqual(expect.arrayContaining(['潛在風險 2', '可能爭議 1', '法規障礙 1']))
  })

  it('is in article style: one column, an h3 each, no card box; 「相關：」 on a 分析摘要 row and a source line on a step 7 row', () => {
    const html = render('/solutions/2-S1/controversies')
    expect(html).not.toContain('rounded-md border p-3')
    expect(html).not.toMatch(/<ul aria-label="可能爭議" class="[^"]*grid/)
    expect(html).toContain('相關：')
    expect(html).toContain('href="/issues/2/conflicts?focus=C1"')
    expect(html).toContain('來源：議題分析步驟 7 這個解法的評估表。')
  })

  it('has the 「只看有資料根據」 toggle; with it on, the [AI模擬] items are hidden and the links keep ?evidence=1', () => {
    const on = render('/solutions/2-S1/legal?evidence=1')
    expect(on).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*只看有資料根據/)
    // Every item of #2 S1 is [AI模擬], so the tab says so.
    expect(itemHeadings(on)).toEqual([])
    expect(on).toContain('這裡沒有標記 [實證] 或 [AI整理] 的項目。')
    // The tab count is the total (decision 49).
    expect(tabNames(on)).toEqual(tabNames(render('/solutions/2-S1/legal')))
  })

  it('with the filter on keeps an item with a [實證] part, and hides its [AI模擬] parts (#9 S2)', () => {
    // 行政院的生成式 AI 參考指引 (法規上的障礙, names 解法 S2) is tagged [實證].
    const policy = policyJson as IssueFile
    files[policy.folder] = policy
    try {
      const html = render('/solutions/9-S2/legal?evidence=1')
      expect(itemHeadings(html)).toContain('行政院的生成式 AI 參考指引')
      expect(itemHeadings(html).length).toBeLessThan(itemHeadings(render('/solutions/9-S2/legal')).length)
      expect(html).toContain('href="/solutions/9-S2?evidence=1"')
    } finally {
      delete files[policy.folder]
    }
  })

  it('cross-issue: the same items, with cross-issue links and the cross-issue source line (X-S1)', () => {
    const html = render('/solutions/X-S1/controversies')
    expect(itemHeadings(html)).toEqual(['合併的選址討論', '隱私'])
    expect(itemHeadings(render('/solutions/X-S1/risks'))).toEqual(['其他顧慮與風險', '災害風險'])
    // 「解法 X-S1」 links to the page, 「#8 I25-US01」 to the story page, X-N1 is plain text.
    expect(html).toContain('href="/solutions/X-S1"')
    expect(html).toContain('href="/stakeholders/I25/stories/8/I25-US01"')
    expect(html).toContain('<span>X-N1</span>')
    expect(html).toContain('來源：跨議題分析 4.5 這個解法的評估表。')
    expect(itemHeadings(render('/solutions/X-S1/legal'))).toEqual(['合併辦理的權責', '相關法規'])
    expect(render('/solutions/X-S1/legal')).toContain('href="/solutions/1-S3"')
  })
})

describe('the 執行計畫 tab (decision 140)', () => {
  it('has 主責單位, 需要的資料／API／資源, 成本, 可行性 and 執行步驟, in article style', () => {
    for (const path of ['/solutions/2-S1/plan', '/solutions/X-S1/plan']) {
      const html = render(path)
      expect(itemHeadings(html), path).toEqual(['主責單位', '需要的資料／API／資源', '成本', '可行性', '執行步驟'])
      expect(html, path).not.toContain('rounded-md border p-3')
      expect(html, path).toContain('只看有資料根據')
    }
  })

  it('shows a 【待補】 執行步驟 as muted text, not as a list', () => {
    const html = render('/solutions/2-S1/plan')
    expect(html).toMatch(/<li class="min-w-0 text-muted-foreground"><h3 id="plan-steps"[^>]*>執行步驟<\/h3>/)
    expect(html).toContain('【待補：執行步驟】')
    expect(html).not.toContain('<ol')
  })

  it('shows the phases of 執行步驟 as a numbered list when the cell splits cleanly at 「；」', () => {
    const steps = { text: '第一階段：在兩個區試辦；第二階段：檢討後擴大；第一步：找出試辦地點', tag: 'AI模擬' as const, pending: false }
    const trashcans = files['2-trashcans']
    const patched: IssueFile = {
      ...trashcans,
      solutions: trashcans.solutions.map((s) => (s.id === 'S1' ? { ...s, plan: { ...s.plan, steps: [steps] } } : s)),
    }
    files['2-trashcans'] = patched
    try {
      const html = render('/solutions/2-S1/plan')
      const list = /<ol class="[^"]*">([\s\S]*?)<\/ol>/.exec(html)?.[1] ?? ''
      expect([...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, '')))
        .toEqual(['第一階段：在兩個區試辦', '第二階段：檢討後擴大', '第一步：找出試辦地點'])
      // With the filter on, the [AI模擬] cell is hidden and the note shows.
      const on = render('/solutions/2-S1/plan?evidence=1')
      expect(on).not.toContain('<ol')
      expect(on).toContain('這一格只有標記 [AI模擬] 的內容。')
    } finally {
      files['2-trashcans'] = trashcans
    }
  })
})

describe('the 執行計畫 tab in the new step 7 format (decisions 181 to 185)', () => {
  const ts = t.solutionPage.schedule
  const newFormat = newFormatJson as Pick<SolutionData, 'plan' | 'schedule'>
  const rows = newFormat.schedule?.rows ?? []

  /** Renders the path with #2 S1 in the new format (plan and schedule from the build of 2026-11-04). */
  function renderNew(path: string): string {
    const trashcans = files['2-trashcans']
    files['2-trashcans'] = {
      ...trashcans,
      solutions: trashcans.solutions.map((s) => (s.id === 'S1' ? { ...s, plan: newFormat.plan, schedule: newFormat.schedule } : s)),
    }
    try {
      return render(path)
    } finally {
      files['2-trashcans'] = trashcans
    }
  }
  const table = (html: string) => /<table[^>]*>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? ''
  const text = (html: string) => html.replace(/<[^>]+>/g, '')

  it('shows 工作分解與時程 in place of 執行步驟', () => {
    const html = renderNew('/solutions/2-S1/plan')
    expect(itemHeadings(html)).toEqual(['主責單位', '需要的資料／API／資源', '成本', '可行性', '工作分解與時程'])
    expect(html).not.toContain('執行步驟')
    expect(html).toContain('id="plan-schedule"')
    expect(html).toContain(ts.intro)
  })

  it('a cross-issue solution in the new format also shows 工作分解與時程 (decision 188)', () => {
    const sol = cross.solutions.find((s) => s.code === 'X-S1')!
    const oldPlan = sol.plan
    sol.plan = newFormat.plan
    sol.schedule = newFormat.schedule
    try {
      const html = render('/solutions/X-S1/plan')
      expect(html).toContain('id="plan-schedule"')
      expect(html).not.toContain('id="plan-steps"')
      const body = [...table(html).matchAll(/<tr( class="[^"]*")?><td[^>]*>([^<]+)<\/td>/g)]
      expect(body.map((m) => m[2])).toEqual(rows.map((r) => r.id))
      expect(html).toContain(ts.chartLoading)
    } finally {
      sol.plan = oldPlan
      delete sol.schedule
    }
  })

  it('shows the work breakdown table: the columns, every row in file order, phases in bold', () => {
    const html = table(renderNew('/solutions/2-S1/plan'))
    expect([...html.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map((m) => m[1])).toEqual(['編號', '工作項目', '主責單位', '期間', '人天'])
    const body = [...html.matchAll(/<tr( class="[^"]*")?><td[^>]*>([^<]+)<\/td>/g)]
    expect(body.map((m) => m[2])).toEqual(rows.map((r) => r.id))
    expect(body.filter((m) => m[1]?.includes('font-semibold')).map((m) => m[2])).toEqual(rows.filter((r) => r.level === 1).map((r) => r.id))
    expect(rows.length).toBeGreaterThan(4)
    // Every 工作項目, 期間 and 人天 is shown; a 【待補】 item stays in the row.
    for (const r of rows) {
      expect(text(html)).toContain(r.item.text)
      expect(text(html)).toContain(r.period)
      expect(text(html)).toContain(r.days)
    }
    expect(text(html)).toContain('【待補：新工處】')
  })

  it('shows the [AI模擬] tag once, above the table, when every row has it (decision 183)', () => {
    const html = renderNew('/solutions/2-S1/plan')
    expect(rows.every((r) => r.item.tag === 'AI模擬')).toBe(true)
    expect(table(html)).not.toContain('>AI模擬<')
    const section = html.slice(html.indexOf('id="plan-schedule"'))
    expect(section.split('<table')[0]).toContain('>AI模擬<')
  })

  it('renders the chart only in the browser: the page HTML has the loading text, not the gantt source', () => {
    const html = renderNew('/solutions/2-S1/plan')
    expect(html).toContain(ts.chartLoading)
    expect(newFormat.schedule?.gantt).toContain('dateFormat')
    expect(html).not.toContain('dateFormat')
    expect(html).not.toContain('<figure')
    expect(html).not.toContain(ts.chartAlt)
  })

  it('with 只看有資料根據, hides the [AI模擬] rows and the chart and says so once (decision 184)', () => {
    const html = renderNew('/solutions/2-S1/plan?evidence=1')
    expect(html).toContain(ts.filteredNone)
    expect(html).not.toContain('<table')
    expect(html).not.toContain(ts.chartLoading)
  })

  it('keeps the old format as before: 執行步驟 and no table (#2 S1 fixture, X-S1)', () => {
    for (const path of ['/solutions/2-S1/plan', '/solutions/X-S1/plan']) {
      const html = render(path)
      expect(html, path).toContain('id="plan-steps"')
      expect(html, path).not.toContain('<table')
      expect(html, path).not.toContain(ts.chartLoading)
    }
  })
})

describe('the gantt chart when it does not render (decision 182)', () => {
  const ts = t.solutionPage.schedule

  it('shows the short error text, not a chart', () => {
    const html = renderToStaticMarkup(<GanttView state={{ status: 'error' }} />)
    expect(html).toContain(ts.chartError)
    expect(html).not.toContain('<figure')
  })

  it('shows the SVG from mermaid in a figure; screen readers get a short text, not the SVG', () => {
    const html = renderToStaticMarkup(<GanttView state={{ status: 'ready', svg: '<svg id="g1"></svg>' }} />)
    expect(html).toContain(`<figure class="mt-3 overflow-x-auto"><figcaption class="sr-only">${ts.chartAlt}</figcaption>`)
    expect(html).toContain('<div aria-hidden="true"><svg id="g1"></svg></div>')
  })

  it('maps a failed render (null) to the error state, and an old result to loading', () => {
    expect(ganttState({ key: 'light\ngantt', svg: null }, 'light\ngantt')).toEqual({ status: 'error' })
    expect(ganttState({ key: 'light\ngantt', svg: '<svg></svg>' }, 'light\ngantt')).toEqual({ status: 'ready', svg: '<svg></svg>' })
    expect(ganttState({ key: 'light\ngantt', svg: '<svg></svg>' }, 'dark\ngantt')).toEqual({ status: 'loading' })
    expect(ganttState(null, 'light\ngantt')).toEqual({ status: 'loading' })
  })
})

describe('相關政策: the dependency rows have the 「相關：」 line (decision 140)', () => {
  it('links the references of a dependency row, issue and cross-issue', () => {
    const html = render('/solutions/2-S1/policies')
    expect(html).toContain('相關：')
    const cross = render('/solutions/X-S1/policies?evidence=1')
    expect(cross).toContain('href="/solutions/X-S2?evidence=1"')
    expect(cross).toContain('href="/stakeholders/O04/stories/2/O04-US04"')
  })
})

describe('領域 and 解法類型 tags in the solution header (Task U4 of plan-types-ui.md)', () => {
  const tt = t.typeTags
  /** The <dd> of the field with this label, or null when there is none. */
  const field = (html: string, label: string) =>
    new RegExp(`<dt class="text-muted-foreground">${label}</dt><dd>([\\s\\S]*?)</dd>`).exec(html)?.[1] ?? null
  const links = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => [m[1], m[2]])
  const labels = (html: string) => [...html.matchAll(/<dt class="text-muted-foreground">([^<]+)<\/dt>/g)].map((m) => m[1])

  it('a solution with no own 領域: the issue 領域, muted, then 「（沿用議題）」 (decision 5)', () => {
    const html = render('/solutions/8-S1')
    const domains = field(html, tt.domain) ?? ''
    expect(links(domains)).toEqual([['/domains/health', '醫療保健'], ['/domains/environment', '環境保護']])
    expect(domains).toContain('text-muted-foreground')
    expect(domains).toContain(tt.fromIssue)
  })

  it('a solution with its own 領域: normal links, no 「（沿用議題）」 (decision 5)', () => {
    const trashcans = files['2-trashcans']
    files['2-trashcans'] = {
      ...trashcans,
      solutions: trashcans.solutions.map((s) => (s.id === 'S1' ? { ...s, domains: ['police'], ownDomains: ['police'] } : s)),
    }
    try {
      const domains = field(render('/solutions/2-S1'), tt.domain) ?? ''
      expect(links(domains)).toEqual([['/domains/police', '警政']])
      expect(domains).not.toContain('text-muted-foreground')
      expect(domains).not.toContain(tt.fromIssue)
    } finally {
      files['2-trashcans'] = trashcans
    }
  })

  it('解法類型 in the order of the cell; the rows are 空間類型, 領域, 解法類型', () => {
    const html = render('/solutions/2-S1')
    expect(links(field(html, tt.solutionType) ?? '')).toEqual([
      ['/solution-types/digital-tool', '數位工具'], ['/solution-types/planning', '調查與規劃'],
    ])
    const l = labels(html)
    expect(l.indexOf(tt.domain)).toBe(l.indexOf(tt.space) + 1)
    expect(l.indexOf(tt.solutionType)).toBe(l.indexOf(tt.domain) + 1)
  })

  it('the tags show only on 總覽, like 空間類型', () => {
    const html = render('/solutions/2-S1/plan')
    expect(field(html, tt.domain)).toBeNull()
    expect(field(html, tt.solutionType)).toBeNull()
  })

  it('an X- solution: the union of 領域 in normal style, and its 解法類型', () => {
    const html = render('/solutions/X-S4')
    const domains = field(html, tt.domain) ?? ''
    expect(links(domains)).toEqual([
      ['/domains/environment', '環境保護'], ['/domains/health', '醫療保健'],
      ['/domains/administration', '行政'], ['/domains/civil-affairs', '民政'],
    ])
    expect(domains).not.toContain('text-muted-foreground')
    expect(html).not.toContain(tt.fromIssue)
    expect(links(field(html, tt.solutionType) ?? '')).toEqual([
      ['/solution-types/digital-tool', '數位工具'], ['/solution-types/open-data', '資料公開'],
    ])
  })
})

describe('the 可能合併 tab (Task U6 of plan-types-ui.md, decision 4)', () => {
  const tc = t.candidates
  /** The tab content after the intro. */
  const cards = (html: string) => html.split(tc.intro)[1] ?? ''
  /** The other solutions linked in the tab content, in page order. */
  const pairLinks = (html: string, self: string) =>
    [...cards(html).matchAll(/href="\/solutions\/(\d+-S\d+)"/g)].map((m) => m[1]).filter((id) => id !== self)

  it('is the last tab of an issue solution, 「可能合併 n」 with the number of paired solutions', () => {
    expect(tabNames(render('/solutions/8-S1')).at(-1)).toBe('可能合併 4')
    expect(tabNames(render('/solutions/2-S3')).at(-1)).toBe('可能合併 3')
  })

  it('opens at #/solutions/<id>/candidates, with the tab name in the page title', () => {
    const html = render('/solutions/8-S1/candidates')
    expect(activeTab(html)).toBe('可能合併 4')
    expect(titleOf(html)).toMatch(/^#8 S1 .+ · 可能合併 · 解法 · 市政提案小幫手$/)
    expect(html).toContain('href="/solutions/8-S1/candidates"')
  })

  it('shows the intro and a link to the rule in method.md', () => {
    const html = render('/solutions/8-S1/candidates')
    expect(html).toContain('這些是其他議題中，可能可以和這個解法合併的解法。這份清單由規則產生，只是建議，由人決定是否合併。')
    expect(html).toContain(`href="${METHOD_URL}#跨議題分析"`)
  })

  it('lists each paired solution once, by issue number then ID (8-S1 is side b of every row)', () => {
    expect(pairLinks(render('/solutions/8-S1/candidates'), '8-S1')).toEqual(['1-S3', '1-S4', '1-S5', '2-S4'])
    // The card shows the name of the other solution, from its issue file.
    const name = stripMarkdown((treesJson as IssueFile).solutions.find((s) => s.id === 'S3')!.name.text)
    expect(cards(render('/solutions/8-S1/candidates'))).toContain(name)
    // #9 has no file in this test: 9-S4 still gets its link.
    expect(pairLinks(render('/solutions/2-S3/candidates'), '2-S3')).toEqual(['1-S2', '8-S3', '9-S4'])
  })

  it('shows no number of shared things on the cards', () => {
    const panel = cards(render('/solutions/8-S1/candidates'))
    expect(panel).toContain(tc.solutionTypes)
    expect(panel).not.toMatch(/共同\S* \d/)
  })

  it('while cross-issue.json loads, the label is 「可能合併」 with no number', () => {
    mockState.crossLoading = true
    try {
      const html = render('/solutions/8-S1/candidates')
      expect(tabNames(html).at(-1)).toBe('可能合併')
      expect(html).not.toContain(tc.intro)
    } finally {
      mockState.crossLoading = false
    }
  })

  it('a solution with no pair keeps the tab with 0 and shows only the empty note (8-S5)', () => {
    const html = render('/solutions/8-S5/candidates')
    expect(activeTab(html)).toBe('可能合併 0')
    expect(html).toContain(tc.none)
    expect(html).not.toContain(tc.intro)
  })

  it('an X- solution has no 可能合併 tab, and its candidates URL is an unknown tab', () => {
    expect(tabNames(render('/solutions/X-S1')).some((n) => n.startsWith('可能合併'))).toBe(false)
    const html = render('/solutions/X-S1/candidates')
    expect(html).toContain('找不到這個分頁。')
    expect(activeTab(html)).toBeUndefined()
  })
})
