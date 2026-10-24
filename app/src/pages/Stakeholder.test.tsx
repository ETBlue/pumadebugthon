// The stakeholder page. (1) The metadata of 總覽 (decisions 111, 118 and
// 147): 分類路徑, 資料根據 and the dates are the same as on the card of
// #/stakeholders. 總覽 has nothing else since decision 147. (2) The 解法 tab (design 3.3, decision 119): the tab label
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

  it('lists the cross-issue solutions under 「跨議題解法」, above the issues (decision 149)', () => {
    const html = render('I06')
    expect(html).toContain('跨議題解法')
    const crossAt = html.indexOf('id="stakeholder-solutions-cross"')
    const firstIssueAt = html.search(/id="stakeholder-solutions-\d+"/)
    expect(crossAt).toBeGreaterThan(-1)
    expect(firstIssueAt).toBeGreaterThan(crossAt)
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

  it('議題: the stories of each issue are a grid, with cards of equal height', () => {
    const html = renderPage('/stakeholders/I06/issues')
    expect(grids(html)).toBeGreaterThanOrEqual(3)
    // StoryCard gets h-full, so the cards in one row have the same height.
    expect(html).toContain('<article class="rounded-md border text-sm p-4 h-full">')
  })

  it('需求: each priority group is a grid of NeedItem cards', () => {
    const html = renderPage('/stakeholders/I06/needs')
    expect(grids(html)).toBeGreaterThanOrEqual(3)
    expect(html).toContain('class="rounded-lg border p-3 md:p-4 h-full"')
  })

  it('訴求: the wants are a grid', () => {
    const html = renderPage('/stakeholders/I06/wants')
    expect(grids(html)).toBeGreaterThanOrEqual(3)
    expect(html).toContain('class="rounded-lg border p-3 md:p-4 h-full"')
  })

  it('衝突: one card per row, not a grid (decision 142)', () => {
    const html = renderPage('/stakeholders/I06/conflicts')
    // A conflict card has two sides in it, so its list is not a grid.
    const section = html.split('id="stakeholder-conflicts-1"')[1]
    const list = section.slice(0, section.indexOf('</ul>'))
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
    for (const tab of ['', '/issues', '/needs', '/wants', '/conflicts', '/solutions']) {
      expect(renderPage(`/stakeholders/I06${tab}`)).not.toContain('xl:grid-cols-3')
    }
  })
})

/** The accessible names of the tabs, in order. */
const tabNames = (html: string) => [...html.matchAll(/role="tab"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1])

describe('the 衝突 tab of the stakeholder page (decision 142)', () => {
  beforeEach(() => {
    state.loading = false
    state.cross = 'none'
    state.crossFile = null
    state.override = {}
  })

  it('has its own tab after 需求; 訴求 shows only its own count', () => {
    // I06 (fixtures #1, #2, #8, #9): 6 want keys, 5 need keys, 4 conflicts
    // (C1 and C7 in #1, C6 in #2, C3 in #8), 5 issue solutions.
    expect(tabNames(renderPage('/stakeholders/I06'))).toEqual(['總覽', '議題 4', '訴求 6', '需求 5', '衝突 4', '解法 5'])
  })

  it('shows the conflicts per issue, with the other side\'s stories', () => {
    const html = renderPage('/stakeholders/I06/conflicts')
    expect(html).toContain('id="stakeholder-conflicts-2"')
    expect(html).toContain(t.conflict.otherSide)
    expect(html).toMatch(/<span class="mr-2 font-mono">C6<\/span>/)
  })

  it('the 訴求 tab has no conflict cards, but a want still links to its conflict on the issue\'s 衝突 tab', () => {
    const html = renderPage('/stakeholders/I06/wants')
    expect(html).not.toContain(t.conflict.otherSide)
    expect(html).not.toMatch(/<span class="mr-2 font-mono">C\d+<\/span>/)
    expect(html).toContain('href="/issues/2/conflicts?focus=C6"')
  })
})

describe('the 議題 tab of the stakeholder page (decision 145)', () => {
  beforeEach(() => {
    state.loading = false
    state.cross = 'none'
    state.crossFile = null
    state.override = {}
  })

  /** The issue numbers of the compact issue cards, in order. */
  const cardIssues = (html: string) =>
    [...html.matchAll(/<article class="h-full rounded-md border p-3"><p class="font-medium"><a[^>]*href="\/issues\/(\d+)"/g)]
      .map((m) => Number(m[1]))

  it('comes right after 總覽, with the number of issues', () => {
    // I05 is in #1, #2, #8 and #9 of the fixtures.
    expect(tabNames(renderPage('/stakeholders/I05')).slice(0, 2)).toEqual(['總覽', '議題 4'])
  })

  it('lists the issues of I05 as compact issue cards, one section per issue (decision 147)', () => {
    const html = renderPage('/stakeholders/I05/issues')
    expect(cardIssues(html)).toEqual([1, 2, 8, 9])
    // Each card is the first thing in its own section, before its parts.
    for (const n of [1, 2, 8, 9]) {
      const section = html.split(`id="stakeholder-issues-${n}"`)[1]
      const card = section.indexOf('<article class="h-full rounded-md border p-3">')
      expect(card).toBeGreaterThan(-1)
      expect(card).toBeLessThan(section.indexOf(`id="stakeholder-issues-${n}-relation"`))
    }
    // The same count as the tab label.
    expect(tabNames(html)[1]).toBe(`議題 ${cardIssues(html).length}`)
  })

  it('lists one issue for a stakeholder in one issue', () => {
    const html = renderPage('/stakeholders/O08/issues')
    expect(cardIssues(html)).toEqual([2])
    expect(tabNames(html)[1]).toBe('議題 1')
  })

  it('shows the cards and the count while the issue files load (it needs only index.json)', () => {
    state.loading = true
    const html = renderPage('/stakeholders/I05/issues')
    expect(cardIssues(html)).toEqual([1, 2, 8, 9])
    expect(tabNames(html)).toEqual(['總覽', '議題 4', '訴求', '需求', '衝突', '解法'])
    // The parts come when the issue files are ready.
    expect(html).not.toContain(`>${t.stakeholderPage.relation}</h3>`)
  })
})

describe('the issue parts moved from 總覽 to 議題 (decision 147)', () => {
  beforeEach(() => {
    state.loading = false
    state.cross = 'none'
    state.crossFile = null
    state.override = {}
  })

  const tp = t.stakeholderPage
  const PARTS = ['relation', 'counts', 'sources', 'stories'] as const
  const STORY_CARD = /<article class="rounded-md border text-sm p-4 h-full">/g
  const storyCards = (html: string) => (html.match(STORY_CARD) ?? []).length

  it('總覽 has no 與本題的關係, priority counts, input sources or stories', () => {
    const html = renderPage('/stakeholders/I05')
    for (const title of [tp.relation, tp.priorityCounts, tp.inputSources, tp.stories]) {
      expect(html).not.toContain(`>${title}</h3>`)
    }
    expect(storyCards(html)).toBe(0)
    expect(html).not.toContain('id="stakeholder-overview-')
    // No issue links in the metadata: the 議題 tab lists the issues.
    expect(html).not.toContain('>出現的議題</dt>')
    expect(html).not.toMatch(/href="\/issues\/\d+"/)
    // The metadata stays.
    expect(html).toContain(`>${t.stakeholdersList.basis}</dt>`)
    expect(html).toContain(`>${tp.path}</dt>`)
  })

  it('議題 has every part for each issue of I05 (#1, #2, #8, #9), in issue order', () => {
    const html = renderPage('/stakeholders/I05/issues')
    let last = -1
    for (const n of [1, 2, 8, 9]) {
      for (const part of PARTS) {
        const at = html.indexOf(`id="stakeholder-issues-${n}-${part}"`)
        expect(at).toBeGreaterThan(last)
        last = at
      }
    }
    expect(html).not.toContain('id="stakeholder-overview-')
    // The legend of the priority counts shows once per page.
    expect(html.split(t.priorityCounts.legend).length - 1).toBe(1)
  })

  it('議題 lists the stories of each issue under that issue', () => {
    const html = renderPage('/stakeholders/I05/issues')
    for (const n of [1, 2, 8, 9]) {
      const stories = html.split(`id="stakeholder-issues-${n}-stories"`)[1].split('id="stakeholder-issues-')[0]
      expect(stories).toContain(`href="/stakeholders/I05/stories/${n}/I05-US`)
      expect(stories).not.toMatch(new RegExp(`href="/stakeholders/I05/stories/(?!${n}/)`))
    }
  })

  it('議題 has the 「只看有資料根據」 toggle, and it hides the stories with no data basis', () => {
    const all = renderPage('/stakeholders/I05/issues')
    const based = renderPage('/stakeholders/I05/issues?evidence=1')
    expect(all).toContain(t.dataBasisFilter.label)
    expect(storyCards(all)).toBeGreaterThan(0)
    expect(storyCards(based)).toBeLessThan(storyCards(all))
  })
})
