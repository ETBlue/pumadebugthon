// The metadata at the top of 總覽 on the stakeholder page (decisions 111 and
// 118): 分類路徑, 資料根據 and the dates are the same as on the card of
// #/stakeholders. The data hooks and the page title are mocked, so both
// pages render on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import discoveryJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { t } from '@/i18n/zh-TW'
import type { IndexFile, IssueFile } from '@/types'
import Stakeholder from './Stakeholder'
import Stakeholders from './Stakeholders'

const files: Record<string, IssueFile> = {
  '1-trees': treesJson as IssueFile,
  '2-trashcans': trashcansJson as IssueFile,
  '8-smokefree': smokefreeJson as IssueFile,
  '9-policydiscovery': discoveryJson as IssueFile,
}

// The issue files are ready, unless a test sets loading.
const state = { loading: false }

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: indexJson as IndexFile }),
  useIssues: (folders: string[]) =>
    state.loading
      ? { status: 'loading' }
      : { status: 'ready', data: folders.filter((f) => f in files).map((f) => files[f]) },
  useCrossIssue: () => ({ status: 'ready', data: null }),
  useCrossIssueOrNull: () => null,
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
