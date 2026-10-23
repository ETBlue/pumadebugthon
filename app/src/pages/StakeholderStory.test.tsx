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

describe('the dates of the story (decision 131)', () => {
  const story = (trashcansJson as IssueFile).stories.find((s) => s.id === 'I06-US01')!
  const row = (label: string, date: string) =>
    `${label}</dt><dd class="min-w-0"><time dateTime="${date}">${date}</time></dd>`

  it('shows 新增日期 and 更新日期 after the issue line', () => {
    // The fixture has no dates on the stories, so this test sets them.
    const saved = { added: story.added, updated: story.updated }
    Object.assign(story, { added: '2026-10-16', updated: '2026-10-20' })
    try {
      const html = render('/stakeholders/I06/stories/2/I06-US01')
      expect(html).toContain(row(t.dates.added, '2026-10-16'))
      expect(html).toContain(row(t.dates.updated, '2026-10-20'))
      expect(html.indexOf(`>${t.storyPage.issue}</dt>`)).toBeGreaterThan(-1)
      expect(html.indexOf(`>${t.storyPage.issue}</dt>`)).toBeLessThan(html.indexOf(t.dates.added))
    } finally {
      Object.assign(story, saved)
    }
  })

  it('leaves out a date the story does not have', () => {
    const html = render('/stakeholders/I06/stories/2/I06-US01')
    expect(html).not.toContain(t.dates.added)
  })
})
