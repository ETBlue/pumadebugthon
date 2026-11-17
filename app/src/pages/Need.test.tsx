// The need page #/needs/<key> (plan-needs.md, Task N4): the band with the
// back button, the tabs (a tab with no content is left out), each tab, the
// 只看有資料根據 toggle and the not-found page. The data hooks are mocked, so
// the page renders on the server with the fixtures. PageTitle is mocked to
// show its parts, so the tests can read the page title.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { t } from '@/i18n/zh-TW'
import { forgetListSearches } from '@/lib/backLink'
import { needListItems } from '@/lib/needList'
import { needHasDataBasis } from '@/lib/needRecords'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import Need from './Need'

const index = indexJson as IndexFile
const cross = crossJson as CrossIssueFile
const files: Record<string, IssueFile> = {
  '1-trees': treesJson as IssueFile,
  '2-trashcans': trashcansJson as IssueFile,
  '8-smokefree': smokefreeJson as IssueFile,
  '9-policydiscovery': policyJson as IssueFile,
}
const items = needListItems(Object.values(files), cross)

const state = { crossReady: true }

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssues: (folders: string[]) => ({ status: 'ready', data: folders.filter((f) => f in files).map((f) => files[f]) }),
  useCrossIssue: () => ({ status: 'ready', data: state.crossReady ? cross : null }),
  useCrossIssueOrNull: () => (state.crossReady ? cross : null),
}))

vi.mock('@/components/PageTitle', () => ({
  PageTitle: ({ parts }: { parts: (string | null)[] }) => <meta data-title={parts.filter(Boolean).join(' · ')} />,
}))

beforeEach(() => {
  state.crossReady = true
  forgetListSearches()
})

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="needs/:key/:tab?" element={<Need />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The accessible names of the tabs, in order. */
const tabNames = (html: string) => [...html.matchAll(/role="tab"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
const activeTab = (html: string) => /role="tab" aria-selected="true"[^>]*aria-label="([^"]+)"/.exec(html)?.[1]
const titleOf = (html: string) => /data-title="([^"]*)"/.exec(html)?.[1]
const h1 = (html: string) => /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1].replace(/<[^>]+>/g, '')
/** The links of the side menu. */
const menuLinks = (html: string) => {
  const nav = /<nav aria-label="需求內容"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? ''
  return [...nav.matchAll(/<a ([^>]*)>/g)].map((m) => m[1])
}
/** The story IDs of the story cards (the links to the story pages). */
const storyCards = (html: string) => [...html.matchAll(/href="\/stakeholders\/[^/"]+\/stories\/\d+\/([^"]+)"/g)].map((m) => m[1])

describe('the need page', () => {
  it('has the tabs in the order of the plan, with counts (2-N01)', () => {
    const names = tabNames(render('/needs/2-N01'))
    expect(names.map((n) => n.replace(/ \d+$/, ''))).toEqual(['總覽', '使用者故事', '利害關係人', '解法', '衝突'])
    expect(names[1]).toBe('使用者故事 9')
  })

  it('leaves out a tab with no content (8-I01-US11 has no solution, no conflict and no X-N group)', () => {
    expect(tabNames(render('/needs/8-I01-US11'))).toEqual(['總覽', '使用者故事 1', '利害關係人 1'])
    // The URL of a left-out tab shows 「找不到這個分頁。」.
    expect(render('/needs/8-I01-US11/solutions')).toContain('找不到這個分頁。')
    expect(render('/needs/2-N01/wants')).toContain('找不到這個分頁。')
  })

  it('has a side menu with the tab paths, the current one marked', () => {
    const links = menuLinks(render('/needs/2-N07/conflicts?evidence=1'))
    expect(links.map((a) => /href="([^"]+)"/.exec(a)?.[1])).toEqual([
      '/needs/2-N07?evidence=1',
      '/needs/2-N07/stories?evidence=1',
      '/needs/2-N07/stakeholders?evidence=1',
      '/needs/2-N07/solutions?evidence=1',
      '/needs/2-N07/conflicts?evidence=1',
      '/needs/2-N07/same-needs?evidence=1',
    ])
    expect(links.filter((a) => a.includes('aria-current="page"'))).toEqual([links[4]])
  })

  it('has the code and the summary in the h1, and a back button to the need list', () => {
    const html = render('/needs/2-N01')
    expect(h1(html)).toContain('#2 N01')
    expect(h1(html)).toContain(items.find((i) => i.key === '2-N01')!.summary.text.replace(/\*\*/g, ''))
    expect(html).toMatch(/<a [^>]*href="\/needs"[^>]*>[\s\S]*?回到需求列表/)
  })

  it('the back button keeps the last search of the need list', async () => {
    const { rememberListSearch } = await import('@/lib/backLink')
    rememberListSearch('needs', '?priority=M')
    expect(render('/needs/2-N01')).toContain('href="/needs?priority=M"')
  })

  it('has the page title: the need, the tab, then 需求', () => {
    const summary = items.find((i) => i.key === '2-N01')!.summary.text.replace(/\*\*/g, '')
    expect(titleOf(render('/needs/2-N01'))).toBe(`#2 N01 ${summary} · 需求`)
    expect(titleOf(render('/needs/2-N01/stories'))).toBe(`#2 N01 ${summary} · 使用者故事 · 需求`)
  })

  it('shows two different pages for the same ID in two issues (1-N01 and 2-N01)', () => {
    const a = render('/needs/1-N01')
    const b = render('/needs/2-N01')
    expect(h1(a)).toContain('#1 N01')
    expect(h1(b)).toContain('#2 N01')
    expect(h1(a)).not.toBe(h1(b))
  })

  it('shows the not-found page for an unknown or a malformed key', () => {
    for (const key of ['2-N99', '7-N01', 'N01', '2-n01', 'abc', '02-N01']) {
      const html = render(`/needs/${key}`)
      expect(html).toContain('找不到這個需求')
      expect(html).toContain('href="/needs"')
      expect(tabNames(html)).toEqual([])
    }
  })
})

describe('the need page tabs', () => {
  it('總覽: issue, 優先順序, 理由, the dates, and no 解法涵蓋 row for a covered need', () => {
    const html = render('/needs/2-N01')
    expect(activeTab(html)).toBe('總覽')
    expect(html).toContain('分析整理出的需求')
    expect(html).toContain('href="/issues/2"')
    expect(html).toContain('>優先順序</dt>')
    expect(html).toContain('>理由</dt>')
    expect(html).toContain('>新增日期</dt>')
    expect(html).toContain('>更新日期</dt>')
    expect(html).not.toContain('>解法涵蓋</dt>')
  })

  it('總覽 of a W need says 這次不做, and the page has no 解法 tab (2-O09-US01)', () => {
    const html = render('/needs/2-O09-US01')
    expect(html).toContain('這次不做，所以沒有解法涵蓋')
    expect(tabNames(html).some((n) => n.startsWith('解法'))).toBe(false)
  })

  it('總覽 of a need with no solution says 尚未有解法涵蓋 (8-I01-US11)', () => {
    expect(render('/needs/8-I01-US11')).toContain('尚未有解法涵蓋')
  })

  it('總覽 of a need in an X-N group shows the X-N label (2-N07)', () => {
    const html = render('/needs/2-N07')
    expect(html).toContain('>跨議題的共同需求</dt>')
    expect(html).toContain('X-N2')
  })

  it('使用者故事: the story cards of the need', () => {
    const html = render('/needs/2-N01/stories')
    expect(storyCards(html)).toEqual(items.find((i) => i.key === '2-N01')!.stories.map((s) => s.id))
  })

  it('利害關係人: the stakeholders of its stories', () => {
    const html = render('/needs/2-N01/stakeholders')
    for (const id of items.find((i) => i.key === '2-N01')!.stakeholders) expect(html).toContain(`href="/stakeholders/${id}"`)
  })

  it('解法: the parts by how they cover the need, the X- solutions after the issue solutions', () => {
    const html = render('/needs/2-N05/solutions')
    expect(html).toContain('列為「必須有」的解法')
    const firstIssue = html.indexOf('href="/solutions/2-S')
    const firstCross = html.indexOf('href="/solutions/X-S1')
    expect(firstIssue).toBeGreaterThan(-1)
    expect(firstCross).toBeGreaterThan(firstIssue)
    // 1-N06 is covered by X-S1 only through its X-N group.
    expect(render('/needs/1-N06/solutions')).toContain('透過跨議題的共同需求涵蓋的解法')
  })

  it('衝突: the issue conflicts and the cross-issue conflicts', () => {
    const html = render('/needs/2-N01/conflicts')
    expect(html).toContain('本議題的衝突')
    expect(html).toContain('href="/issues/2/conflicts?focus=C1"')
    expect(html).toContain('跨議題的衝突')
    expect(html).toContain('X-C1')
    expect(html).toContain('X-C2')
  })

  it('衝突 lists a cross-issue conflict that names its X-N group (2-N07 in X-N2)', () => {
    const html = render('/needs/2-N07/conflicts')
    expect(html).toContain('X-C1')
  })

  it('其他議題的相同需求: the other needs of its X-N group, each linking to its page', () => {
    const html = render('/needs/2-N07/same-needs')
    expect(html).toContain('X-N2')
    expect(html).toContain('href="/needs/1-N08"')
    expect(html).toContain('href="/needs/8-I06-US01"')
    // The need itself is not in the list (only the side menu links to it).
    const panel = html.slice(html.indexOf('role="tabpanel"'))
    expect(panel).not.toContain('href="/needs/2-N07"')
  })

  it('without cross-issue.json there is no cross-issue part', () => {
    state.crossReady = false
    const html = render('/needs/2-N07')
    expect(tabNames(html).some((n) => n.startsWith('其他議題的相同需求'))).toBe(false)
    expect(html).not.toContain('>跨議題的共同需求</dt>')
  })

  it('never writes 市民意見 or 1999 in its own text', () => {
    // The analysis text (for example a story source) is data, not page text.
    const own = JSON.stringify([t.needPage, t.backLink.needs], (_k, v: unknown) =>
      typeof v === 'function' ? String(v) : v)
    expect(own).not.toContain('市民意見')
    expect(own).not.toContain('1999')
  })
})

describe('只看有資料根據 on the need page', () => {
  it('使用者故事 shows only the stories with a data basis', () => {
    const all = storyCards(render('/needs/2-N01/stories'))
    const shown = storyCards(render('/needs/2-N01/stories?evidence=1'))
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(all.length)
  })

  it('總覽 and the tab counts do not change', () => {
    const on = render('/needs/2-N01?evidence=1')
    expect(tabNames(on)).toEqual(tabNames(render('/needs/2-N01')))
    expect(on).toContain('>優先順序</dt>')
  })

  it('解法 is empty for a need with no data basis, with a note', () => {
    const need = items.find((i) => i.solutions.length > 0 && !needHasDataBasis(i))
    expect(need).toBeDefined()
    const html = render(`/needs/${need!.key}/solutions?evidence=1`)
    expect(html).toContain('這個需求的故事，以便…都沒有標記 [實證] 或 [AI整理]。')
    expect(html).not.toContain('href="/solutions/')
  })

  it('解法 stays for a need with a data basis', () => {
    const need = items.find((i) => i.solutions.length > 0 && needHasDataBasis(i))
    expect(need).toBeDefined()
    expect(render(`/needs/${need!.key}/solutions?evidence=1`)).toContain(`href="/solutions/${need!.solutions[0]}`)
  })

  it('其他議題的相同需求 keeps only the needs with a data basis; its links keep ?evidence=1', () => {
    const others = ['1-N08', '8-I06-US01'].map((k) => items.find((i) => i.key === k)!)
    const html = render('/needs/2-N07/same-needs?evidence=1')
    for (const o of others) {
      if (needHasDataBasis(o)) expect(html).toContain(`href="/needs/${o.key}?evidence=1"`)
      else expect(html).not.toContain(`href="/needs/${o.key}`)
    }
  })
})
