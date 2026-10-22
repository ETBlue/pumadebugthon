// #/spaces (design 3.9, decision 120) and the back button of the space page.
// The data hooks and the page title are mocked, so the pages render on the
// server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { issuesBySpace, solutionsBySpace, spaceStakeholderCount, stakeholdersBySpace } from '@/lib/spaces'
import type { IndexFile, IssueFile } from '@/types'
import Space from './Space'
import Spaces from './Spaces'

const index = indexJson as IndexFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

const state: { issuesReady: boolean } = { issuesReady: true }

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  // Like the real hook: the files of the folders asked for.
  useIssues: (folders: string[]) =>
    state.issuesReady
      ? { status: 'ready', data: issueFiles.filter((f) => folders.some((x) => x.startsWith(`${f.number}-`))) }
      : { status: 'loading', message: '載入中…' },
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

beforeEach(() => {
  state.issuesReady = true
})

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/spaces']}>
      <Spaces />
    </MemoryRouter>,
  )
}

/** The HTML of the card of one space. */
function card(html: string, code: string): string {
  const at = html.indexOf(`href="/spaces/${code}"`)
  expect(at).toBeGreaterThan(-1)
  const start = html.lastIndexOf('<article', at)
  return html.slice(start, html.indexOf('</article>', start))
}

describe('#/spaces', () => {
  it('has a hidden h1 and the 4 groups as h2, in the fixed order', () => {
    const html = render()
    expect(html).toMatch(/<h1 class="sr-only">空間<\/h1>/)
    const h2 = [...html.matchAll(/<h2 [^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
    // The order the groups first appear in index.spaceTypes. Not by count.
    expect(h2).toEqual(['道路', '地下', '公共空間', '建築'])
  })

  it('shows 13 cards, one per space type, in the order of index.spaceTypes', () => {
    const html = render()
    const codes = [...html.matchAll(/<article[^>]*>\s*<h3[^>]*><a [^>]*href="\/spaces\/([^"]+)"/g)].map((m) => m[1])
    expect(codes).toEqual(index.spaceTypes.map((s) => s.code))
    expect(codes).toHaveLength(13)
  })

  it('shows the code, the description, and the same counts as the space page', () => {
    const html = render()
    const c = card(html, 'sidewalk')
    expect(c).toContain('>sidewalk</p>')
    expect(c).toContain('道路兩側供行人通行的空間。')
    expect(c).not.toContain('border-dashed')
    // The same helpers as Space.tsx, with the files of the issues that use it.
    const numbers = issuesBySpace(index, 'sidewalk').map((i) => i.number)
    const used = issueFiles.filter((f) => numbers.includes(f.number))
    expect(numbers).toEqual([1, 2, 8])
    expect(spaceStakeholderCount(stakeholdersBySpace(used, 'sidewalk'))).toBe(50)
    expect(solutionsBySpace(used, 'sidewalk')).toHaveLength(14)
    expect(c).toContain('<dt class="text-muted-foreground">議題</dt><dd>3 個')
    expect(c).toContain('href="/issues/1"')
    expect(c).toContain('#1 把三千棵樹種回來')
    expect(c).toContain('<dt class="text-muted-foreground">利害關係人</dt><dd>50 位</dd>')
    expect(c).toContain('<dt class="text-muted-foreground">解法</dt><dd>14 個</dd>')
    // A space with one issue.
    const indoor = card(html, 'indoor')
    expect(indoor).toContain('<dd>1 個')
    expect(indoor).toContain('<dt class="text-muted-foreground">利害關係人</dt><dd>3 位</dd>')
    expect(indoor).toContain('<dt class="text-muted-foreground">解法</dt><dd>1 個</dd>')
  })

  it('shows 尚無議題 and a dashed border for a space with no analyzed issue', () => {
    const c = card(render(), 'parking')
    expect(c).toContain('border-dashed')
    expect(c).toContain('尚無議題')
    expect(c).not.toContain('<dl')
    expect(card(render(), 'sidewalk')).not.toContain('尚無議題')
  })

  it('never shows a wrong 0 while the issue files load', () => {
    state.issuesReady = false
    const html = render()
    expect(html).toContain('載入中…')
    const c = card(html, 'sidewalk')
    expect(c).toContain('<dd>3 個')
    expect(c).not.toContain('利害關係人')
    expect(c).not.toContain('>解法<')
    expect(html).not.toContain('0 位')
  })
})

describe('the space page back button', () => {
  it('goes to #/spaces with 回到空間列表', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/spaces/sidewalk']}>
        <Routes>
          <Route path="/spaces/:code" element={<Space />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(html).toMatch(/<a [^>]*href="\/spaces"[^>]*>[\s\S]*?回到空間列表<\/span><\/a><h1[^>]*>人行道/)
    expect(html).not.toContain('回到議題列表')
  })
})
