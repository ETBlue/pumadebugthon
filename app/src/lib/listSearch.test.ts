import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, IndexFile, IssueFile, IssueSummary } from '@/types'
import {
  issueMatches,
  parseListQuery,
  solutionMatches,
  spaceMatches,
  stakeholderMatches,
  type SearchSolutionItem,
} from './listSearch'

const index = indexJson as IndexFile
const cross = crossJson as CrossIssueFile
const issueFiles = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

// A test item: issue #10 does not exist in the data yet.
const issue10: IssueSummary = { ...index.issues[0], number: 10, title: '測試議題' } as IssueSummary
const issues: IssueSummary[] = [...index.issues, issue10]

// Every solution: the issue solutions, then the cross-issue solutions.
const solutions: SearchSolutionItem[] = [
  ...issueFiles.flatMap((f) =>
    f.solutions.map((solution) => ({ kind: 'issue' as const, issueNumber: f.number, solution })),
  ),
  ...cross.solutions.map((solution) => ({ kind: 'cross' as const, solution })),
]

function issueHits(q: string): number[] {
  const query = parseListQuery(q)
  return issues.filter((i) => issueMatches(i, query)).map((i) => i.number)
}

function stakeholderHits(q: string): string[] {
  const query = parseListQuery(q)
  return index.stakeholders.filter((s) => stakeholderMatches(s, query)).map((s) => s.id)
}

function code(item: SearchSolutionItem): string {
  return item.kind === 'cross' ? item.solution.code : `${item.issueNumber}${item.solution.id}`
}

function solutionHits(q: string): string[] {
  const query = parseListQuery(q)
  return solutions.filter((s) => solutionMatches(s, query)).map(code)
}

describe('parseListQuery', () => {
  it('makes the text lower case, half-width and trimmed', () => {
    expect(parseListQuery('  Ｉ０６ ')).toEqual({ text: 'i06', key: 'i06' })
  })

  it('keeps the spaces inside the text, and removes spaces, # and - from the key', () => {
    expect(parseListQuery('#2 A')).toEqual({ text: '#2 a', key: '2a' })
    expect(parseListQuery('X-A')).toEqual({ text: 'x-a', key: 'xa' })
  })

  it('returns null for an empty search, or only spaces and #', () => {
    expect(parseListQuery('')).toBeNull()
    expect(parseListQuery('   ')).toBeNull()
    expect(parseListQuery('#')).toBeNull()
    expect(parseListQuery(' ＃ # ')).toBeNull()
  })
})

describe('issueMatches', () => {
  it('finds #8 by its number, with or without # or a leading zero, also in full width', () => {
    for (const q of ['8', '#8', '＃８', '08', '# 8']) expect(issueHits(q)).toEqual([8])
  })

  it('finds #8 by a part of its title', () => {
    expect(issueHits('無菸')).toEqual([8])
  })

  it('needs the whole number: 1 finds #1, not #10', () => {
    expect(issueHits('1')).toEqual([1])
  })

  it('finds every issue when the query is empty or only #', () => {
    const all = issues.map((i) => i.number)
    expect(issueHits('')).toEqual(all)
    expect(issueHits('#')).toEqual(all)
    expect(issues.every((i) => issueMatches(i, null))).toBe(true)
  })
})

describe('stakeholderMatches', () => {
  it('finds I06 by its ID, in any case, with spaces or without leading zeros', () => {
    for (const q of ['i6', 'I06', 'I 06', 'Ｉ０６']) expect(stakeholderHits(q)).toEqual(['I06'])
  })

  it('finds O12 by its ID, but not I12', () => {
    expect(stakeholderHits('O12')).toEqual(['O12'])
  })

  it('needs the whole ID: I1 does not find I12', () => {
    expect(stakeholderHits('I1')).not.toContain('I12')
    expect(stakeholderHits('I1')).toContain('I01')
  })

  it('finds I06 by a part of its name', () => {
    expect(stakeholderHits('身心')).toEqual(['I06'])
  })

  it('finds every stakeholder when the query is empty or only #', () => {
    const all = index.stakeholders.map((s) => s.id)
    expect(stakeholderHits('')).toEqual(all)
    expect(stakeholderHits('#')).toEqual(all)
  })
})

describe('solutionMatches', () => {
  it('finds every solution A and X-A by the letter alone', () => {
    expect(solutionHits('A')).toEqual(['1A', '2A', '8A', '9A', 'X-A'])
    expect(solutionHits('a')).toEqual(['1A', '2A', '8A', '9A', 'X-A'])
  })

  it('finds only X-A by X-A or xa', () => {
    expect(solutionHits('X-A')).toEqual(['X-A'])
    expect(solutionHits('xa')).toEqual(['X-A'])
    expect(solutionHits('XA')).toEqual(['X-A'])
  })

  it('finds only #2 A by 2-A, 2A or #2 A', () => {
    for (const q of ['2-A', '2A', '#2 A', '02a']) expect(solutionHits(q)).toEqual(['2A'])
  })

  it('finds only #2 A by 建議地圖', () => {
    expect(solutionHits('建議地圖')).toEqual(['2A'])
  })

  it('finds a cross-issue solution by a part of its name', () => {
    expect(solutionHits('清潔箱')).toEqual(['2A', 'X-E'])
  })

  it('does not find the solutions of #2 by the issue number alone', () => {
    expect(solutionHits('2')).toEqual([])
  })

  it('finds every solution when the query is empty or only #', () => {
    const all = solutions.map(code)
    expect(solutionHits('')).toEqual(all)
    expect(solutionHits('#')).toEqual(all)
  })
})

describe('search with a filter and a sort', () => {
  it('keeps only the items that match the search and the filter', () => {
    // The filter here: only issue #8. The search 「A」 finds every solution A.
    const query = parseListQuery('A')
    const hits = solutions
      .filter((s) => s.kind === 'issue' && s.issueNumber === 8)
      .filter((s) => solutionMatches(s, query))
    expect(hits.map(code)).toEqual(['8A'])
  })

  it('keeps the order of the sort', () => {
    // 「如何」 is in the titles of #5 and #6. The hits come in the order of
    // the list they are taken from.
    const sorted = [...issues].sort((a, b) => b.number - a.number)
    const two = parseListQuery('如何')
    expect(sorted.filter((i) => issueMatches(i, two)).map((i) => i.number)).toEqual([6, 5])
    expect(issues.filter((i) => issueMatches(i, two)).map((i) => i.number)).toEqual([5, 6])
  })

  it('returns only true or false', () => {
    const query = parseListQuery('8')
    for (const i of issues) expect(typeof issueMatches(i, query)).toBe('boolean')
  })
})

describe('spaceMatches (decision 122)', () => {
  const codes = (q: string) => index.spaceTypes.filter((s) => spaceMatches(s, parseListQuery(q))).map((s) => s.code)

  it('finds a space by its whole code, in any case, with or without 「-」', () => {
    expect(codes('sidewalk')).toEqual(['sidewalk'])
    expect(codes('Bike-Lane')).toEqual(['bike-lane'])
    expect(codes('bikelane')).toEqual(['bike-lane'])
    // A part of a code does not match: park finds park, not parking.
    expect(codes('park')).toEqual(['park'])
  })

  it('finds a space by a part of its name', () => {
    expect(codes('建築物')).toEqual(['indoor', 'building-shell'])
    expect(codes('車道')).toEqual(['bike-lane', 'scooter-lane', 'car-lane'])
  })

  it('finds every space when the query is empty', () => {
    expect(codes('  ')).toHaveLength(13)
  })
})
