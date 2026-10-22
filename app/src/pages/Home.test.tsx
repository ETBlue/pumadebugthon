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
import { stakeholderCells } from '@/lib/coverage'
import { recentStakeholders } from '@/lib/recent'
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
      expect(card).toContain(`>${t.basis.label}</dt>`)
      // Each part of the counts: 「實證</span> 3」 and so on.
      for (const p of basisTextParts(cells)) expect(card).toContain(`${t.basis.parts[p.key]}</span> ${p.count}`)
      expect(card).toContain(BAR)
      expect(card).not.toContain('%')
    })
  })

  it('shows the 資料根據 explanation once under each of the two lists', () => {
    const html = render()
    expect(block(html, 'recent-issues')).toContain(t.basis.listNote('議題'))
    expect(block(html, 'recent-stakeholders')).toContain(t.basis.listNote('利害關係人'))
    expect(html.split(t.basis.listNote('利害關係人')).length - 1).toBe(1)
  })

  it('keeps an invisible row in place of the bar while the issue files load', () => {
    state.issuesReady = false
    const html = block(render(), 'recent-stakeholders')
    for (const card of cards(html)) {
      expect(card).not.toContain(BAR)
      expect(card).toContain('aria-hidden="true" class="invisible')
    }
    // The cards and the explanation are already there.
    expect(cards(html)).toHaveLength(recentStakeholders(index.stakeholders, 5).length)
    expect(html).toContain(t.basis.listNote('利害關係人'))
  })
})
