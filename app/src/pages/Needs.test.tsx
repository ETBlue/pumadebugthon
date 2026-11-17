// #/needs (plan-needs.md, Task N3): the bar, the result line, the intro
// line, the sort note, the cards and the empty state. The data hooks and the
// page title are mocked, so the page renders on the server with the
// fixtures (99 needs in #1, #2, #8 and #9).
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { METHOD_URL } from '@/components/links'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { t } from '@/i18n/zh-TW'
import { filterNeeds, NO_FILTERS } from '@/lib/listFilter'
import { DEFAULT_LIST_STATE } from '@/lib/listParams'
import { needListItems, needListView } from '@/lib/needList'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import Needs from './Needs'

const index = indexJson as IndexFile
const cross = crossJson as CrossIssueFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]
const items = needListItems(issueFiles, cross)
const total = items.length

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssues: () => ({ status: 'ready', data: issueFiles }),
  useCrossIssue: () => ({ status: 'ready', data: cross }),
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

function render(search: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/needs${search}`]}>
      <Needs />
    </MemoryRouter>,
  )
}

/** The text of the last result line (the one above the cards). */
function resultLine(html: string): string {
  const all = [...html.matchAll(/<p role="status"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''))
  return all[all.length - 1]
}

/** The keys of the cards, in the page order. The title is the first need
 * link of a card. */
const cards = (html: string) => [...html.matchAll(/<li[^>]*>[\s\S]*?href="\/needs\/([^"/?]+)/g)].map((m) => m[1])

/** The text of the bar buttons of the choices filters. */
const buttons = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<svg/g)].map((m) => m[1]).filter((x) => x !== '')

/** The labels of the toggle filters in the bar. */
const toggles = (html: string) => [...html.matchAll(/<button[^>]*aria-pressed="(?:true|false)"[^>]*>[\s\S]*?<\/svg>([^<]*)<\/button>/g)].map((m) => m[1])

describe('#/needs', () => {
  it('shows every need, in the order of 最近更新 by default', () => {
    const html = render('')
    expect(cards(html)).toEqual(needListView(items, DEFAULT_LIST_STATE).map((r) => r.key))
    expect(cards(html)).toHaveLength(total)
    expect(resultLine(html)).toBe(`顯示 ${total} 個需求，共 ${total} 個。`)
  })

  it('has the filters in the order of the plan: 議題, 利害關係人, 空間類型, 領域, 優先順序, 解法涵蓋, then the toggle (no 解法, decision 223)', () => {
    const html = render('')
    expect(buttons(html)).toEqual(['議題：全部', '空間類型', '領域', '優先順序', '解法涵蓋'])
    // The stakeholder picker sits between 議題 and 空間類型.
    const picker = html.indexOf('瀏覽')
    expect(picker).toBeGreaterThan(html.indexOf('議題：全部'))
    expect(picker).toBeLessThan(html.indexOf('>空間類型<'))
    expect(toggles(html)).toEqual(['只看有資料根據'])
    // 「跨議題」 is a pick of the 議題 filter (issue=X), not a toggle.
    expect(buttons(render('?issue=X'))).toContain('議題：1')
    expect(resultLine(render('?issue=X'))).toContain('篩選：議題：跨議題。')
  })

  it('has the sorts 最近更新, 最近新增 and 資料根據比例', () => {
    const html = render('')
    const options = [...html.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1])
    expect(options).toEqual(['updated', 'added', 'evidence'])
  })

  it('sort=added and sort=evidence give the order of sortNeeds', () => {
    expect(cards(render('?sort=added'))).toEqual(needListView(items, { ...DEFAULT_LIST_STATE, sort: 'added' }).map((r) => r.key))
    expect(cards(render('?sort=evidence'))).toEqual(needListView(items, { ...DEFAULT_LIST_STATE, sort: 'evidence' }).map((r) => r.key))
  })

  it('shows the sort note and the share on the cards only with 資料根據比例', () => {
    const note = t.listBar.sortNotes.evidence
    const html = render('?sort=evidence')
    expect(html).toContain(note)
    expect(html).toMatch(/aria-describedby="[^"]+"/)
    expect(html).toContain('實證＋AI整理')
    const plain = render('')
    expect(plain).not.toContain(note)
    expect(plain).not.toContain('實證＋AI整理')
  })

  it('has the intro line with the link to method.md, and never says 市民意見 or 1999', () => {
    const html = render('')
    expect(html).toContain(t.needsList.intro)
    expect(html).toContain('分析整理出的需求')
    expect(html).toContain(`href="${METHOD_URL}"`)
    // The page's own text. The analysis text on the cards and the
    // stakeholder names in the picker (for example a city hotline as a
    // stakeholder) are data, so the check uses a search that shows no card
    // and removes the stakeholder names.
    const withoutNames = (html: string) => index.stakeholders.reduce((h, s) => h.replaceAll(s.name, ''), html)
    const own = [
      withoutNames(render('?q=%E7%81%AB%E7%AE%AD')),
      withoutNames(render('?sort=evidence&q=%E7%81%AB%E7%AE%AD')),
      JSON.stringify(t.needsList),
    ]
    for (const text of own) {
      expect(text).not.toContain('市民意見')
      expect(text).not.toContain('1999')
    }
  })

  it('priority=: the picked MoSCoW, with the result line', () => {
    const html = render('?priority=M')
    const m = items.filter((r) => r.need.priority === 'M')
    expect(cards(html)).toHaveLength(m.length)
    expect(resultLine(html)).toBe(`顯示 ${m.length} 個需求，共 ${total} 個。篩選：優先順序：必須有。 清除篩選`)
    expect(buttons(html)).toContain('優先順序：1')
  })

  it('a W need says 這次不做 and is in 尚無', () => {
    const html = render('?priority=W&covered=no')
    expect(cards(html)).toEqual(['2-O09-US01'])
    expect(html).toContain('這次不做')
    expect(cards(render('?priority=W&covered=yes'))).toEqual([])
  })

  it('covered=, issue=X, issue=, who=, space=, domain= and basis=1 filter the cards', () => {
    const check = (search: string, filter: Partial<typeof NO_FILTERS>) =>
      expect(new Set(cards(render(search)))).toEqual(new Set(filterNeeds(items, { ...NO_FILTERS, ...filter }).map((r) => r.key)))
    check('?covered=no', { coverage: ['no'] })
    check('?issue=X', { crossChoice: true })
    check('?issue=8', { issues: [8] })
    check('?who=I06', { who: 'I06' })
    check('?space=park', { spaces: ['park'] })
    check(`?domain=${issueFiles[0].domains[0]}`, { domains: [issueFiles[0].domains[0]] })
    check('?basis=1', { dataBased: true })
    expect(cards(render('?basis=1')).length).toBeGreaterThan(0)
  })

  it('ignores an old solution= URL and shows the whole list (decision 223)', () => {
    const html = render('?solution=2-S1')
    expect(cards(html)).toHaveLength(total)
    expect(resultLine(html)).toBe(`顯示 ${total} 個需求，共 ${total} 個。`)
  })

  it('names every filter that is on in the result line, in the bar order', () => {
    const html = render('?issue=X&issue=2&space=park&priority=M&covered=yes&basis=1')
    expect(resultLine(html)).toMatch(
      /篩選：議題：跨議題、#2；空間類型：[^；]+；優先順序：必須有；解法涵蓋：有；只看有資料根據。 清除篩選$/,
    )
  })

  it('a card links to the need page and shows the facts, the X-N group and the date', () => {
    const html = render('?issue=1')
    const n05 = items.find((r) => r.key === '1-N05')!
    expect(html).toContain('href="/needs/1-N05"')
    expect(html).toContain(`使用者故事 ${n05.stories.length} 則 · 解法 ${n05.solutions.length} 個`)
    expect(html).toContain('X-N1')
    expect(html).toContain(`<time dateTime="${n05.need.updated}">`)
    // A card shows no 新增日期 (decision 131).
    expect(html).not.toContain('新增日期')
  })

  it('with basis=1, the card links carry ?evidence=1 for the need page', () => {
    expect(render('?basis=1')).toMatch(/href="\/needs\/[^"?]+\?evidence=1"/)
    expect(render('')).not.toMatch(/href="\/needs\/[^"?]+\?evidence=1"/)
  })

  it('shows the empty state with 清除篩選, which removes the need params and keeps the sort', () => {
    const html = render('?sort=added&priority=W&covered=yes')
    expect(cards(html)).toEqual([])
    expect(html).toContain('沒有符合目前篩選的需求。')
    expect(html).toContain('href="/needs?sort=added"')
  })

  it('shows the search empty state', () => {
    const html = render('?q=%E7%81%AB%E7%AE%AD%E7%99%BB%E6%9C%88')
    expect(html).toContain('找不到符合「火箭登月」的需求。')
  })

  it('searches the summary and the story text', () => {
    const n01 = items.find((r) => r.key === '1-N01')!
    const q = n01.stories[0].want.text
    expect(cards(render(`?q=${encodeURIComponent(q)}`))).toContain('1-N01')
  })
})
