// The solution page with its ten tabs (ETBlue, 2026-10-22 and 2026-10-23;
// design 3.12, decisions 103 and 140). The data hooks and the page title are mocked, so the page
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
  it('has ten tabs in order, with their counts (#2 A)', () => {
    expect(tabNames(render('/solutions/2-A'))).toEqual([
      '總覽', '需求　涵蓋 9・未涵蓋 13', '訴求　涵蓋 28・未涵蓋 25', '利害關係人　涵蓋 14・未涵蓋 13',
      '衝突　解開 5・相關 3', '可能爭議 4', '法規障礙 2', '執行計畫', '成效衡量 4', '相關政策　國內 2・國外 2',
    ])
  })

  it('opens each tab from its URL, with the tab name in the page title', () => {
    const cases: [string, string, string][] = [
      ['wants', '訴求　涵蓋 28・未涵蓋 25', '訴求'],
      ['conflicts', '衝突　解開 5・相關 3', '衝突'],
      ['controversies', '可能爭議 4', '可能爭議'],
      ['legal', '法規障礙 2', '法規障礙'],
      ['plan', '執行計畫', '執行計畫'],
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

  it('總覽 keeps the 概覽 block, but not the other step 7 rows, the conflicts, the groups or the measures', () => {
    const html = render('/solutions/2-A')
    expect(html).toContain('>概覽</h3>')
    for (const label of ['成本', '可行性', '主要風險', '主責單位']) expect(html, label).toContain(`>${label}</dt>`)
    // The rest of step 7 moved to 可能爭議, 法規障礙 and 執行計畫 (decision 140).
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

  it('相關政策 shows 國內 and 國外; a dependency row names its step 7 source', () => {
    const html = render('/solutions/2-A/policies')
    expect(html).toContain('國內 2')
    expect(html).toContain('國外 2')
    expect(html).toContain('本文件怎麼用')
    const trashcans = trashcansJson as IssueFile
    const a = trashcans.solutions.find((s) => s.id === 'A')!
    // The rows of the 相依事項 table of 7.1 (ETBlue, 2026-10-23). The issue's
    // 分析摘要 tab no longer has them, so there is no link to it.
    expect(a.practices.some((p) => p.source === 'dependency')).toBe(true)
    expect(html).toContain('議題分析步驟 7 這個解法的「相依事項與現行政策的關係」')
    expect(html).not.toContain('href="/issues/2/dependencies"')
  })

  it('相關政策 has an empty state (#8 E has no practices)', () => {
    const html = render('/solutions/8-E/policies')
    expect(tabNames(html)).toContain('相關政策　國內 0・國外 0')
    expect(html).toContain('分析裡沒有和這個解法相關或類似的政策與做法。')
  })
})

describe('the cross-issue solution page tabs (decision 103)', () => {
  it('has the same ten tabs (X-A)', () => {
    expect(tabNames(render('/solutions/X-A'))).toEqual([
      '總覽', '需求　涵蓋 17・未涵蓋 60', '訴求　涵蓋 44・未涵蓋 123', '利害關係人　涵蓋 21・未涵蓋 30',
      '衝突　解開 1・相關 1', '可能爭議 4', '法規障礙 2', '執行計畫', '成效衡量 4', '相關政策　國內 2・國外 0',
    ])
  })

  it('總覽 has no step 7 block any more: it moved to the new tabs (decision 140)', () => {
    const html = render('/solutions/X-A')
    expect(html).not.toContain('id="cross-detail"')
    expect(html).not.toContain('主責單位、法規、隱私與風險')
    expect(html).not.toContain('>相關法規<')
  })

  it('moves 解開的衝突 and 成效衡量 out of 總覽', () => {
    const html = render('/solutions/X-A')
    expect(html).not.toContain('id="cross-way-out"')
    expect(html).not.toContain('新指標')
    expect(render('/solutions/X-A/conflicts')).toContain('id="cross-way-out"')
  })

  it('a dependency row of a cross-issue solution has no link: its topic has no page', () => {
    const html = render('/solutions/X-A/policies')
    expect(html).toContain('跨議題分析 4.5')
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
    const overview = html.slice(html.indexOf('id="solution-overview"'), html.indexOf('id="solution-ideas"'))
    expect(overview).toContain('>概覽</h3>')
    expect(overview).not.toContain(CARD)
    const ideas = files['2-trashcans'].solutions.find((s) => s.id === 'B')!.ideas
    expect(ideas).toHaveLength(2)
    const items = listItems(html, 'id="solution-ideas"').slice(0, 2)
    expect(items).toHaveLength(2)
    for (const li of items) expect(li).toMatch(/^<li class="min-w-0( text-muted-foreground)?">$/)
    expect(html.slice(html.indexOf('id="solution-ideas"'))).toContain('<h4 class="text-lg font-semibold text-foreground">')
  })

  it('cross-issue 總覽: the 特別關注族群 rows have no card box; the merged solutions keep their cards', () => {
    const html = render('/solutions/X-A')
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

describe('the plain card lists of the solution tabs (decision 139)', () => {
  const GRID = /<ul class="mt-3 grid gap-4 lg:grid-cols-2">/
  const COLS = 'class="grid gap-10 *:min-w-0 lg:grid-cols-2 lg:gap-8"'

  it('訴求: 涵蓋的相同訴求群組 is a grid; the two halves keep one card per row', () => {
    const [above, halves] = render('/solutions/2-A/wants').split(COLS)
    expect(above.split('id="solution-groups"')[1]).toMatch(GRID)
    expect(halves).not.toContain('grid gap-4 lg:grid-cols-2')
  })

  it('需求: the two halves keep one card per row', () => {
    expect(render('/solutions/2-A/needs').split(COLS)[1]).not.toContain('grid gap-4 lg:grid-cols-2')
  })

  it('衝突: 相關的衝突 is a grid; 解開的衝突 keeps one conflict per row', () => {
    const html = render('/solutions/2-A/conflicts')
    const [wayOut, related] = html.split('id="solution-way-out"')[1].split('id="solution-conflicts"')
    expect(wayOut).toContain('<li')
    expect(wayOut).not.toContain('grid gap-4 lg:grid-cols-2')
    expect(related).toContain('<li')
    expect(related).toMatch(GRID)
  })

  it('cross-issue 需求: 跨議題的共同需求 is a grid of cards with equal height', () => {
    const groups = render('/solutions/X-A/needs').split('id="cross-groups"')[1]
    expect(groups).toMatch(GRID)
    expect(groups).toContain('class="h-full rounded-md border p-3"')
  })

  it('cross-issue 總覽: the merged solutions are a grid', () => {
    expect(render('/solutions/X-A').split('id="cross-parts"')[1]).toMatch(GRID)
  })
})

/** The headings of the items of a concern or plan tab, in order. */
const itemHeadings = (html: string) => {
  const list = /<ul aria-label="[^"]*" class="mt-6 space-y-6">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? ''
  return [...list.matchAll(/<h3 [^>]*>([^<]+)<\/h3>/g)].map((m) => m[1])
}

describe('the 可能爭議 and 法規障礙 tabs (decision 140)', () => {
  it('可能爭議: the 分析摘要 rows that name the solution, then 隱私, 其他顧慮與風險 and 災害風險 (#2 B)', () => {
    const html = render('/solutions/2-B/controversies')
    expect(itemHeadings(html)).toEqual(['試點的採購與資料', '清潔隊員的手機回報', '隱私', '其他顧慮與風險', '災害風險'])
    expect(html).toContain('<h2 class="sr-only">可能爭議</h2>')
  })

  it('法規障礙: the 分析摘要 rows that name the solution, then 相關法規 (#2 B)', () => {
    expect(itemHeadings(render('/solutions/2-B/legal'))).toEqual(['感測器的採購與認證', '照片與定位的個資', '相關法規'])
  })

  it('a solution that no 分析摘要 row names still shows its step 7 rows (#2 C)', () => {
    expect(itemHeadings(render('/solutions/2-C/controversies'))).toEqual(['隱私', '其他顧慮與風險', '災害風險'])
    expect(tabNames(render('/solutions/2-C'))).toEqual(expect.arrayContaining(['可能爭議 3', '法規障礙 1']))
  })

  it('is in article style: one column, an h3 each, no card box; 「相關：」 on a 分析摘要 row and a source line on a step 7 row', () => {
    const html = render('/solutions/2-A/controversies')
    expect(html).not.toContain('rounded-md border p-3')
    expect(html).not.toMatch(/<ul aria-label="可能爭議" class="[^"]*grid/)
    expect(html).toContain('相關：')
    expect(html).toContain('href="/issues/2/wants?focus=C1"')
    expect(html).toContain('來源：議題分析步驟 7 這個解法的評估表。')
  })

  it('has the 「只看有資料根據」 toggle; with it on, the [AI模擬] items are hidden and the links keep ?evidence=1', () => {
    const on = render('/solutions/2-A/legal?evidence=1')
    expect(on).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>)[\s\S])*只看有資料根據/)
    // Every item of #2 A is [AI模擬], so the tab says so.
    expect(itemHeadings(on)).toEqual([])
    expect(on).toContain('這裡沒有標記 [實證] 或 [AI整理] 的項目。')
    // The tab count is the total (decision 49).
    expect(tabNames(on)).toEqual(tabNames(render('/solutions/2-A/legal')))
  })

  it('with the filter on keeps an item with a [實證] part, and hides its [AI模擬] parts (#9 B)', () => {
    // 行政院的生成式 AI 參考指引 (法規上的障礙, names 解法 B) is tagged [實證].
    const policy = policyJson as IssueFile
    files[policy.folder] = policy
    try {
      const html = render('/solutions/9-B/legal?evidence=1')
      expect(itemHeadings(html)).toContain('行政院的生成式 AI 參考指引')
      expect(itemHeadings(html).length).toBeLessThan(itemHeadings(render('/solutions/9-B/legal')).length)
      expect(html).toContain('href="/solutions/9-B?evidence=1"')
    } finally {
      delete files[policy.folder]
    }
  })

  it('cross-issue: the same items, with cross-issue links and the cross-issue source line (X-A)', () => {
    const html = render('/solutions/X-A/controversies')
    expect(itemHeadings(html)).toEqual(['合併的選址討論', '隱私', '其他顧慮與風險', '災害風險'])
    // 「解法 X-A」 links to the page, 「#8 I25-US01」 to the story page, X-N01 is plain text.
    expect(html).toContain('href="/solutions/X-A"')
    expect(html).toContain('href="/stakeholders/I25/stories/8/I25-US01"')
    expect(html).toContain('<span>X-N01</span>')
    expect(html).toContain('來源：跨議題分析 4.5 這個解法的評估表。')
    expect(itemHeadings(render('/solutions/X-A/legal'))).toEqual(['合併辦理的權責', '相關法規'])
    expect(render('/solutions/X-A/legal')).toContain('href="/solutions/1-C"')
  })
})

describe('the 執行計畫 tab (decision 140)', () => {
  it('has 主責單位, 需要的資料／API／資源, 成本, 可行性 and 執行步驟, in article style', () => {
    for (const path of ['/solutions/2-A/plan', '/solutions/X-A/plan']) {
      const html = render(path)
      expect(itemHeadings(html), path).toEqual(['主責單位', '需要的資料／API／資源', '成本', '可行性', '執行步驟'])
      expect(html, path).not.toContain('rounded-md border p-3')
      expect(html, path).toContain('只看有資料根據')
    }
  })

  it('shows a 【待補】 執行步驟 as muted text, not as a list', () => {
    const html = render('/solutions/2-A/plan')
    expect(html).toMatch(/<li class="min-w-0 text-muted-foreground"><h3 id="plan-steps"[^>]*>執行步驟<\/h3>/)
    expect(html).toContain('【待補：執行步驟】')
    expect(html).not.toContain('<ol')
  })

  it('shows the phases of 執行步驟 as a numbered list when the cell splits cleanly at 「；」', () => {
    const steps = { text: '第一階段：在兩個區試辦；第二階段：檢討後擴大；第一步：找出試辦地點', tag: 'AI模擬' as const, pending: false }
    const trashcans = files['2-trashcans']
    const patched: IssueFile = {
      ...trashcans,
      solutions: trashcans.solutions.map((s) => (s.id === 'A' ? { ...s, plan: { ...s.plan, steps: [steps] } } : s)),
    }
    files['2-trashcans'] = patched
    try {
      const html = render('/solutions/2-A/plan')
      const list = /<ol class="[^"]*">([\s\S]*?)<\/ol>/.exec(html)?.[1] ?? ''
      expect([...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, '')))
        .toEqual(['第一階段：在兩個區試辦', '第二階段：檢討後擴大', '第一步：找出試辦地點'])
      // With the filter on, the [AI模擬] cell is hidden and the note shows.
      const on = render('/solutions/2-A/plan?evidence=1')
      expect(on).not.toContain('<ol')
      expect(on).toContain('這一格只有標記 [AI模擬] 的內容。')
    } finally {
      files['2-trashcans'] = trashcans
    }
  })
})

describe('相關政策: the dependency rows have the 「相關：」 line (decision 140)', () => {
  it('links the references of a dependency row, issue and cross-issue', () => {
    const html = render('/solutions/2-A/policies')
    expect(html).toContain('相關：')
    const cross = render('/solutions/X-A/policies?evidence=1')
    expect(cross).toContain('href="/solutions/X-B?evidence=1"')
    expect(cross).toContain('href="/stakeholders/O04/stories/2/O04-US04"')
  })
})
