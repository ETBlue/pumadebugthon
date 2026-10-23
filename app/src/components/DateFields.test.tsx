// The dates of every item (decision 131): a detail page shows 新增日期 and
// 更新日期, a full-size list card shows only 更新日期, and a small card shows
// no date (decision 132). The cards render on the server
// with small items built here, so the test does not depend on the dates in
// the fixtures.
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import { t } from '@/i18n/zh-TW'
import type { AvailableIssueSummary, CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { DateFields, UpdatedField } from './DateFields'
import { IssueCard } from './IssueCard'
import { CrossSolutionCard } from './solution/CrossSolutionCard'
import { SolutionCard } from './SolutionCard'
import { SpaceCard } from './SpaceCard'
import { StakeholderCard } from './StakeholderCard'
import { StoryCard } from './StoryCard'

const index = indexJson as IndexFile
const trashcans = trashcansJson as IssueFile
const cross = crossJson as CrossIssueFile

const ADDED = '2026-10-17'
const UPDATED = '2026-10-21'
const addedField = `<dt class="text-muted-foreground">${t.dates.added}</dt><dd><time dateTime="${ADDED}">${ADDED}</time></dd>`
const updatedField = `<dt class="text-muted-foreground">${t.dates.updated}</dt><dd><time dateTime="${UPDATED}">${UPDATED}</time></dd>`

function html(node: ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

/** A card shows 更新日期 as a <time>, and no 新增日期 at all. */
function expectUpdatedOnly(card: string) {
  expect(card).toContain(`<time dateTime="${UPDATED}">${UPDATED}</time>`)
  expect(card).toContain(t.dates.updated)
  expect(card).not.toContain(t.dates.added)
  expect(card).not.toContain(ADDED)
}

/** A small card shows no date at all (decision 132). */
function expectNoDate(card: string) {
  expect(card).not.toContain(t.dates.updated)
  expect(card).not.toContain(t.dates.added)
  expect(card).not.toContain(UPDATED)
  expect(card).not.toContain(ADDED)
  expect(card).not.toContain('<time')
}

describe('DateFields and UpdatedField', () => {
  it('DateFields shows 新增日期, then 更新日期, each as a <time>', () => {
    const out = renderToStaticMarkup(<dl><DateFields added={ADDED} updated={UPDATED} /></dl>)
    expect(out).toContain(addedField)
    expect(out).toContain(updatedField)
    expect(out.indexOf(t.dates.added)).toBeLessThan(out.indexOf(t.dates.updated))
  })

  it('leaves out a missing date', () => {
    expect(renderToStaticMarkup(<dl><DateFields added={null} updated={UPDATED} /></dl>)).not.toContain(t.dates.added)
    expect(renderToStaticMarkup(<dl><DateFields added={ADDED} /></dl>)).not.toContain(t.dates.updated)
    expect(renderToStaticMarkup(<dl><UpdatedField updated="" /></dl>)).toBe('<dl></dl>')
  })

  it('UpdatedField never shows 新增日期', () => {
    const out = renderToStaticMarkup(<dl><UpdatedField updated={UPDATED} /></dl>)
    expect(out).toBe(`<dl><div class="flex flex-wrap gap-x-2">${updatedField}</div></dl>`)
  })
})

describe('the full-size cards show only 更新日期 (decision 131), the small cards no date (decision 132)', () => {
  const issue = { ...index.issues.find((i) => i.number === 2), added: ADDED, updated: UPDATED } as AvailableIssueSummary
  const stakeholder = { ...index.stakeholders.find((s) => s.id === 'I06')!, added: ADDED, updated: UPDATED }
  const solution = { ...trashcans.solutions[0], added: ADDED, updated: UPDATED }
  const crossSolution = { ...cross.solutions[0], added: ADDED, updated: UPDATED }

  it('IssueCard, both variants', () => {
    expectUpdatedOnly(html(<IssueCard variant="compact" issue={issue} spaceTypes={index.spaceTypes} shared={null} />))
    expectUpdatedOnly(html(
      <IssueCard variant="detailed" issue={issue} spaceTypes={index.spaceTypes} shared={null} />,
    ))
  })

  it('StakeholderCard: the detailed variants show 更新日期, the compact one no date', () => {
    expectNoDate(html(<StakeholderCard variant="compact" stakeholder={stakeholder} />))
    expectNoDate(html(<StakeholderCard variant="compact" stakeholder={stakeholder}><p>CHILD</p></StakeholderCard>))
    expectUpdatedOnly(html(<StakeholderCard variant="detailed" stakeholder={stakeholder} entries={[]} />))
    const listFields = {
      path: '', issues: [], issueTitles: index.issues, cells: { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 },
      evidencePercent: null, needs: { covered: 0, total: 0 }, solutionsPercent: null,
    }
    const card = html(<StakeholderCard variant="detailed" stakeholder={stakeholder} listFields={listFields} />)
    expectUpdatedOnly(card)
    // Once, inside the list fields.
    expect(card.split(t.dates.updated).length - 1).toBe(1)
  })

  it('StakeholderCard with entries shows 更新日期 after children', () => {
    const card = html(<StakeholderCard variant="detailed" stakeholder={stakeholder} entries={[]}><p>CHILD</p></StakeholderCard>)
    expect(card.indexOf('CHILD')).toBeLessThan(card.indexOf(t.dates.updated))
  })

  it('SolutionCard: the detailed variant shows 更新日期, the compact one no date', () => {
    expectNoDate(html(<SolutionCard variant="compact" solution={solution} issueNumber={2} />))
    const basis = { cells: { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 }, percent: null }
    expectUpdatedOnly(html(
      <SolutionCard
        variant="detailed" solution={solution} issueNumber={2} spaceTypes={index.spaceTypes}
        coveredNeeds={null} issueTitle="找回消失的垃圾桶" basis={basis}
      />,
    ))
  })

  it('CrossSolutionCard: with detailed it shows 更新日期, without detailed no date', () => {
    expectNoDate(html(<CrossSolutionCard solution={crossSolution} issueTitles={index.issues} />))
    const basis = { cells: { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 }, percent: null }
    expectUpdatedOnly(html(
      <CrossSolutionCard
        solution={crossSolution} issueTitles={index.issues}
        detailed={{ spaceTypes: index.spaceTypes, coveredNeeds: null, basis, alsoCovers: [] }}
      />,
    ))
  })

  it('StoryCard shows no date', () => {
    const story = { ...trashcans.stories[0], added: ADDED, updated: UPDATED }
    expectNoDate(html(<StoryCard story={story} issue={trashcans} stakeholderName="x" />))
    expectNoDate(html(<StoryCard story={story} issue={trashcans} stakeholderName="x" compact />))
  })

  it('SpaceCard, also for a space with no analyzed issue', () => {
    const space = { ...index.spaceTypes[0], added: ADDED, updated: UPDATED }
    expectUpdatedOnly(html(<SpaceCard space={space} issues={[2]} titles={index.issues} counts={null} />))
    expectUpdatedOnly(html(<SpaceCard space={space} issues={[]} titles={index.issues} counts={null} />))
  })
})
