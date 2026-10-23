// The story page (design 3.15): the band and the 解法 cards with 資料根據
// (decisions 111 and 112). The data hooks and the page title are mocked, so
// the page renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import { t } from '@/i18n/zh-TW'
import type { IndexFile, IssueFile } from '@/types'
import StakeholderStory from './StakeholderStory'

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: indexJson as IndexFile }),
  useIssue: () => ({ status: 'ready', data: trashcansJson as IssueFile }),
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

function render(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="stakeholders/:id/stories/:number/:storyId" element={<StakeholderStory />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('the story page', () => {
  const html = render('/stakeholders/I06/stories/2/I06-US01')

  it('keeps the breadcrumb and has the back button to the stakeholder page', () => {
    expect(html).toContain('aria-label="頁面位置"')
    expect(html).toContain('aria-label="回到 I06 ')
    expect(html).toContain('href="/stakeholders/I06"')
  })

  it('shows 資料根據 on each solution card, and no explanation under the list', () => {
    // Only the 解法 section: from its intro line to the next heading 更多.
    const part = html.slice(html.indexOf(t.storyPage.solutionsIntro), html.indexOf(t.storyPage.moreHeading))
    // A compact SolutionCard is a div with these classes.
    const cards = part.split('class="rounded-md border p-3"').length - 1
    expect(cards).toBeGreaterThan(0)
    expect(part.split(t.solutionsList.basis).length - 1).toBe(cards)
    // The 資料根據 explanation is on #/about only (decision 128).
    expect(html).not.toContain(t.about.basisNote)
  })
})
