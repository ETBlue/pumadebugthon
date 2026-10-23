// #/spaces (design 3.9, decisions 120 and 122) and the back button of the
// space page.
// The data hooks and the page title are mocked, so the pages render on the
// server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { t } from '@/i18n/zh-TW'
import { forgetListSearches, rememberListSearch } from '@/lib/backLink'
import { listParamsOf, listUrlSearch } from '@/lib/listParams'
import { issuesBySpace, solutionsBySpace, spaceStakeholderCount, stakeholdersBySpace } from '@/lib/spaces'
import type { IndexFile, IssueFile } from '@/types'
import Space from './Space'
import Spaces from './Spaces'

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

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

beforeEach(() => {
  state.issuesReady = true
  forgetListSearches()
})

function render(search = ''): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/spaces${search}`]}>
      <Spaces />
    </MemoryRouter>,
  )
}

/** The HTML of the card of one space. */
function card(html: string, code: string): string {
  const at = html.indexOf(`href="/spaces/${code}"`)
  expect(at).toBeGreaterThan(-1)
  const start = html.lastIndexOf('<article', at)
  return html.slice(start, html.indexOf('</article>', start))
}

describe('#/spaces', () => {
  it('has a hidden h1 and the 4 groups as h2, in the fixed order', () => {
    const html = render()
    expect(html).toMatch(/<h1 class="sr-only">空間<\/h1>/)
    const h2 = [...html.matchAll(/<h2 [^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    // The order the groups first appear in index.spaceTypes. Not by count.
    expect(h2).toEqual(['道路', '地下', '公共空間', '建築'])
  })

  it('shows 13 cards, one per space type, in the order of index.spaceTypes', () => {
    const html = render()
    const codes = [...html.matchAll(/<article[^>]*>\s*<h3[^>]*><a [^>]*href="\/spaces\/([^"]+)"/g)].map((m) => m[1])
    expect(codes).toEqual(index.spaceTypes.map((s) => s.code))
    expect(codes).toHaveLength(13)
  })

  it('shows the code, the description, and the same counts as the space page', () => {
    const html = render()
    const c = card(html, 'sidewalk')
    expect(c).toContain('>sidewalk</p>')
    expect(c).toContain('道路兩側供行人通行的空間。')
    expect(c).not.toContain('border-dashed')
    // The same helpers as Space.tsx, with the files of the issues that use it.
    const numbers = issuesBySpace(index, 'sidewalk').map((i) => i.number)
    const used = issueFiles.filter((f) => numbers.includes(f.number))
    expect(numbers).toEqual([1, 2, 8])
    expect(spaceStakeholderCount(stakeholdersBySpace(used, 'sidewalk'))).toBe(50)
    expect(solutionsBySpace(used, 'sidewalk')).toHaveLength(14)
    expect(c).toContain('<dt class="text-muted-foreground">議題</dt><dd>3 個')
    expect(c).toContain('href="/issues/1"')
    expect(c).toContain('#1 把三千棵樹種回來')
    expect(c).toContain('<dt class="text-muted-foreground">利害關係人</dt><dd>50 位</dd>')
    expect(c).toContain('<dt class="text-muted-foreground">解法</dt><dd>14 個</dd>')
    // A space with one issue.
    const indoor = card(html, 'indoor')
    expect(indoor).toContain('<dd>1 個')
    expect(indoor).toContain('<dt class="text-muted-foreground">利害關係人</dt><dd>3 位</dd>')
    expect(indoor).toContain('<dt class="text-muted-foreground">解法</dt><dd>1 個</dd>')
  })

  it('shows 尚無議題 and a dashed border for a space with no analyzed issue', () => {
    const c = card(render(), 'parking')
    expect(c).toContain('border-dashed')
    expect(c).toContain('尚無議題')
    expect(c).not.toContain('<dl')
    expect(card(render(), 'sidewalk')).not.toContain('尚無議題')
  })

  it('never shows a wrong 0 while the issue files load', () => {
    state.issuesReady = false
    const html = render()
    expect(html).toContain('載入中…')
    const c = card(html, 'sidewalk')
    expect(c).toContain('<dd>3 個')
    expect(c).not.toContain('利害關係人')
    expect(c).not.toContain('>解法<')
    expect(html).not.toContain('0 位')
  })
})

describe('the space page back button', () => {
  it('goes to #/spaces with 回到空間列表', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/spaces/sidewalk']}>
        <Routes>
          <Route path="/spaces/:code" element={<Space />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(html).toMatch(/<a [^>]*href="\/spaces"[^>]*>[\s\S]*?回到空間列表<\/span><\/a><h1[^>]*>人行道/)
    expect(html).not.toContain('回到議題列表')
  })

  it('keeps the last filters and search of #/spaces (decision 122)', () => {
    rememberListSearch('spaces', `?q=park&group=${encodeURIComponent('道路')}`)
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/spaces/sidewalk']}>
        <Routes>
          <Route path="/spaces/:code" element={<Space />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(html).toContain(`href="/spaces?q=park&amp;group=${encodeURIComponent('道路')}"`)
  })

  it('shows 新增日期 and 更新日期 of the space type, and the card shows only 更新日期 (decision 131)', () => {
    // The fixture has no dates on the space types, so this test sets them.
    const space = index.spaceTypes.find((s) => s.code === 'sidewalk')!
    const saved = { added: space.added, updated: space.updated }
    Object.assign(space, { added: '2026-10-18', updated: '2026-10-19' })
    try {
      const page = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/spaces/sidewalk']}>
          <Routes>
            <Route path="/spaces/:code" element={<Space />} />
          </Routes>
        </MemoryRouter>,
      )
      expect(page).toContain(`${t.dates.added}</dt><dd><time dateTime="2026-10-18">2026-10-18</time>`)
      expect(page).toContain(`${t.dates.updated}</dt><dd><time dateTime="2026-10-19">2026-10-19</time>`)
      const shown = card(render(), 'sidewalk')
      expect(shown).toContain(`${t.dates.updated}</dt><dd><time dateTime="2026-10-19">2026-10-19</time>`)
      expect(shown).not.toContain(t.dates.added)
    } finally {
      Object.assign(space, saved)
    }
  })
})

/** The codes of the cards, in page order. */
function cardCodes(html: string): string[] {
  return [...html.matchAll(/<article[^>]*>\s*<h3[^>]*><a [^>]*href="\/spaces\/([^"]+)"/g)].map((m) => m[1])
}

/** The text of the result line under the bar (the one with 清除篩選). */
function resultLine(html: string): string {
  const all = [...html.matchAll(/<p role="status"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''))
  expect(all.length).toBeGreaterThan(0)
  return all[all.length - 1]
}

const GROUP_ROAD = encodeURIComponent('道路')
const GROUP_BUILDING = encodeURIComponent('建築')

describe('#/spaces bar (decision 122)', () => {
  it('has the shared bar with the 空間分類 and 議題 filters and the search, and no sort', () => {
    const html = render()
    expect(html).toContain('aria-label="搜尋、排序與篩選"')
    expect(html).toContain('空間分類')
    expect(html).toContain('議題：全部')
    expect(html).not.toContain('<select')
    expect(html).not.toContain('>排序</label>')
    // The search box: 「搜尋空間」 with the hidden page name.
    expect(html).toMatch(/搜尋<span class="sr-only">空間<\/span>/)
    expect(html).toContain('placeholder="輸入代號或名稱"')
    // The order: the filters, then the search (decision 114).
    expect(html.indexOf('空間分類')).toBeLessThan(html.indexOf('placeholder="輸入代號或名稱"'))
  })

  it('shows every space and the result line with no filter', () => {
    const html = render()
    expect(cardCodes(html)).toHaveLength(13)
    expect(resultLine(html)).toBe('顯示 13 個空間，共 13 個。')
  })

  it('narrows the cards by 空間分類, keeps the group headings, and hides empty groups', () => {
    const html = render(`?group=${GROUP_ROAD}&group=${GROUP_BUILDING}`)
    expect(cardCodes(html)).toEqual(['sidewalk', 'arcade', 'bike-lane', 'scooter-lane', 'car-lane', 'bus-stop', 'indoor', 'building-shell'])
    const h2 = [...html.matchAll(/<h2 [^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    expect(h2).toEqual(['道路', '建築'])
    // The heading ids do not change when a group is hidden.
    expect(html).toContain('id="space-group-3"')
    expect(resultLine(html)).toBe('顯示 8 個空間，共 13 個。篩選：空間分類：道路、建築。 清除篩選')
    expect(html).toContain('空間分類：2')
  })

  it('narrows the cards by 議題: the spaces that any picked issue uses', () => {
    const html = render('?issue=1')
    expect(cardCodes(html)).toEqual(['sidewalk', 'bike-lane', 'utility', 'park'])
    expect(resultLine(html)).toBe('顯示 4 個空間，共 13 個。篩選：議題：#1。 清除篩選')
  })

  it('narrows the cards by the search: the whole code or a part of the name', () => {
    expect(cardCodes(render('?q=bike-lane'))).toEqual(['bike-lane'])
    const html = render(`?q=${encodeURIComponent('建築物')}`)
    expect(cardCodes(html)).toEqual(['indoor', 'building-shell'])
    expect(resultLine(html)).toBe('顯示 2 個空間，共 13 個。篩選：搜尋「建築物」。 清除篩選')
  })

  it('writes the filters and the search to the URL, and cleans unknown values', () => {
    const read = (search: string) => listParamsOf('spaces', new URLSearchParams(search), index)
    const picked = read(`q=park&issue=8&group=${GROUP_ROAD}`)
    expect(picked.replace).toBe(false)
    expect(listUrlSearch('spaces', picked)).toBe(`?q=park&issue=8&group=${GROUP_ROAD}`)
    // An unknown group, 「跨議題」, an issue with no space and a sort are dropped.
    const dirty = read('group=nope&issue=X&issue=9&sort=added')
    expect(dirty.replace).toBe(true)
    expect(listUrlSearch('spaces', dirty)).toBe('')
    // The page shows the clean state while the URL is replaced.
    expect(cardCodes(render('?group=nope&issue=X'))).toHaveLength(13)
  })

  it('shows the empty state with 清除搜尋 and 清除篩選', () => {
    const html = render(`?q=xyz&group=${GROUP_ROAD}`)
    expect(cardCodes(html)).toEqual([])
    expect(html).toContain('找不到符合「xyz」和目前篩選的空間。')
    expect(html).toContain(`href="/spaces?group=${GROUP_ROAD}"`)
    expect(html).toMatch(/href="\/spaces"[^>]*>清除篩選/)
    // Filters only.
    const none = render(`?issue=1&group=${GROUP_BUILDING}`)
    expect(none).toContain('沒有符合目前篩選的空間。')
    expect(none).not.toContain('清除搜尋</a>')
  })
})
