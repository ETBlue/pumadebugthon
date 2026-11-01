// #/solutions: the 領域 and 解法類型 filters (Task U5 of
// app/docs/plan-types-ui.md). They work like the 空間類型 filter: the same
// bar control, result line, URL param and reset. The data hooks and the page
// title are mocked, so the page renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import Solutions from './Solutions'

const index = indexJson as IndexFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

/** The fixture files, with #2 S1 changed to have its own 領域 police. No
 * fixture solution has an own 領域, and no fixture issue has police. */
const ownPolice: IssueFile[] = issueFiles.map((f) =>
  f.number !== 2
    ? f
    : { ...f, solutions: f.solutions.map((s) => (s.id === 'S1' ? { ...s, domains: ['police'], ownDomains: ['police'] } : s)) },
)

const state: { files: IssueFile[] } = { files: issueFiles }

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssues: () => ({ status: 'ready', data: state.files }),
  useCrossIssue: () => ({ status: 'ready', data: crossJson as CrossIssueFile }),
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

beforeEach(() => {
  state.files = issueFiles
})

function render(search: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/solutions${search}`]}>
      <Solutions />
    </MemoryRouter>,
  )
}

/** The text of the last result line (the one above the cards). */
function resultLine(html: string): string {
  const all = [...html.matchAll(/<p role="status"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''))
  return all[all.length - 1]
}

/** The keys of the cards (2-S1, X-S4), as a set: the order is the sort's.
 * The title is the first solution link of a card. */
const cards = (html: string) =>
  new Set([...html.matchAll(/<li[^>]*>[\s\S]*?href="\/solutions\/([^"/?]+)/g)].map((m) => m[1]))

/** The text of the bar buttons of the choices filters. */
const buttons = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<svg/g)].map((m) => m[1])

const total = issueFiles.reduce((n, f) => n + f.solutions.length, 0) + crossJson.solutions.length

describe('#/solutions 領域 and 解法類型 filters (Task U5)', () => {
  it('has the buttons 空間類型, 領域, 解法類型 in this order', () => {
    const b = buttons(render(''))
    const at = b.indexOf('空間類型')
    expect(b.slice(at, at + 3)).toEqual(['空間類型', '領域', '解法類型'])
  })

  it('domain=: issue solutions by their 領域, X- solutions by the union', () => {
    const html = render('?domain=civil-affairs')
    expect(cards(html)).toEqual(new Set(['X-S4', '9-S1', '9-S2', '9-S3', '9-S4', '9-S5']))
    expect(resultLine(html)).toBe(`顯示 6 個解法，共 ${total} 個。篩選：領域：民政。 清除篩選`)
    expect(buttons(html)).toContain('領域：1')
  })

  it('solutiontype=: ANY picked type, for both kinds, names in file order', () => {
    const html = render('?solutiontype=enforcement&solutiontype=open-data')
    expect(cards(html)).toEqual(new Set(['X-S4', '1-S2', '2-S3', '8-S3', '8-S4', '9-S4']))
    expect(resultLine(html)).toBe(`顯示 6 個解法，共 ${total} 個。篩選：解法類型：資料公開、稽查與執法。 清除篩選`)
    expect(buttons(html)).toContain('解法類型：2')
  })

  it('combines with the other filters: ALL must match', () => {
    const html = render('?issue=9&domain=administration&solutiontype=digital-tool')
    expect(cards(html)).toEqual(new Set(['X-S4']))
    expect(resultLine(html)).toBe(`顯示 1 個解法，共 ${total} 個。篩選：議題：#9；領域：行政；解法類型：數位工具。 清除篩選`)
  })

  it('a solution with its own 領域 matches by it, not by the issue 領域', () => {
    state.files = ownPolice
    expect(cards(render('?domain=police'))).toEqual(new Set(['2-S1']))
    expect(cards(render('?domain=environment'))).not.toContain('2-S1')
  })

  it('shows the empty state with 清除篩選 when nothing matches, and the link removes the new params', () => {
    const html = render('?sort=added&issue=1&solutiontype=enforcement')
    expect(cards(html)).toEqual(new Set())
    expect(html).toContain('沒有符合目前篩選的解法。')
    expect(html).toContain('href="/solutions?sort=added"')
  })
})
