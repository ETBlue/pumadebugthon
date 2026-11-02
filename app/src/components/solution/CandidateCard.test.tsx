// One card of the 可能合併 tab (Task U6 of app/docs/plan-types-ui.md):
// the other solution of a candidate pair and what the two share.
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import { t } from '@/i18n/zh-TW'
import { solutionCandidates } from '@/lib/candidates'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { CandidateCard } from './CandidateCard'

const cross = crossJson as CrossIssueFile
const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const tc = t.candidates

function html(node: ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)
}

/** The <dd> of the field with this label, or null when there is none. */
function field(out: string, label: string): string | null {
  const m = new RegExp(`<dt class="text-muted-foreground">${label}</dt><dd>([\\s\\S]*?)</dd>`).exec(out)
  return m ? m[1] : null
}

/** The card of the other solution on the page of n-s. solutionFound: pass
 * the other solution from the #1 file. Use it only when other is in #1. */
function card(n: number, s: string, other: string, solutionFound = true): string {
  const item = solutionCandidates(cross, n, s).find((c) => `${c.issueNumber}-${c.code}` === other)!
  const solution = solutionFound ? trees.solutions.find((x) => x.id === item.code) ?? null : null
  return html(<CandidateCard item={item} solution={solution} types={index} data={cross} />)
}

const hrefs = (s: string | null) => [...(s ?? '').matchAll(/href="([^"]+)"/g)].map((m) => m[1])

describe('CandidateCard', () => {
  it('links the other solution with 「#n Sk」 and its name', () => {
    const out = card(2, 'S1', '1-S1')
    const name = trees.solutions.find((x) => x.id === 'S1')!.name.text
    expect(out).toContain('href="/solutions/1-S1"')
    expect(out).toContain('#1 S1')
    expect(out).toContain(name.replace(/\*\*/g, ''))
  })

  it('without the issue file, still links 「#n Sk」', () => {
    const out = card(2, 'S1', '1-S1', false)
    expect(out).toMatch(/<a [^>]*href="\/solutions\/1-S1"[^>]*>.*#1 S1.*<\/a>/)
  })

  it('shows the shared types as links to their type pages', () => {
    const out = card(2, 'S1', '1-S1')
    expect(hrefs(field(out, tc.solutionTypes))).toEqual(['/solution-types/digital-tool', '/solution-types/planning'])
    expect(hrefs(field(out, tc.domains))).toEqual(['/domains/environment'])
    expect(hrefs(field(out, tc.spaces))).toEqual(['/spaces/sidewalk-furniture'])
  })

  it('leaves out an empty 共同領域 and 共同空間類型 row (1-S2 and 9-S4)', () => {
    const out = card(1, 'S2', '9-S4', false)
    expect(field(out, tc.domains)).toBeNull()
    expect(field(out, tc.spaces)).toBeNull()
    expect(field(out, tc.solutionTypes)).not.toBeNull()
    expect(field(out, tc.needs)).not.toBeNull()
  })

  it('共同需求: an X-N group shows its ID and summary as text; a 1.2 row is text', () => {
    const needs = field(card(1, 'S4', '8-S1', false), tc.needs)!
    const group = cross.needGroups.find((g) => g.id === 'X-N2')!
    expect(needs).toContain('X-N2')
    expect(needs).toContain(group.summary.replace(/\*\*/g, '').slice(0, 6))
    expect(needs).toContain('1.2 O12')
    // An X-N group and a 1.2 row have no page, so there is no link.
    expect(hrefs(needs)).toEqual([])
  })

  it('已在跨議題解法: links to the X- solution', () => {
    const merged = field(card(2, 'S1', '1-S1'), tc.crossSolutions)!
    expect(hrefs(merged)).toEqual(['/solutions/X-S2'])
    expect(merged).toContain('X-S2')
  })

  it('已在跨議題解法: 「尚未合併」 when no X- solution holds both', () => {
    const merged = field(card(1, 'S5', '2-S4', false), tc.crossSolutions)!
    expect(merged).toContain(tc.notMerged)
    expect(hrefs(merged)).toEqual([])
  })

  it('has the rows in the order of the plan', () => {
    const out = card(2, 'S1', '1-S1')
    const labels = [...out.matchAll(/<dt class="text-muted-foreground">([^<]+)<\/dt>/g)].map((m) => m[1])
    expect(labels).toEqual([tc.solutionTypes, tc.domains, tc.spaces, tc.needs, tc.crossSolutions])
  })
})
