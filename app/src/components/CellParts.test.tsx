// A step 7 cell with several tags (ETBlue, 2026-10-22; design decision 101).
// Each part shows its own tag badge. The 「只看有資料根據」 filter does not
// change the step 7 tables, so the [AI模擬] parts stay when it is on.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { OverviewTab } from '@/components/solution/OverviewTab'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { Cell, IndexFile, IssueFile, Solution } from '@/types'
import { CellParts } from './CellParts'

const index = indexJson as IndexFile
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

describe('the step 7 table on the solution page', () => {
  const base = trashcans.solutions.find((s) => s.id === 'A') as Solution
  const sol: Solution = {
    ...base,
    detail: base.detail.map((r) => (r.item === '隱私' ? { ...r, content: mixed } : r)),
  }

  function render(search: string): string {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[`/solutions/2-A${search}`]}>
        <OverviewTab index={index} issue={trashcans} solution={sol} />
      </MemoryRouter>,
    )
  }

  it('shows every part of a mixed cell with its badge', () => {
    const html = render('')
    for (const p of mixed) expect(html).toContain(p.text)
  })

  it('is not changed by the 只看有資料根據 filter: the [AI模擬] part stays', () => {
    const on = render('?evidence=1')
    // The filter is on: the links of the page keep it.
    expect(on).toContain('evidence=1')
    expect(render('')).not.toContain('evidence=1')
    expect(on).toContain('推想的部分')
    expect(on).toContain('官方資料的部分')
    expect(on).toContain('新聞的部分')
    // The step 7 section is the same with the filter on and off.
    // The list of step 7 rows: the <dl> after the 總覽 box of the section.
    const section = (html: string) => {
      const start = html.indexOf('<dl class="mt-4 space-y-4">', html.indexOf('id="solution-detail"'))
      expect(start).toBeGreaterThan(-1)
      return html.slice(start, html.indexOf('</dl>', start))
    }
    expect(section(on)).toContain('推想的部分')
    expect(section(on)).toBe(section(render('')))
  })
})
