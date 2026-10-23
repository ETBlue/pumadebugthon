// A step 7 cell with several tags (ETBlue, 2026-10-22; design decision 101).
// Each part shows its own tag badge. With the 「只看有資料根據」 filter on,
// the [AI模擬] parts are hidden (ETBlue, 2026-10-22; decision 105).
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ConcernsTab } from '@/components/solution/ConcernsTab'
import { OverviewTab } from '@/components/solution/OverviewTab'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { Cell, IssueFile, Solution } from '@/types'
import { CellParts } from './CellParts'

const trashcans = trashcansJson as IssueFile

const part = (tag: Cell['tag'], text: string): Cell => ({ text, tag, pending: false })
const mixed: Cell[] = [
  part('AI模擬', '推想的部分'),
  part('實證', '官方資料的部分'),
  part('AI整理', '新聞的部分'),
]

/** The badge texts in the HTML, in order. */
function badges(html: string): string[] {
  return [...html.matchAll(/data-slot="badge"[^>]*>([^<]+)</g)].map((m) => m[1])
}

describe('CellParts', () => {
  it('shows each part with its own tag badge, in file order', () => {
    const html = renderToStaticMarkup(<CellParts parts={mixed} />)
    expect(badges(html)).toEqual(['AI模擬', '實證', 'AI整理'])
    const at = (s: string) => html.indexOf(s)
    expect(at('推想的部分')).toBeGreaterThan(-1)
    expect(at('推想的部分')).toBeLessThan(at('官方資料的部分'))
    expect(at('官方資料的部分')).toBeLessThan(at('新聞的部分'))
  })

  it('shows a cell with one part the same way as before', () => {
    const html = renderToStaticMarkup(<CellParts parts={[part('AI模擬', '只有一個標記')]} />)
    expect(badges(html)).toEqual(['AI模擬'])
    expect(html).toContain('只有一個標記')
  })

  it('shows a 【待補】 part without a badge', () => {
    const html = renderToStaticMarkup(<CellParts parts={[{ text: '【待補：法務確認】', tag: null, pending: true }]} />)
    expect(badges(html)).toEqual([])
    expect(html).toContain('【待補：法務確認】')
  })
})

describe('CellParts with the 只看有資料根據 filter (decision 105)', () => {
  it('hides the [AI模擬] parts and keeps [實證] and [AI整理], in file order', () => {
    const html = renderToStaticMarkup(<CellParts parts={mixed} dataBasedOnly />)
    expect(badges(html)).toEqual(['實證', 'AI整理'])
    expect(html).not.toContain('推想的部分')
    expect(html).not.toContain('這一格只有')
  })

  it('shows a short note when every part is [AI模擬]', () => {
    const html = renderToStaticMarkup(<CellParts parts={[part('AI模擬', 'A'), part('AI模擬', 'B')]} dataBasedOnly />)
    expect(badges(html)).toEqual([])
    expect(html).toContain('這一格只有標記 [AI模擬] 的內容。')
    expect(html).not.toContain('>A<')
  })

  it('keeps a 【待補】 part', () => {
    const pending: Cell = { text: '【待補：法務確認】', tag: null, pending: true }
    const html = renderToStaticMarkup(<CellParts parts={[part('AI模擬', '推想'), pending]} dataBasedOnly />)
    expect(html).toContain('【待補：法務確認】')
    expect(html).not.toContain('推想')
  })

  it('with the filter off shows every part', () => {
    expect(badges(renderToStaticMarkup(<CellParts parts={mixed} dataBasedOnly={false} />))).toEqual(['AI模擬', '實證', 'AI整理'])
  })
})

describe('a step 7 cell on the solution page (decision 140)', () => {
  const base = trashcans.solutions.find((s) => s.id === 'A') as Solution
  const sol: Solution = {
    ...base,
    evaluation: { ...base.evaluation, privacy: mixed },
  }

  // 隱私 is on the 可能爭議 tab now; the 概覽 block stays on 總覽.
  function render(search: string, tab: 'overview' | 'controversies'): string {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[`/solutions/2-A${search}`]}>
        {tab === 'overview' ? (
          <OverviewTab issue={trashcans} solution={sol} />
        ) : (
          <ConcernsTab tab="controversies" solution={sol} targetOf={() => null} step7Source="來源" />
        )}
      </MemoryRouter>,
    )
  }

  it('shows every part of a mixed cell with its badge', () => {
    const html = render('', 'controversies')
    for (const p of mixed) expect(html).toContain(p.text)
  })

  it('follows the 只看有資料根據 filter in the URL: the [AI模擬] part is hidden', () => {
    const on = render('?evidence=1', 'controversies')
    const off = render('', 'controversies')
    // The tab has the toggle, pressed when the filter is on.
    expect(on).toContain('只看有資料根據')
    expect(on).toMatch(/aria-pressed="true"/)
    expect(off).toMatch(/aria-pressed="false"/)
    expect(off).toContain('推想的部分')
    expect(on).not.toContain('推想的部分')
    expect(on).toContain('官方資料的部分')
    expect(on).toContain('新聞的部分')
    // The 概覽 block of 總覽 (成本, 可行性, 主要風險, 主責單位) follows it too:
    // the cells of #2 A are all [AI模擬], so they show the note.
    const box = (html: string) => html.slice(html.indexOf('id="solution-overview"'), html.indexOf('</dl>'))
    expect(box(render('?evidence=1', 'overview'))).toContain('這一格只有標記 [AI模擬] 的內容。')
    expect(box(render('', 'overview'))).not.toContain('這一格只有')
  })
})
