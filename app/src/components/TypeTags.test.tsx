// The 領域 and 解法類型 tags on the cards (Task U4 of
// app/docs/plan-types-ui.md). They show where the 空間類型 tags show:
//
// | Card                  | 空間類型 | 領域                          | 解法類型 |
// |-----------------------|----------|-------------------------------|----------|
// | IssueCard             | yes      | yes                           | no       |
// | SolutionCard detailed | yes      | yes (decision 5)              | yes      |
// | CrossSolutionCard     | yes      | yes (the union, normal style) | yes      |
//
// Decision 5: a solution with no own 領域 shows the issue's 領域 in a muted
// style, followed by 「（沿用議題）」.
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import { t } from '@/i18n/zh-TW'
import type { AvailableIssueSummary, CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { IssueCard } from './IssueCard'
import { CrossSolutionCard } from './solution/CrossSolutionCard'
import { SolutionCard } from './SolutionCard'
import { TypeLinks } from './TypeLinks'

const index = indexJson as IndexFile
const trashcans = trashcansJson as IssueFile
const cross = crossJson as CrossIssueFile
const tt = t.typeTags
const BASIS = { cells: { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 }, percent: null }

function html(node: ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

/** The <dd> of the field with this label, or null when there is none. */
function field(out: string, label: string): string | null {
  const m = new RegExp(`<dt class="text-muted-foreground">${label}</dt><dd>([\\s\\S]*?)</dd>`).exec(out)
  return m ? m[1] : null
}

/** The [href, text] of each link in a piece of HTML. */
function links(out: string): [string, string][] {
  return [...out.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => [m[1], m[2]])
}

/** The labels of the fields, in order. */
function labels(out: string): string[] {
  return [...out.matchAll(/<dt class="text-muted-foreground">([^<]+)<\/dt>/g)].map((m) => m[1])
}

const issue2 = index.issues.find((i) => i.number === 2) as AvailableIssueSummary
const issue8 = index.issues.find((i) => i.number === 8) as AvailableIssueSummary
const s1 = trashcans.solutions.find((s) => s.id === 'S1')!
/** #2 S1 with its own 領域 police. No fixture solution has an own 領域. */
const s1Own = { ...s1, domains: ['police'], ownDomains: ['police'] }

function solutionCard(solution = s1): string {
  return html(
    <SolutionCard
      variant="detailed"
      solution={solution}
      issueNumber={2}
      types={index}
      coveredNeeds={null}
      issueTitle={issue2.title}
      basis={BASIS}
    />,
  )
}

describe('TypeLinks', () => {
  it('links each code to its type page, with the level 2 name, in the order given', () => {
    const out = html(<TypeLinks kind="domain" types={index.domainTypes} codes={['health', 'environment']} />)
    expect(links(out)).toEqual([['/domains/health', '醫療保健'], ['/domains/environment', '環境保護']])
    const st = html(<TypeLinks kind="solutionType" types={index.solutionTypes} codes={['planning', 'digital-tool']} />)
    expect(links(st)).toEqual([['/solution-types/planning', '調查與規劃'], ['/solution-types/digital-tool', '數位工具']])
  })

  it('fromIssue: muted links, then 「（沿用議題）」 as text that screen readers also read', () => {
    const out = html(<TypeLinks kind="domain" types={index.domainTypes} codes={['environment']} fromIssue />)
    expect(out).toContain(tt.fromIssue)
    expect(tt.fromIssue).toBe('（沿用議題）')
    // Not hidden from screen readers.
    expect(out).not.toContain('aria-hidden')
    expect(out).not.toContain('sr-only')
    // The link is muted but still underlined, so it does not depend on color only.
    expect(out).toMatch(/<a [^>]*class="[^"]*text-muted-foreground[^"]*underline[^"]*"[^>]*href="\/domains\/environment"/)
    expect(out).not.toContain('text-link')
    // The note comes after the links.
    expect(out.indexOf(tt.fromIssue)).toBeGreaterThan(out.indexOf('環境保護'))
  })

  it('without fromIssue: normal links and no note', () => {
    const out = html(<TypeLinks kind="domain" types={index.domainTypes} codes={['environment']} />)
    expect(out).toContain('text-link')
    expect(out).not.toContain(tt.fromIssue)
  })
})

describe('IssueCard: 空間類型 and 領域, no 解法類型', () => {
  for (const variant of ['detailed', 'compact'] as const) {
    it(`${variant}: 領域 in the order of the issue (#8: 醫療保健, 環境保護), normal style`, () => {
      const out = variant === 'detailed'
        ? html(<IssueCard variant="detailed" issue={issue8} types={index} shared={null} />)
        : html(<IssueCard variant="compact" issue={issue8} types={index} shared={null} />)
      expect(links(field(out, tt.domain) ?? '')).toEqual([['/domains/health', '醫療保健'], ['/domains/environment', '環境保護']])
      expect(field(out, tt.space)).not.toBeNull()
      expect(field(out, tt.solutionType)).toBeNull()
      expect(out).not.toContain(tt.fromIssue)
      // 領域 comes right after 空間類型.
      const l = labels(out)
      expect(l.indexOf(tt.domain)).toBe(l.indexOf(tt.space) + 1)
    })
  }

  it('an issue with no 領域 has no 領域 row', () => {
    const out = html(<IssueCard variant="detailed" issue={{ ...issue2, domains: [] }} types={index} shared={null} />)
    expect(field(out, tt.domain)).toBeNull()
  })
})

describe('SolutionCard (detailed): 空間類型, 領域 and 解法類型', () => {
  it('a solution with no own 領域: the issue 領域, muted, then 「（沿用議題）」 (decision 5)', () => {
    const out = solutionCard()
    const domains = field(out, tt.domain) ?? ''
    expect(links(domains)).toEqual([['/domains/environment', '環境保護']])
    expect(domains).toContain('text-muted-foreground')
    expect(domains).toContain(tt.fromIssue)
  })

  it('a solution with its own 領域: normal links, no 「（沿用議題）」 (decision 5)', () => {
    const out = solutionCard(s1Own)
    const domains = field(out, tt.domain) ?? ''
    expect(links(domains)).toEqual([['/domains/police', '警政']])
    expect(domains).not.toContain('text-muted-foreground')
    expect(out).not.toContain(tt.fromIssue)
  })

  it('解法類型 in the order of the cell, each a link', () => {
    expect(links(field(solutionCard(), tt.solutionType) ?? '')).toEqual([
      ['/solution-types/digital-tool', '數位工具'], ['/solution-types/planning', '調查與規劃'],
    ])
  })

  it('the rows are 空間類型, 領域, 解法類型, in this order', () => {
    const l = labels(solutionCard())
    expect(l.indexOf(tt.domain)).toBe(l.indexOf(tt.space) + 1)
    expect(l.indexOf(tt.solutionType)).toBe(l.indexOf(tt.domain) + 1)
  })

  it('the compact card has no tags, as today', () => {
    const out = html(<SolutionCard variant="compact" solution={s1} issueNumber={2} />)
    expect(field(out, tt.domain)).toBeNull()
    expect(field(out, tt.solutionType)).toBeNull()
  })
})

describe('CrossSolutionCard (detailed): the union of 領域, normal style, and 解法類型', () => {
  const x4 = cross.solutions.find((s) => s.code === 'X-S4')!
  const out = html(
    <CrossSolutionCard
      solution={x4}
      issueTitles={index.issues}
      detailed={{ types: index, coveredNeeds: null, basis: BASIS, alsoCovers: [] }}
    />,
  )

  it('領域: the union in the order of the data, never muted, no 「（沿用議題）」', () => {
    const domains = field(out, tt.domain) ?? ''
    expect(links(domains)).toEqual([
      ['/domains/environment', '環境保護'], ['/domains/health', '醫療保健'],
      ['/domains/administration', '行政'], ['/domains/civil-affairs', '民政'],
    ])
    expect(domains).not.toContain('text-muted-foreground')
    expect(out).not.toContain(tt.fromIssue)
  })

  it('解法類型 and 空間類型', () => {
    expect(links(field(out, tt.solutionType) ?? '')).toEqual([
      ['/solution-types/digital-tool', '數位工具'], ['/solution-types/open-data', '資料公開'],
    ])
    expect(field(out, tt.space)).not.toBeNull()
  })

  it('the small card (no detailed) has no tags, as today', () => {
    const small = html(<CrossSolutionCard solution={x4} issueTitles={index.issues} />)
    expect(field(small, tt.domain)).toBeNull()
    expect(field(small, tt.solutionType)).toBeNull()
  })
})
