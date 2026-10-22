// Issue titles on cards (decision 112): the cards show 「#1 把三千棵樹種回來」,
// not only 「#1」.
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import { t } from '@/i18n/zh-TW'
import { crossIssueNumbers } from '@/lib/crossIssue'
import { issueNumberTitle } from '@/lib/issues'
import { alsoInIssues } from '@/lib/stakeholders'
import type { CrossIssueFile, IndexFile } from '@/types'
import { AlsoIn } from './issue/AlsoIn'
import { IssueTitleLinks } from './IssueTitleLinks'
import { CrossIssueLinks, CrossSolutionCard } from './solution/CrossSolutionCard'
import { StakeholderCard } from './StakeholderCard'

const index = indexJson as IndexFile
const cross = crossJson as CrossIssueFile
const available = index.issues.filter((i) => i.available).map((i) => i.number)

const html = (node: ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('IssueTitleLinks', () => {
  it('shows each issue as a link with its title, one list item per issue', () => {
    const out = html(<IssueTitleLinks numbers={[1, 8]} titles={index.issues} to={(n) => `/issues/${n}`} />)
    expect(out.match(/<li /g)).toHaveLength(2)
    expect(out).toContain('href="/issues/1"')
    expect(out).toContain('>#1 把三千棵樹種回來</a>')
    expect(out).toContain('>#8 無菸城市</a>')
  })
})

describe('AlsoIn', () => {
  it('shows the other issues with their titles', () => {
    const s = index.stakeholders.find((x) => alsoInIssues(index.stakeholders, x.id, x.issues[0], available).length > 0)!
    const others = alsoInIssues(index.stakeholders, s.id, s.issues[0], available)
    const out = html(<AlsoIn index={index} id={s.id} issueNumber={s.issues[0]} available={available} />)
    expect(out).toContain(t.opinion.alsoIn(others.map((n) => issueNumberTitle(index.issues, n))))
  })
})

describe('StakeholderCard', () => {
  const s = index.stakeholders.find((x) => x.issues.length >= 2)!

  it('shows 出現的議題 on #/stakeholders with titles, one per line', () => {
    const out = html(
      <StakeholderCard
        variant="detailed"
        stakeholder={s}
        listFields={{
          path: '', issues: [1, 2], issueTitles: index.issues,
          cells: { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 },
          evidencePercent: null, needs: { covered: 0, total: 0 }, solutionsPercent: null,
        }}
      />,
    )
    expect(out).toContain('>#1 把三千棵樹種回來</a></li>')
    expect(out).toContain('>#2 找回消失的垃圾桶</a></li>')
  })

  it('shows the issue of each entry with its title on the issue 利害關係人 tab', () => {
    const out = html(
      <StakeholderCard variant="detailed" stakeholder={s} entries={[{ issueNumber: 8, stories: [], counts: [] }]} issueTitles={index.issues} />,
    )
    expect(out).toContain('#8 無菸城市')
  })
})

describe('CrossSolutionCard', () => {
  const sol = cross.solutions[0]

  it('shows its issues with their titles on a card', () => {
    const out = html(<CrossSolutionCard solution={sol} issueTitles={index.issues} />)
    for (const n of crossIssueNumbers(sol)) expect(out).toContain(`>${issueNumberTitle(index.issues, n)}</a></li>`)
  })

  it('keeps 「#1、#2」 when CrossIssueLinks gets no titles (the solution page line)', () => {
    const out = html(<CrossIssueLinks solution={sol} />)
    const numbers = crossIssueNumbers(sol)
    expect(out).toContain(`>#${numbers[0]}</a>`)
    expect(out).not.toContain(issueNumberTitle(index.issues, numbers[0]))
  })
})
