// A step 7 cell with several tags (ETBlue, 2026-10-22; design decision 101).
// Each part shows its own tag badge. With the 「只看有資料根據」 filter on,
// the [AI模擬] parts are hidden (ETBlue, 2026-10-22; decision 105).
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
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

describe('the step 7 table on the solution page', () => {
  const base = trashcans.solutions.find((s) => s.id === 'A') as Solution
  const sol: Solution = {
    ...base,
    detail: base.detail.map((r) => (r.item === '隱私' ? { ...r, content: mixed } : r)),
  }

  function render(search: string): string {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[`/solutions/2-A${search}`]}>
        <OverviewTab issue={trashcans} solution={sol} />
      </MemoryRouter>,
    )
  }

  it('shows every part of a mixed cell with its badge', () => {
    const html = render('')
    for (const p of mixed) expect(html).toContain(p.text)
  })

  it('follows the 只看有資料根據 filter in the URL: the [AI模擬] part is hidden', () => {
    const on = render('?evidence=1')
    const off = render('')
    // The step 7 section has the toggle, pressed when the filter is on.
    expect(on).toContain('只看有資料根據')
    expect(on).toMatch(/aria-pressed="true"/)
    expect(off).toMatch(/aria-pressed="false"/)
    // The list of step 7 rows: the <dl> after the 總覽 box of the section.
    const section = (html: string) => {
      const start = html.indexOf('<dl class="mt-4 space-y-4">', html.indexOf('id="solution-detail"'))
      expect(start).toBeGreaterThan(-1)
      return html.slice(start, html.indexOf('</dl>', start))
    }
    expect(section(off)).toContain('推想的部分')
    expect(section(on)).not.toContain('推想的部分')
    expect(section(on)).toContain('官方資料的部分')
    expect(section(on)).toContain('新聞的部分')
    // The other rows of #2 A are all [AI模擬], so they show the note.
    expect(section(on)).toContain('這一格只有標記 [AI模擬] 的內容。')
    // The 總覽 box of step 7 (成本, 可行性, 主要風險, 主責單位) follows it too.
    const box = (html: string) => html.slice(html.indexOf('id="solution-overview"'), html.indexOf('<dl class="mt-4 space-y-4">'))
    expect(box(on)).toContain('這一格只有標記 [AI模擬] 的內容。')
    expect(box(off)).not.toContain('這一格只有')
  })
})
