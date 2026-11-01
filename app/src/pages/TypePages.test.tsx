// #/domains and #/solution-types, and their detail pages (Task U3 of
// app/docs/plan-types-ui.md). They use the same page bodies as #/spaces.
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
import { forgetListSearches, rememberListSearch } from '@/lib/backLink'
import { solutionsByType, stakeholdersByType, typeIssues, typeStakeholderCount, type TypeKind } from '@/lib/typeKinds'
import type { IndexFile, IssueFile } from '@/types'
import TypeList from './TypeList'
import TypePage from './TypePage'

const index = indexJson as IndexFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

const state: { issuesReady: boolean; files: IssueFile[]; index: IndexFile } = { issuesReady: true, files: issueFiles, index }

/** The fixture files, with #2 S1 changed to have its own 領域 police. No
 * fixture solution has an own 領域, and #2 itself has only environment. */
const ownPolice: IssueFile[] = issueFiles.map((f) =>
  f.number !== 2
    ? f
    : {
        ...f,
        solutions: f.solutions.map((s) => (s.id === 'S1' ? { ...s, domains: ['police'], ownDomains: ['police'] } : s)),
      },
)

/** index.json to go with ownPolice: #2 uses police too (usedDomains). */
const ownIndex: IndexFile = {
  ...index,
  issues: index.issues.map((i) => (i.number === 2 && i.available ? { ...i, usedDomains: [...i.usedDomains, 'police'] } : i)),
}

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: state.index }),
  // Like the real hook: the files of the folders asked for.
  useIssues: (folders: string[]) =>
    state.issuesReady
      ? { status: 'ready', data: state.files.filter((f) => folders.some((x) => x.startsWith(`${f.number}-`))) }
      : { status: 'loading', message: '載入中…' },
}))

vi.mock('@/components/PageTitle', async () => {
  const { pageTitle } = await import('@/lib/pageTitle')
  return {
    PageTitle: ({ parts = [] }: { parts?: (string | null | undefined)[] }) => <meta data-title={pageTitle(...parts)} />,
  }
})

beforeEach(() => {
  state.issuesReady = true
  state.files = issueFiles
  state.index = index
  forgetListSearches()
})

const BASE: Record<TypeKind, string> = { space: 'spaces', domain: 'domains', solutionType: 'solution-types' }

function renderList(kind: TypeKind, search = ''): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/${BASE[kind]}${search}`]}>
      <TypeList kind={kind} />
    </MemoryRouter>,
  )
}

function renderPage(kind: TypeKind, path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={`${BASE[kind]}/:code/:tab?`} element={<TypePage kind={kind} />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** The HTML of the card that links to href. */
function card(html: string, href: string): string {
  const at = html.indexOf(`href="${href}"`)
  expect(at).toBeGreaterThan(-1)
  const start = html.lastIndexOf('<article', at)
  return html.slice(start, html.indexOf('</article>', start))
}

const cardCodes = (html: string, base: string) =>
  [...html.matchAll(new RegExp(`<article[^>]*>\\s*<h[23][^>]*><a [^>]*href="/${base}/([^"]+)"`, 'g'))].map((m) => m[1])
const tabNames = (html: string) => [...html.matchAll(/role="tab"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1])
const titleOf = (html: string) => /data-title="([^"]*)"/.exec(html)?.[1]
const h2s = (html: string) => [...html.matchAll(/<h2 [^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])

/** The tab names with the counts, from the same helpers as the page. */
function expectedTabs(kind: TypeKind, code: string): string[] {
  const issues = typeIssues(kind, index, issueFiles, code)
  const solutions = solutionsByType(kind, issueFiles, code).length
  const people = typeStakeholderCount(stakeholdersByType(kind, issueFiles, code))
  return ['總覽', `議題 ${issues.length}`, `解法 ${solutions}`, `利害關係人 ${people}`]
}

describe('#/domains (Task U3)', () => {
  it('has the hidden h1 領域, the page title, and the 8 groups as h2 in file order', () => {
    const html = renderList('domain')
    expect(html).toMatch(/<h1 class="sr-only">領域<\/h1>/)
    expect(titleOf(html)).toMatch(/^領域 · /)
    expect(h2s(html)).toEqual(index.domainGroups.map((g) => g.name))
  })

  it('shows 28 cards, one per 領域, in file order', () => {
    expect(cardCodes(renderList('domain'), 'domains')).toEqual(index.domainTypes.map((d) => d.code))
  })

  it('a used 領域: 議題, 利害關係人 and 解法, the same numbers as its page', () => {
    const c = card(renderList('domain'), '/domains/environment')
    const tabs = expectedTabs('domain', 'environment')
    expect(c).toContain(`<dd>${tabs[1].split(' ')[1]} 個`)
    expect(c).toContain(`${tabs[3].split(' ')[1]} 位`)
    expect(c).toContain(`<dd>${tabs[2].split(' ')[1]} 個</dd>`)
    expect(c).toContain('href="/issues/1"')
    expect(c).not.toContain('尚無議題')
  })

  it('an unused 領域 (police) has a card with 尚無議題 and a dashed border', () => {
    const c = card(renderList('domain'), '/domains/police')
    expect(c).toContain('尚無議題')
    expect(c).toContain('border-dashed')
    expect(c).toContain('警政')
  })

  it('a 領域 that only a solution has as its own 領域: the card shows its issue', () => {
    state.files = ownPolice
    state.index = ownIndex
    const c = card(renderList('domain'), '/domains/police')
    expect(c).not.toContain('尚無議題')
    expect(c).toContain('<dd>1 個')
    expect(c).toContain('href="/issues/2"')
    expect(c).toContain('<dd>1 個</dd>')
  })

  it('waits for the issue files: a solution can have its own 領域, so no wrong 尚無議題', () => {
    state.issuesReady = false
    const html = renderList('domain')
    expect(html).toContain('載入中…')
    expect(html).not.toContain('尚無議題')
  })

  it('has the filters 領域分類 and 議題 and the search, and no sort', () => {
    const html = renderList('domain')
    expect(html).toContain('領域分類')
    expect(html).toContain('議題：全部')
    expect(html).toMatch(/搜尋<span class="sr-only">領域<\/span>/)
    expect(html).not.toContain('<select')
  })

  it('narrows by 領域分類, and by the search (code or name)', () => {
    const one = renderList('domain', `?group=${encodeURIComponent('社會福利')}`)
    expect(h2s(one)).toEqual(['社會福利'])
    expect(one).toContain('顯示 5 個領域，共 28 個。')
    expect(cardCodes(renderList('domain', '?q=police'), 'domains')).toEqual(['police'])
    expect(cardCodes(renderList('domain', `?q=${encodeURIComponent('警政')}`), 'domains')).toEqual(['police'])
  })

  it('narrows by 議題: the 領域 that a picked issue uses', () => {
    expect(cardCodes(renderList('domain', '?issue=9'), 'domains')).toEqual(['administration', 'civil-affairs'])
  })
})

describe('#/solution-types (Task U3)', () => {
  it('has the hidden h1 解法類型, the page title, and no group headings', () => {
    const html = renderList('solutionType')
    expect(html).toMatch(/<h1 class="sr-only">解法類型<\/h1>/)
    expect(titleOf(html)).toMatch(/^解法類型 · /)
    expect(h2s(html)).toEqual([])
  })

  it('shows 13 cards in file order', () => {
    expect(cardCodes(renderList('solutionType'), 'solution-types')).toEqual(index.solutionTypes.map((s) => s.code))
  })

  it('a solution type that no solution uses has 尚無議題', () => {
    expect(card(renderList('solutionType'), '/solution-types/subsidy')).toContain('尚無議題')
    expect(card(renderList('solutionType'), '/solution-types/open-data')).not.toContain('尚無議題')
  })

  it('has the 議題 filter and the search, but no group filter', () => {
    const html = renderList('solutionType')
    expect(html).toContain('議題：全部')
    expect(html).toMatch(/搜尋<span class="sr-only">解法類型<\/span>/)
    expect(html).not.toContain('分類')
  })

  it('narrows by 議題 and by the search', () => {
    expect(cardCodes(renderList('solutionType', '?issue=9'), 'solution-types')).toEqual(
      index.solutionTypes.map((s) => s.code).filter((c) => typeIssues('solutionType', index, issueFiles, c).some((i) => i.number === 9)),
    )
    expect(cardCodes(renderList('solutionType', '?q=open-data'), 'solution-types')).toEqual(['open-data'])
  })
})

describe('the 領域 page (Task U3)', () => {
  it('has four tabs with counts: the same numbers as the card', () => {
    expect(tabNames(renderPage('domain', '/domains/environment'))).toEqual(expectedTabs('domain', 'environment'))
  })

  it('總覽 shows 上層, 說明, 政事別 and 陳情系統主類別', () => {
    const html = renderPage('domain', '/domains/administration')
    for (const label of ['上層', '說明', '政事別', '陳情系統主類別']) expect(html).toContain(`>${label}<`)
    expect(html).toContain('一般政務')
    expect(html).toContain('行政支出')
    expect(html).toContain('綜合的政策規劃、主計、人事、資訊與研考工作。')
  })

  it('has the page title: the name, then the tab name except for 總覽', () => {
    expect(titleOf(renderPage('domain', '/domains/environment'))).toMatch(/^環境保護 · 市政提案小幫手$/)
    expect(titleOf(renderPage('domain', '/domains/environment/solutions'))).toMatch(/^環境保護 · 解法 · /)
  })

  it('has the back button 回到領域列表, with the last filters of #/domains', () => {
    expect(renderPage('domain', '/domains/environment')).toMatch(/<a [^>]*href="\/domains"[^>]*>[\s\S]*?回到領域列表<\/span><\/a><h1[^>]*>環境保護/)
    rememberListSearch('domains', '?q=police')
    expect(renderPage('domain', '/domains/environment')).toContain('href="/domains?q=police"')
  })

  it('the tab links use the 領域 paths', () => {
    const html = renderPage('domain', '/domains/environment/stakeholders')
    expect(html).toContain('href="/domains/environment/issues"')
    expect(html).toContain('href="/domains/environment/solutions"')
  })

  it('an unused 領域 (police) has 0 counts and the empty text in every tab', () => {
    expect(tabNames(renderPage('domain', '/domains/police'))).toEqual(['總覽', '議題 0', '解法 0', '利害關係人 0'])
    expect(renderPage('domain', '/domains/police')).toContain('警察的各項業務。')
    expect(renderPage('domain', '/domains/police/issues')).toContain('目前沒有已完成分析的議題屬於這個領域。')
    expect(renderPage('domain', '/domains/police/solutions')).toContain('目前沒有解法屬於這個領域。')
    expect(renderPage('domain', '/domains/police/stakeholders')).toContain('目前沒有相關的利害關係人。')
  })

  it('a 領域 that only a solution has as its own 領域: the page lists its issue and the solution', () => {
    state.files = ownPolice
    state.index = ownIndex
    expect(tabNames(renderPage('domain', '/domains/police'))[1]).toBe('議題 1')
    expect(renderPage('domain', '/domains/police/issues')).toContain('href="/issues/2"')
    const solutions = renderPage('domain', '/domains/police/solutions')
    expect(solutions).toContain('id="domain-solutions-2"')
    expect(solutions).toContain('href="/solutions/2-S1"')
  })

  it('a level 1 code, a space code or an unknown code shows the not-found page', () => {
    for (const code of ['economic-development', 'general-affairs', 'sidewalk-furniture', 'nope']) {
      const html = renderPage('domain', `/domains/${code}`)
      expect(html).toContain('找不到這個領域')
      expect(html).toContain(`沒有代碼為 ${code} 的領域。`)
      expect(html).not.toContain('role="tab"')
      expect(titleOf(html)).toMatch(/^找不到這個領域 · /)
    }
  })
})

describe('the 解法類型 page (Task U3)', () => {
  it('has four tabs with counts: the same numbers as the card', () => {
    expect(tabNames(renderPage('solutionType', '/solution-types/open-data'))).toEqual(expectedTabs('solutionType', 'open-data'))
  })

  it('while the issue files load, the tabs show the name only', () => {
    state.issuesReady = false
    const html = renderPage('solutionType', '/solution-types/open-data/issues')
    expect(tabNames(html)).toEqual(['總覽', '議題', '解法', '利害關係人'])
    expect(html).toContain('載入中…')
  })

  it('總覽 shows 說明, 判斷方式 and 政策工具', () => {
    const html = renderPage('solutionType', '/solution-types/open-data')
    for (const label of ['說明', '判斷方式', '政策工具']) expect(html).toContain(`>${label}<`)
    expect(html).toContain('公開資料、紀錄、進度與成果。')
    expect(html).toContain('Nodality')
  })

  it('the 議題 tab lists the issues with a solution of the type', () => {
    const html = renderPage('solutionType', '/solution-types/open-data/issues')
    const numbers = typeIssues('solutionType', index, issueFiles, 'open-data').map((i) => i.number)
    expect(numbers.length).toBeGreaterThan(0)
    for (const n of numbers) expect(html).toContain(`href="/issues/${n}"`)
  })

  it('has the page title and the back button 回到解法類型列表', () => {
    const html = renderPage('solutionType', '/solution-types/open-data/issues')
    expect(titleOf(html)).toMatch(/^資料公開 · 議題 · /)
    expect(html).toMatch(/<a [^>]*href="\/solution-types"[^>]*>[\s\S]*?回到解法類型列表<\/span><\/a><h1[^>]*>資料公開/)
  })

  it('an unused solution type has the empty text in every tab', () => {
    expect(tabNames(renderPage('solutionType', '/solution-types/subsidy'))).toEqual(['總覽', '議題 0', '解法 0', '利害關係人 0'])
    expect(renderPage('solutionType', '/solution-types/subsidy/issues')).toContain('目前沒有已完成分析的議題使用這個解法類型。')
    expect(renderPage('solutionType', '/solution-types/subsidy/solutions')).toContain('目前沒有解法使用這個解法類型。')
    expect(renderPage('solutionType', '/solution-types/subsidy/stakeholders')).toContain('目前沒有相關的利害關係人。')
  })

  it('a 領域 code or an unknown code shows the not-found page', () => {
    for (const code of ['general-affairs', 'environment', 'nope']) {
      const html = renderPage('solutionType', `/solution-types/${code}`)
      expect(html).toContain('找不到這個解法類型')
      expect(html).not.toContain('role="tab"')
    }
  })
})
