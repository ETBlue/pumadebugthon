// The issue page with the 分析摘要 topic tabs and the 利害關係人 tab
// (ETBlue, 2026-10-22; design 3.2, decisions 102, 109 and 115). The data hooks and the page title are mocked,
// so the page renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { forgetListSearches, rememberListSearch } from '@/lib/backLink'
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

describe('the band, the side menu and the metadata (decision 111)', () => {
  afterEach(() => forgetListSearches())

  it('has the back button and the h1 in the band, and no breadcrumb', () => {
    const html = render('/issues/1/wants')
    expect(html).toMatch(/<a [^>]*href="\/issues"[^>]*>[\s\S]*?回到議題列表<\/span><\/a><h1[^>]*>#1 /)
    expect(html).not.toContain('aria-label="頁面位置"')
  })

  it('the back button keeps the filters of the issue list the reader last saw', () => {
    rememberListSearch('issues', '?sort=added&space=park')
    expect(render('/issues/1')).toContain('href="/issues?sort=added&amp;space=park"')
  })

  it('has a side menu: a nav with the tab links, the current one marked', () => {
    const html = render('/issues/1/needs?evidence=1&pick=W08')
    const nav = /<nav aria-label="議題內容"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? ''
    const links = [...nav.matchAll(/<a ([^>]*)>/g)].map((m) => m[1])
    expect(links).toHaveLength(9)
    // The same URLs as the tabs: ?evidence= is kept, ?pick= is dropped.
    expect(links[0]).toContain('href="/issues/1?evidence=1"')
    expect(links[2]).toContain('href="/issues/1/needs?evidence=1"')
    expect(links.filter((a) => a.includes('aria-current="page"'))).toEqual([links[2]])
    expect(links[1]).toContain('aria-label="訴求 50・衝突 9"')
  })

  it('shows the metadata at the top of 總覽 only', () => {
    expect(render('/issues/1')).toContain('更新日期')
    expect(render('/issues/1/wants')).not.toContain('更新日期')
  })
})

describe('old issue URLs (decision 110: no redirects)', () => {
  it('an old tab name shows 「找不到這個分頁」, like any unknown tab', () => {
    for (const tab of ['opinion', 'conflicts', 'disadvantaged']) {
      const html = render(`/issues/1/${tab}`)
      expect(html).toContain('找不到這個分頁。')
      expect(activeTab(html)).toBeUndefined()
    }
  })

  it('總覽 with ?focus=stakeholders stays on 總覽', () => {
    expect(activeTab(render('/issues/1?focus=stakeholders'))).toBe('總覽')
  })
})

describe('the issue page tabs', () => {
  it('has nine tabs: four 分析摘要 topics and 利害關係人 after 解法, with their counts (#1)', () => {
    expect(tabNames(render('/issues/1'))).toEqual([
      '總覽', '訴求 50・衝突 9', '需求 31', '解法 5',
      '難以取捨 5', '可能爭議 5', '利害關係人 28・弱勢 4', '法規障礙 5', '相關解法與政策 6',
    ])
  })

  it('the 利害關係人 label does not count the 【待補】 rows of 受影響較大的弱勢族群 (decision 109)', () => {
    // #2: 6 rows, 1 待補. #8 and #9: 6 filled rows.
    expect(tabNames(render('/issues/2'))).toContain('利害關係人 27・弱勢 5')
    expect(tabNames(render('/issues/8'))).toContain('利害關係人 21・弱勢 6')
    expect(tabNames(render('/issues/9'))).toContain('利害關係人 20・弱勢 6')
  })

  it('the 利害關係人 label has two parts, like 訴求 N・衝突 M', () => {
    const html = render('/issues/1')
    expect(html).toMatch(/利害關係人 28<\/span>/)
    expect(html).toMatch(/弱勢 4<\/span>/)
  })

  it('opens a topic tab from its URL, with the tab name in the page title', () => {
    const html = render('/issues/1/legal')
    expect(activeTab(html)).toBe('法規障礙 5')
    expect(titleOf(html)).toContain('法規障礙')
    // The hidden h2 of the tab keeps the full name of the topic.
    expect(html).toContain('<h2 class="sr-only">法規上的障礙</h2>')
    expect(titleOf(html)).toContain('#1')
  })

  it('a topic tab has no stakeholder side menu; the 訴求 tab has one', () => {
    const menu = 'data-slot="collapsible"'
    for (const tab of ['decisions', 'controversies', 'legal', 'dependencies']) {
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

  it('總覽 has no 數量, 特別關注族群 or 利害關係人 block any more (decision 109)', () => {
    const html = render('/issues/1')
    expect(html).not.toContain('數量')
    // 「1.3 特別關注族群檢查」 is still a section of the 待補清單.
    expect(html).not.toContain('>特別關注族群</h3>')
    expect(html).not.toContain('id="focus-stakeholders"')
    expect(html).not.toContain('受影響較大的弱勢族群')
    for (const h of ['資料根據', '標記說明', '使用相同空間的議題', '待補清單']) expect(html, h).toContain(`>${h}</h3>`)
  })

  it('an unknown tab shows 「找不到這個分頁。」', () => {
    const html = render('/issues/1/summary')
    expect(html).toContain('找不到這個分頁。')
    expect(activeTab(html)).toBeUndefined()
  })

  it('the tab list scrolls sideways below md, and the side menu takes its place from md', () => {
    const list = /role="tablist"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*role="tablist"/.exec(render('/issues/1'))
    const cls = (list?.[1] ?? list?.[2] ?? '').split(' ')
    expect(cls).toEqual(expect.arrayContaining(['flex-nowrap', 'overflow-x-auto', 'md:hidden']))
  })

  it('on a phone the scrolling tab list is as wide as the screen and never scrolls up and down', () => {
    const html = render('/issues/1')
    const list = /role="tablist"[^>]*class="([^"]*)"|class="([^"]*)"[^>]*role="tablist"/.exec(html)
    const cls = (list?.[1] ?? list?.[2] ?? '').split(' ')
    // -mx-4 cancels the px-4 of the page column; px-4 inside keeps the first tab in line.
    expect(cls).toEqual(expect.arrayContaining(['-mx-4', 'w-[calc(100%+2rem)]', 'px-4', 'overflow-y-hidden']))
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

/** The HTML of the menu box of the 利害關係人 tab (decision 115). */
function menuBox(html: string): { cls: string; inner: string } {
  const m = /<div role="group" aria-label="篩選與展開" class="([^"]*)">([\s\S]*?)<\/div><div class="space-y-1">/.exec(html)
  return { cls: m?.[1] ?? '', inner: m?.[2] ?? '' }
}

describe('the 利害關係人 tab (decision 115)', () => {
  it('opens from its URL, with 利害關係人 in the page title and the hidden h2', () => {
    const html = render('/issues/1/stakeholders')
    expect(activeTab(html)).toBe('利害關係人 28・弱勢 4')
    expect(titleOf(html)).toContain('利害關係人')
    expect(html).toContain('<h2 class="sr-only">利害關係人</h2>')
  })

  it('has no group cards and no 「只看有資料根據」 toggle', () => {
    const html = render('/issues/1/stakeholders')
    expect(html).not.toContain('受影響較大的弱勢族群')
    expect(html).not.toContain('border-dashed')
    expect(html).not.toContain('只看有資料根據')
    expect(html).not.toContain('已隱藏')
  })

  it('names the groups that the issue has not included yet, in the fixed order', () => {
    expect(render('/issues/1/stakeholders')).toContain('<p>本議題尚未納入：呼吸道疾病、外籍</p>')
    expect(render('/issues/2/stakeholders')).toContain('<p>本議題尚未納入：呼吸道疾病</p>')
    for (const n of [8, 9]) {
      const html = render(`/issues/${n}/stakeholders`)
      expect(html, `#${n}`).toContain('<p>本議題已納入所有特別關注族群</p>')
      expect(html, `#${n}`).not.toContain('本議題尚未納入')
    }
  })

  it('has the menu box first, with every filter of the tab and the expand buttons', () => {
    const html = render('/issues/1/stakeholders')
    const box = menuBox(html)
    expect(box.cls.split(' ')).toEqual(expect.arrayContaining(['rounded-lg', 'border', 'bg-muted', 'flex-wrap']))
    // The 特別關注 filter: one toggle per group of the issue's stakeholders.
    expect(box.inner).toContain('>特別關注</span>')
    for (const g of ['高齡', '身心障礙', '兒童與照顧者', '經濟弱勢']) expect(box.inner, g).toContain(`${g}</button>`)
    // 4 issues are available, so 只看跨議題 is there.
    expect(box.inner).toContain('只看跨議題')
    expect(box.inner).toContain('全部展開')
    expect(box.inner).toContain('全部收合')
    // The box is above the tree.
    expect(html.indexOf('aria-label="篩選與展開"')).toBeLessThan(html.indexOf('>組織'))
  })

  it('keeps the count note and the priority legend', () => {
    const html = render('/issues/1/stakeholders')
    expect(html).toContain('故事數只表示分析寫了多少，不代表重要程度。')
  })

  it('shows the tree in two columns from md: 組織, then 個人', () => {
    const html = render('/issues/1/stakeholders')
    const grid = html.indexOf('class="grid gap-6 md:grid-cols-2 md:gap-8"')
    const org = html.indexOf('>組織<')
    const ind = html.indexOf('>個人<')
    expect(grid).toBeGreaterThan(-1)
    expect(org).toBeGreaterThan(grid)
    expect(ind).toBeGreaterThan(org)
    // Each root is its own column (a section with an h3).
    expect(html.match(/<section aria-labelledby="stakeholders-root-[OI]"/g)).toHaveLength(2)
  })

  it('opens every level of the tree at the start and shows a detailed card for each stakeholder', () => {
    const html = render('/issues/1/stakeholders')
    expect(html).toContain('data-state="open"')
    expect(html).not.toContain('data-state="closed"')
    for (const s of (treesJson as IssueFile).stakeholders) {
      expect(html, s.id).toContain(`href="/stakeholders/${s.id}"`)
    }
  })

  it('is the ?focus=stakeholders target', () => {
    expect(render('/issues/1/stakeholders?focus=stakeholders')).toContain('id="focus-stakeholders"')
  })
})

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
    expect(rowNames(render('/issues/8/legal'))).toHaveLength(6)
  })

  it('hides the [AI模擬] rows and keeps the [實證] and [AI整理] rows', () => {
    const html = render('/issues/9/legal?evidence=1')
    expect(html).toMatch(/aria-pressed="true"/)
    // A [實證] row next to [AI模擬] rows.
    expect(rowNames(html)).toEqual(['行政院的生成式 AI 參考指引'])
  })

  it('shows the status line with the shown rows and 「清除篩選」', () => {
    const html = render('/issues/9/legal?evidence=1')
    expect(html).toContain('篩選：只看有資料根據。顯示 1 項。')
    expect(html).toMatch(/href="\/issues\/9\/legal"[^>]*>清除篩選<\/a>/)
  })

  it('shows a short note when the filter hides every row', () => {
    for (const path of ['/issues/2/decisions?evidence=1', '/issues/1/legal?evidence=1']) {
      const html = render(path)
      expect(html, path).toContain('這裡沒有說明標記 [實證] 或 [AI整理] 的項目。')
      expect(rowNames(html), path).toEqual([])
      expect(html, path).toContain('顯示 0 項。')
    }
  })

  it('does not change the tab counts (they are totals, decision 49)', () => {
    expect(tabNames(render('/issues/1/legal?evidence=1'))).toEqual(tabNames(render('/issues/1/legal')))
    expect(tabNames(render('/issues/2/decisions?evidence=1'))).toContain('難以取捨 4')
  })
})
