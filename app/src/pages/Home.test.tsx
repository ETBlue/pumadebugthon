// The home page blocks (design 3.1). 資料根據 on the issue and the
// stakeholder cards (decision 107). The data hooks and the page title are
// mocked, so the page renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import { t } from '@/i18n/zh-TW'
import { basisTextParts } from '@/lib/cellBasis'
import { crossSolutionCells, solutionCells, stakeholderCells } from '@/lib/coverage'
import { issueNumberTitle, sharedForCard } from '@/lib/issues'
import { recentIssues, recentSolutionItems, recentStakeholders } from '@/lib/recent'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import Home from './Home'

const index = indexJson as IndexFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

const state: { issuesReady: boolean } = { issuesReady: true }

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssues: () => (state.issuesReady ? { status: 'ready', data: issueFiles } : { status: 'loading' }),
  useCrossIssue: () => ({ status: 'ready', data: crossJson as CrossIssueFile }),
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <Home />
    </MemoryRouter>,
  )
}

/** The HTML of one block, from its section tag to the next one. */
function block(html: string, id: string): string {
  const start = html.indexOf(`aria-labelledby="${id}"`)
  const end = html.indexOf('</section>', start)
  return html.slice(start, end)
}

/** The cards of a block: the HTML of each <article>. */
function cards(html: string): string[] {
  return [...html.matchAll(/<article[\s\S]*?<\/article>/g)].map((m) => m[0])
}

const BAR = 'aria-hidden="true" class="mt-1.5 flex h-2'

beforeEach(() => {
  state.issuesReady = true
})

describe('the home page hero (decision 128)', () => {
  it('shows the title, the slogan and the description, centered', () => {
    const html = render()
    const hero = html.slice(html.indexOf('hero-bg'), html.indexOf('recent-issues'))
    expect(hero).toContain(`>${t.appTitle}</h1>`)
    expect(hero).toContain('看見各方利害關係人，打造更體貼周到的市政規劃')
    expect(hero).toContain('本站整理台北市政策的前期分析，從利害關係人盤點出發，找出市民的需求、訴求、衝突以及可能解法。')
    // The order: title, slogan, description.
    const title = hero.indexOf(t.appTitle)
    const slogan = hero.indexOf(t.slogan)
    const description = hero.indexOf(t.home.description)
    expect(title).toBeLessThan(slogan)
    expect(slogan).toBeLessThan(description)
    // Centered: the text, and the narrow description block itself.
    expect(hero).toContain('text-center')
    expect(hero).toMatch(/<p class="mx-auto [^"]*max-w-3xl/)
  })
})

describe('the home page 資料根據', () => {
  it('shows 資料根據 (counts and bar) on each issue card', () => {
    const issues = cards(block(render(), 'recent-issues'))
    expect(issues.length).toBeGreaterThan(0)
    for (const card of issues) {
      expect(card).toContain(t.basis.label)
      expect(card).toContain(BAR)
    }
  })

  it('shows 資料根據 of all its stories on each stakeholder card, with no share', () => {
    const html = block(render(), 'recent-stakeholders')
    const list = recentStakeholders(index.stakeholders, 5)
    const shown = cards(html)
    expect(shown).toHaveLength(list.length)
    shown.forEach((card, i) => {
      const cells = stakeholderCells(issueFiles, list[i].id)
      // The label says the bar counts every issue, as on #/stakeholders.
      expect(card).toContain(`>${t.stakeholdersList.basis}</dt>`)
      // Each part of the counts: 「實證</span> 3」 and so on.
      for (const p of basisTextParts(cells)) expect(card).toContain(`${t.basis.parts[p.key]}</span> ${p.count}`)
      expect(card).toContain(BAR)
      expect(card).not.toContain('%')
    })
  })

  it('does not show the 資料根據 explanation: it is on #/about (decision 128)', () => {
    const html = render()
    expect(html).not.toContain(t.about.basisNote)
  })

  it('keeps an invisible row in place of the bar while the issue files load', () => {
    state.issuesReady = false
    const html = block(render(), 'recent-stakeholders')
    for (const card of cards(html)) {
      expect(card).not.toContain(BAR)
      expect(card).toContain('aria-hidden="true" class="invisible')
    }
    // The cards are already there.
    expect(cards(html)).toHaveLength(recentStakeholders(index.stakeholders, 5).length)
  })
})

describe('the home page issue titles on cards (decision 112)', () => {
  it('shows each issue of a stakeholder card as 「#n 標題」, one link per line', () => {
    const shown = cards(block(render(), 'recent-stakeholders'))
    recentStakeholders(index.stakeholders, 5).forEach((s, i) => {
      for (const n of s.issues) {
        expect(shown[i]).toContain(`<li class="break-words"><a class="text-link`)
        expect(shown[i]).toContain(`>${issueNumberTitle(index.issues, n)}</a></li>`)
      }
    })
  })

  it('shows the other issues of 跨議題共用的利害關係人 with their titles', () => {
    const shown = cards(block(render(), 'recent-issues'))
    recentIssues(index.issues, 5).forEach((issue, i) => {
      const shared = sharedForCard(index, issue)
      if (shared && shared.titles.length > 0) {
        expect(shown[i]).toContain(t.issueCard.sharedValue(shared.count, shared.titles))
        expect(shared.titles[0]).toMatch(/^#\d+ \S/)
      }
    })
  })

  it('shows the issue of an issue solution, and the issues of a cross-issue solution, with titles', () => {
    const html = block(render(), 'recent-solutions')
    const items = recentSolutionItems(issueFiles, crossJson as CrossIssueFile, 5)
    const lis = html.split('<li>').slice(1)
    expect(lis).toHaveLength(items.length)
    items.forEach((item, i) => {
      if (item.kind === 'cross') {
        for (const part of item.solution.parts) expect(lis[i]).toContain(issueNumberTitle(index.issues, part.issue))
      } else {
        expect(lis[i]).toContain(`>${t.home.solutionIssue}</dt>`)
        expect(lis[i]).toContain(issueNumberTitle(index.issues, item.issueNumber))
      }
    })
  })
})

describe('the home page solution cards 資料根據 (decision 112)', () => {
  it('shows 涵蓋需求的資料根據 (counts and bar, no share) on each solution card', () => {
    const html = block(render(), 'recent-solutions')
    const items = recentSolutionItems(issueFiles, crossJson as CrossIssueFile, 5)
    const lis = html.split('<li>').slice(1)
    items.forEach((item, i) => {
      const cells = item.kind === 'cross'
        ? crossSolutionCells(crossJson as CrossIssueFile, item.solution, issueFiles)
        : solutionCells(issueFiles.find((f) => f.number === item.issueNumber)!, item.solution)
      expect(lis[i]).toContain(`>${t.solutionsList.basis}</dt>`)
      const parts = basisTextParts(cells)
      if (parts.length === 0) {
        expect(lis[i]).toContain(t.solutionsList.basisNone)
      } else {
        for (const p of parts) expect(lis[i]).toContain(`${t.basis.parts[p.key]}</span> ${p.count}`)
        expect(lis[i]).toContain(BAR)
      }
      // No share: the summary text may have a 「%」, so look for the share text.
      expect(lis[i]).not.toContain('實證＋AI整理')
    })
  })
})
