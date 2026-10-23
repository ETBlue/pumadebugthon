// The 資料根據 part of #/about (decision 128). The data hooks and the page
// title are mocked, so the page renders on the server with the fixtures.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import { t } from '@/i18n/zh-TW'
import type { IndexFile } from '@/types'
import About from './About'

vi.mock('@/data', () => ({
  useIndex: () => ({ status: 'ready', data: indexJson as IndexFile }),
  useCrossIssueOrNull: () => null,
}))

vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }))

function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/about']}>
      <About />
    </MemoryRouter>,
  )
}

/** The HTML of one part, from its section tag to the end of the section. */
function part(html: string, id: string): string {
  const start = html.indexOf(`aria-labelledby="${id}"`)
  const end = html.indexOf('</section>', start)
  return html.slice(start, end)
}

describe('the 資料根據 part of #/about', () => {
  const html = render()
  const basis = part(html, 'about-basis')

  it('has the heading 資料根據 and the one explanation', () => {
    expect(basis).toContain(`<h2 id="about-basis" class="text-xl font-bold">資料根據</h2>`)
    expect(basis).toContain(
      '「資料根據」是分析內容的資料來源組成，不代表議題、利害關係人或解法的重要性或好壞。組織的使用者故事在真人訪談前都標記 [AI模擬]，所以不會到 100%。',
    )
    expect(html.split(t.about.basisNote).length - 1).toBe(1)
  })

  it('explains the four tags with the same text as the 總覽 legend', () => {
    for (const text of Object.values(t.overview.legend)) expect(basis).toContain(text)
  })

  it('has no links inside', () => {
    expect(basis).not.toContain('<a ')
  })

  it('comes before the data files part', () => {
    expect(html.indexOf('id="about-basis"')).toBeLessThan(html.indexOf('id="about-data"'))
  })
})
