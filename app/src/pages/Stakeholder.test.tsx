// The stakeholder page. (1) The metadata at the top of 總覽 (decisions 111
// and 118): 分類路徑, 資料根據 and the dates are the same as on the card of
// #/stakeholders. (2) The 解法 tab (design 3.3, decision 119): the tab label
// and the tree view of #/stakeholders count the same solutions
// (stakeholderSolutionCount), and the tab lists every counted solution: the
// issue solutions per issue, then 「跨議題解法」. The data hooks and the page
// title are mocked, so the pages render on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import discoveryJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { t } from '@/i18n/zh-TW'
import { stakeholderSolutionCount } from '@/lib/coverage'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import Stakeholder from './Stakeholder'
import Stakeholders from './Stakeholders'

const files: Record<string, IssueFile> = {
  '1-trees': treesJson as IssueFile,
  '2-trashcans': trashcansJson as IssueFile,
  '8-smokefree': smokefreeJson as IssueFile,
  '9-policydiscovery': discoveryJson as IssueFile,
}

const index = indexJson as IndexFile
const allFiles = Object.values(files)
const cross = crossJson as CrossIssueFile

// The issue files are ready, unless a test sets loading. cross: the state
// of cross-issue.json. 'none' is a site with no such file.
type CrossState = 'none' | 'ready' | 'loading' | 'error'
// crossFile and override replace the fixture files in a test.
const state: { loading: boolean; cross: CrossState; crossFile: CrossIssueFile | null; override: Record<string, IssueFile> } = {
  loading: false, cross: 'none', crossFile: null, override: {},
}
const filesNow = (): Record<string, IssueFile> => ({ ...files, ...state.override })
const crossNow = (): CrossIssueFile => state.crossFile ?? cross

function crossState() {
  if (state.cross === 'none') return { status: 'ready', data: null }
  if (state.cross === 'ready') return { status: 'ready', data: crossNow() }
  if (state.cross === 'loading') return { status: 'loading', message: '' }
  return { status: 'error', message: '', error: new Error('x') }
}

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: indexJson as IndexFile }),
  useIssues: (folders: string[]) =>
    state.loading
      ? { status: 'loading' }
      : { status: 'ready', data: folders.filter((f) => f in filesNow()).map((f) => filesNow()[f]) },
  useCrossIssue: () => crossState(),
  useCrossIssueOrNull: () => (state.cross === 'ready' ? crossNow() : null),
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

function renderPage(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="stakeholders" element={<Stakeholders />} />
        <Route path="stakeholders/:id/:tab?" element={<Stakeholder />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The <dd> after the <dt> with this label, from the given start. */
function fieldValue(html: string, label: string, from = 0): string {
  const dt = html.indexOf(`>${label}</dt>`, from)
  expect(dt).toBeGreaterThan(-1)
  const start = html.indexOf('<dd>', dt) + '<dd>'.length
  // CellBasis has no <dd> or <dl> inside, so the first </dd> ends the value.
  return html.slice(start, html.indexOf('</dd>', start))
}

/** The part of #/stakeholders that is the card of this stakeholder. */
function cardOf(html: string, id: string): string {
  const start = html.indexOf(`href="/stakeholders/${id}"`)
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</article>', start))
}

describe('the 總覽 metadata of the stakeholder page (decision 118)', () => {
  beforeEach(() => {
    state.loading = false
    state.cross = 'none'
  })

  it('shows 新增日期 and 更新日期 as <time> fields, as on the card', () => {
    const html = renderPage('/stakeholders/I06')
    expect(fieldValue(html, t.dates.added)).toBe('<time dateTime="2026-10-18">2026-10-18</time>')
    expect(fieldValue(html, t.dates.updated)).toBe('<time dateTime="2026-10-20">2026-10-20</time>')
  })

  it('shows 分類路徑 with the same text as the card on #/stakeholders', () => {
    const page = fieldValue(renderPage('/stakeholders/I06'), t.stakeholderPage.path)
    const card = fieldValue(cardOf(renderPage('/stakeholders?q=I06'), 'I06'), t.stakeholdersList.path)
    expect(page).toBe('個人 › 用路人')
    expect(page).toBe(card)
  })

  it('shows 資料根據（各議題合計） with the same bar as the card on #/stakeholders', () => {
    const page = fieldValue(renderPage('/stakeholders/I06'), t.stakeholdersList.basis)
    const card = fieldValue(cardOf(renderPage('/stakeholders?q=I06'), 'I06'), t.stakeholdersList.basis)
    expect(page).not.toBe('')
    expect(page).toBe(card)
    // Once on the page.
    expect(renderPage('/stakeholders/I06').split(t.stakeholdersList.basis).length - 1).toBe(1)
  })

  it('keeps an invisible 資料根據 row while the issue files load', () => {
    state.loading = true
    const html = renderPage('/stakeholders/I06')
    const dt = html.indexOf(`>${t.stakeholdersList.basis}</dt>`)
    expect(dt).toBeGreaterThan(-1)
    expect(html.lastIndexOf('aria-hidden="true" class="invisible', dt)).toBeGreaterThan(-1)
    // The dates need only index.json, so they show already.
    expect(html).toContain('<time dateTime="2026-10-18">')
  })

  it('shows the metadata only on 總覽', () => {
    expect(renderPage('/stakeholders/I06/needs')).not.toContain(t.stakeholdersList.basis)
  })
})

function render(id: string): string {
  return renderPage(`/stakeholders/${id}/solutions`)
}

/** The issues of a stakeholder that the page loads (only the fixtures). */
function filesOf(id: string): IssueFile[] {
  const s = index.stakeholders.find((x) => x.id === id)!
  return allFiles.filter((i) => s.issues.includes(i.number))
}

/** The different solutions linked on the tab: issue solutions
 * (/solutions/2-A) and cross-issue solutions (/solutions/X-B). */
function solutionLinks(html: string): { issue: number; cross: number } {
  const distinct = (re: RegExp) => new Set(html.match(re) ?? []).size
  return {
    issue: distinct(/href="\/solutions\/\d+-[A-Z]+"/g),
    cross: distinct(/href="\/solutions\/X-[A-Z]+"/g),
  }
}

describe('the 解法 tab of the stakeholder page (decision 119)', () => {
  beforeEach(() => {
    state.loading = false
    state.cross = 'ready'
  })

  it('shows the count of stakeholderSolutionCount in the tab label (I06: 7, I01: 16)', () => {
    expect(stakeholderSolutionCount(filesOf('I06'), cross, 'I06')).toBe(7)
    expect(stakeholderSolutionCount(filesOf('I01'), cross, 'I01')).toBe(16)
    expect(render('I06')).toContain('解法 7')
    expect(render('I01')).toContain('解法 16')
  })

  it('gives the same number as the tree view, which uses all the issue files', () => {
    // The page loads only the issues of the stakeholder. Its needs are only
    // in those issues, so the count is the same.
    for (const s of index.stakeholders) {
      for (const c of [cross, null]) {
        expect(stakeholderSolutionCount(filesOf(s.id), c, s.id)).toBe(stakeholderSolutionCount(allFiles, c, s.id))
      }
    }
  })

  it('lists the cross-issue solutions under 「跨議題解法」, after the issues', () => {
    const html = render('I06')
    expect(html).toContain('跨議題解法')
    expect(html.indexOf('跨議題解法</h2>')).toBeGreaterThan(html.lastIndexOf('stakeholder-solutions-'))
    expect(html).toContain('href="/solutions/X-B"')
    expect(html).toContain('href="/solutions/X-D"')
    // The 資料根據 of each card.
    expect(html.split('id="stakeholder-solutions-cross"')[1]).toContain('涵蓋需求的資料根據')
  })

  it('lists as many solutions as the tab label counts', () => {
    for (const id of ['I06', 'I01', 'O09']) {
      const html = render(id)
      const links = solutionLinks(html)
      const count = stakeholderSolutionCount(filesOf(id), cross, id)
      expect(html).toContain(`解法 ${count}`)
      expect(links.issue + links.cross).toBe(count)
    }
  })

  it('leaves out the cross-issue part and its count when the file fails to load', () => {
    state.cross = 'error'
    const html = render('I06')
    expect(html).not.toContain('跨議題解法</h2>')
    expect(solutionLinks(html)).toEqual({ issue: 5, cross: 0 })
    expect(html).toContain('解法 5')
    expect(html).not.toContain('解法 7')
  })

  it('shows no tab count while the cross-issue file loads', () => {
    state.cross = 'loading'
    const html = render('I06')
    expect(html).not.toContain('解法 5')
    expect(html).not.toContain('解法 7')
    expect(html).not.toContain('跨議題解法</h2>')
  })
})

describe('「尚未有解法涵蓋的需求」 of the 解法 tab (decision 124)', () => {
  // A modified copy of #2 with no issue solution, and one fake cross-issue
  // solution that covers only the need O12-US01 of O12 in #2.
  beforeEach(() => {
    state.loading = false
    state.cross = 'ready'
    state.override = { '2-trashcans': { ...(trashcansJson as IssueFile), solutions: [] } }
    state.crossFile = {
      ...cross,
      needGroups: [],
      solutions: [{ ...cross.solutions[0], needs: { must: [{ issue: 2, id: 'O12-US01' }], shouldCould: [], crossIssue: [] } }],
    }
    return () => {
      state.override = {}
      state.crossFile = null
    }
  })

  /** The 解法 part and the 「尚未有解法涵蓋的需求」 part of #2. */
  function partsOf2(html: string): { solutions: string; uncovered: string } {
    const start = html.indexOf('id="stakeholder-solutions-2-covering"')
    const mid = html.indexOf('id="stakeholder-solutions-2-uncovered"')
    const end = html.indexOf('id="stakeholder-solutions-', mid + 1)
    expect(start).toBeGreaterThan(-1)
    expect(mid).toBeGreaterThan(start)
    return { solutions: html.slice(start, mid), uncovered: html.slice(mid, end === -1 ? undefined : end) }
  }

  it('does not list a need that only a cross-issue solution covers', () => {
    const html = render('O12')
    const { solutions, uncovered } = partsOf2(html)
    expect(uncovered).toContain(t.stakeholderPage.uncoveredNeedsNone)
    expect(uncovered).not.toContain('focus=O12-US01')
    expect(solutions).toContain(t.stakeholderPage.solutionsNoneCrossOnly)
    // It is listed under 「跨議題解法」.
    expect(html.split('id="stakeholder-solutions-cross"')[1]).toContain('focus=O12-US01')
  })

  it('lists the need when the cross-issue file fails to load', () => {
    state.cross = 'error'
    const html = render('O12')
    const { solutions, uncovered } = partsOf2(html)
    expect(uncovered).not.toContain(t.stakeholderPage.uncoveredNeedsNone)
    expect(uncovered).toContain('focus=O12-US01')
    expect(solutions).toContain(t.stakeholderPage.solutionsNone)
    expect(html).not.toContain('跨議題解法</h2>')
  })
})

describe('the cross-issue solutions on the 需求 tab (decision 126)', () => {
  // As in decision 124: a modified copy of #2 with no issue solution, and
  // one fake cross-issue solution that covers only the need O12-US01 of O12
  // in #2.
  beforeEach(() => {
    state.loading = false
    state.cross = 'ready'
    state.override = { '2-trashcans': { ...(trashcansJson as IssueFile), solutions: [] } }
    state.crossFile = {
      ...cross,
      needGroups: [],
      solutions: [{ ...cross.solutions[0], needs: { must: [{ issue: 2, id: 'O12-US01' }], shouldCould: [], crossIssue: [] } }],
    }
    return () => {
      state.override = {}
      state.crossFile = null
    }
  })

  const code = cross.solutions[0].code

  /** The <article> of one need of #2. */
  function needOf2(html: string, key: string): string {
    const link = html.indexOf(`href="/issues/2/needs?focus=${key}`)
    expect(link).toBeGreaterThan(-1)
    return html.slice(html.lastIndexOf('<article', link), html.indexOf('</article>', link))
  }

  /** The need keys of #2 on the tab. */
  function needKeysOf2(html: string): string[] {
    return [...html.matchAll(/href="\/issues\/2\/needs\?focus=([^"&]+)/g)].map((m) => m[1])
  }

  it('shows the cross-issue solution under the need as a link, not 「尚未有解法涵蓋」', () => {
    const need = needOf2(renderPage('/stakeholders/O12/needs'), 'O12-US01')
    expect(need).toContain(`href="/solutions/${code}"`)
    expect(need).toContain(t.need.crossSolution)
    expect(need).not.toContain(t.need.solutionsNone)
  })

  it('keeps 「尚未有解法涵蓋」 for the needs it does not cover', () => {
    // I06 does not have the need O12-US01.
    const html = renderPage('/stakeholders/I06/needs')
    const others = needKeysOf2(html)
    expect(others.length).toBeGreaterThan(0)
    expect(others).not.toContain('O12-US01')
    for (const key of others) {
      const need = needOf2(html, key)
      expect(need).not.toContain(t.need.crossSolution)
      expect(need.includes(t.need.solutionsNone) || need.includes(t.need.solutionsWontDo)).toBe(true)
    }
  })

  it('follows 「只看有資料根據」: the link shows only with its need', () => {
    const html = renderPage('/stakeholders/O12/needs?evidence=1')
    if (needKeysOf2(html).includes('O12-US01')) {
      expect(html).toContain(`href="/solutions/${code}?evidence=1"`)
    } else {
      expect(html).not.toContain(`href="/solutions/${code}`)
    }
  })

  it.each(['none', 'loading', 'error'] as const)('shows 「尚未有解法涵蓋」 when the cross-issue file is %s', (s) => {
    state.cross = s
    const need = needOf2(renderPage('/stakeholders/O12/needs'), 'O12-US01')
    expect(need).toContain(t.need.solutionsNone)
    expect(need).not.toContain(t.need.crossSolution)
    expect(need).not.toContain('href="/solutions/X-')
  })
})

describe('the card grids of the stakeholder tabs (decision 139)', () => {
  // cardGridClass, with or without a top margin before it.
  const GRID = /<ul class="(?:mt-3 )?grid gap-4 lg:grid-cols-2">/g
  const grids = (html: string) => html.match(GRID)?.length ?? 0
  beforeEach(() => {
    state.loading = false
    state.cross = 'ready'
    state.crossFile = null
    state.override = {}
  })

  it('總覽: the stories of each issue are a grid, with cards of equal height', () => {
    const html = renderPage('/stakeholders/I06')
    expect(grids(html)).toBeGreaterThanOrEqual(3)
    // StoryCard gets h-full, so the cards in one row have the same height.
    expect(html).toContain('<article class="rounded-md border text-sm p-4 h-full">')
  })

  it('需求: each priority group is a grid of NeedItem cards', () => {
    const html = renderPage('/stakeholders/I06/needs')
    expect(grids(html)).toBeGreaterThanOrEqual(3)
    expect(html).toContain('class="rounded-lg border p-3 md:p-4 h-full"')
  })

  it('訴求: the wants are a grid, but the conflicts keep one card per row', () => {
    const html = renderPage('/stakeholders/I06/wants')
    expect(grids(html)).toBeGreaterThanOrEqual(3)
    expect(html).toContain('class="rounded-lg border p-3 md:p-4 h-full"')
    // A conflict card has two sides in it, so its list is not a grid.
    const conflicts = html.split('id="stakeholder-wants-1-conflicts"')[1]
    const list = conflicts.slice(0, conflicts.indexOf('</ul>'))
    expect(list).toContain('<ul class="space-y-4">')
    expect(list).not.toContain('grid gap-4 lg:grid-cols-2')
  })

  it('解法: the solutions, the uncovered needs and 跨議題解法 are grids', () => {
    const html = renderPage('/stakeholders/I06/solutions')
    // The issue solutions use the compact SolutionCard with h-full.
    expect(html).toContain('<div class="rounded-md border p-3 h-full">')
    expect(html.split('id="stakeholder-solutions-cross"')[1]).toMatch(GRID)
    expect(grids(html)).toBeGreaterThanOrEqual(4)
  })

  it('never uses 3 columns', () => {
    for (const tab of ['', '/needs', '/wants', '/solutions']) {
      expect(renderPage(`/stakeholders/I06${tab}`)).not.toContain('xl:grid-cols-3')
    }
  })
})
