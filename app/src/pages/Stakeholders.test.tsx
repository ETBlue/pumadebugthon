// The counts after each stakeholder in the tree view of #/stakeholders
// (design 3.23.11, decision 117). The data hooks and the page title are
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
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import Stakeholders from './Stakeholders'

const index = indexJson as IndexFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

const state: { issuesReady: boolean; crossReady: boolean } = { issuesReady: true, crossReady: true }

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: index }),
  useIssues: () => (state.issuesReady ? { status: 'ready', data: issueFiles } : { status: 'loading' }),
  useCrossIssue: () => (state.crossReady ? { status: 'ready', data: crossJson as CrossIssueFile } : { status: 'loading' }),
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

function render(search: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/stakeholders${search}`]}>
      <Stakeholders />
    </MemoryRouter>,
  )
}

/** The HTML of the tree link of one stakeholder. */
function link(html: string, id: string): string {
  const start = html.indexOf(`href="/stakeholders/${id}"`)
  expect(start).toBeGreaterThan(-1)
  return html.slice(start, html.indexOf('</a>', start))
}

beforeEach(() => {
  state.issuesReady = true
  state.crossReady = true
})

describe('the tree view counts', () => {
  it('shows 「議題 N・解法 M」 after each stakeholder', () => {
    const html = render('?view=tree')
    // I06 is in #1, #2, #8 and #9. 5 issue solutions and 2 cross-issue
    // solutions cover its needs.
    expect(link(html, 'I06')).toContain('>議題 4・解法 7</span>')
    // O09 is in #2 only, with 1 solution.
    expect(link(html, 'O09')).toContain('>議題 1・解法 1</span>')
    expect(t.stakeholdersList.treeCounts(4, 7)).toBe('議題 4・解法 7')
  })

  it('shows the issue count only, never a wrong 0, while the issue files load', () => {
    state.issuesReady = false
    const html = render('?view=tree')
    expect(link(html, 'I06')).toContain('>議題 4</span>')
    expect(html).not.toContain('解法 0')
    expect(html).not.toContain('・解法')
  })

  it('shows the issue count only while the cross-issue file loads', () => {
    state.crossReady = false
    const html = render('?view=tree')
    expect(link(html, 'I06')).toContain('>議題 4</span>')
    expect(html).not.toContain('・解法')
  })

  it('does not show the counts in the card view', () => {
    expect(render('')).not.toContain('議題 4・解法 7')
  })
})
