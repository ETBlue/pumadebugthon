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
const state: { loading: boolean; cross: CrossState } = { loading: false, cross: 'none' }

function crossState() {
  if (state.cross === 'none') return { status: 'ready', data: null }
  if (state.cross === 'ready') return { status: 'ready', data: cross }
  if (state.cross === 'loading') return { status: 'loading', message: '' }
  return { status: 'error', message: '', error: new Error('x') }
}

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: indexJson as IndexFile }),
  useIssues: (folders: string[]) =>
    state.loading
      ? { status: 'loading' }
      : { status: 'ready', data: folders.filter((f) => f in files).map((f) => files[f]) },
  useCrossIssue: () => crossState(),
  useCrossIssueOrNull: () => (state.cross === 'ready' ? cross : null),
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
    expect(fieldValue(html, t.stakeholdersList.added)).toBe('<time dateTime="2026-10-18">2026-10-18</time>')
    expect(fieldValue(html, t.stakeholdersList.updated)).toBe('<time dateTime="2026-10-20">2026-10-20</time>')
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
