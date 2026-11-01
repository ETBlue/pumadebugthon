// #/issues: the 領域 filter (Task U5 of app/docs/plan-types-ui.md). It works
// like the 空間類型 filter: the same bar control, result line, URL param and
// reset. The data hooks and the page title are mocked, so the page renders
// on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import Issues from './Issues'

const index = indexJson as IndexFile

/** A changed copy of index.json: #2 S1 has the own 領域 police, so #2 uses
 * police (usedDomains). No fixture solution has an own 領域, and no fixture
 * issue has police on its 領域 line. */
const ownIndex: IndexFile = {
  ...index,
  issues: index.issues.map((i) => (i.number === 2 && i.available ? { ...i, usedDomains: [...i.usedDomains, 'police'] } : i)),
}

const state: { index: IndexFile } = { index }

/** The issue file hooks record each call: #/issues must never ask for an
 * issue file. */
const fileRequests: string[][] = []

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: state.index }),
  useIssues: (folders: string[]) => {
    fileRequests.push(folders)
    return { status: 'loading', message: '載入中…' }
  },
  useIssue: (folder: string) => {
    fileRequests.push([folder])
    return { status: 'loading', message: '載入中…' }
  },
  useCrossIssue: () => {
    fileRequests.push(['cross-issue'])
    return { status: 'loading', message: '載入中…' }
  },
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

beforeEach(() => {
  state.index = index
  fileRequests.length = 0
})

function render(search: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/issues${search}`]}>
      <Issues />
    </MemoryRouter>,
  )
}

/** The text of the last result line (the one above the cards). */
function resultLine(html: string): string {
  const all = [...html.matchAll(/<p role="status"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''))
  return all[all.length - 1]
}

/** The issue numbers of the cards, in order. */
const cards = (html: string) => [...html.matchAll(/<article[^>]*>[\s\S]*?href="\/issues\/(\d+)"/g)].map((m) => Number(m[1]))

/** The text of the bar buttons of the choices filters. */
const buttons = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<svg/g)].map((m) => m[1])

const spaceName = (code: string) => index.spaceTypes.find((s) => s.code === code)!.name
const total = index.issues.length
/** The analyzed issues: only they have a link to their page. */
const analyzed = index.issues.filter((i) => i.available).length

describe('#/issues 領域 filter (Task U5)', () => {
  it('has the button 領域 right after 空間類型', () => {
    const b = buttons(render(''))
    expect(b).toContain('領域')
    expect(b.indexOf('領域')).toBe(b.indexOf('空間類型') + 1)
  })

  it('domain= keeps the issues of the 領域, and the result line names it', () => {
    const html = render('?domain=health')
    expect(cards(html)).toEqual([8])
    expect(resultLine(html)).toBe(`顯示 1 個議題，共 ${total} 個。篩選：領域：醫療保健。 清除篩選`)
    expect(buttons(html)).toContain('領域：1')
  })

  it('keeps an issue with ANY picked 領域, and names them in file order', () => {
    const html = render('?domain=environment&domain=administration')
    expect(new Set(cards(html))).toEqual(new Set([1, 2, 8, 9]))
    expect(resultLine(html)).toBe(`顯示 4 個議題，共 ${total} 個。篩選：領域：行政、環境保護。 清除篩選`)
  })

  it('combines with 空間類型: ALL filters must match', () => {
    const html = render('?space=bike-lane&domain=environment')
    expect(cards(html)).toEqual([1])
    expect(resultLine(html)).toBe(`顯示 1 個議題，共 ${total} 個。篩選：空間類型：${spaceName('bike-lane')}；領域：環境保護。 清除篩選`)
  })

  it('keeps an issue whose solution has the 領域 as its own (usedDomains, the rule of the type pages)', () => {
    state.index = ownIndex
    const html = render('?domain=police')
    expect(cards(html)).toEqual([2])
    expect(resultLine(html)).toBe(`顯示 1 個議題，共 ${total} 個。篩選：領域：警政。 清除篩選`)
  })

  it('drops a 領域 that no issue uses, and 清除篩選 removes domain=', () => {
    // No fixture issue uses police: it is dropped, so no filter is on.
    expect(cards(render('?domain=police')).length).toBe(analyzed)
    expect(render('?sort=added&domain=health')).toContain('href="/issues?sort=added"')
  })

  it('works from index.json alone: it never asks for an issue file', () => {
    state.index = ownIndex
    for (const search of ['', '?domain=police', '?domain=health&space=park', '?who=I06']) render(search)
    expect(fileRequests).toEqual([])
  })
})
