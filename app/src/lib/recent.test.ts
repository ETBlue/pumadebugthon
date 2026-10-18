import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { AvailableIssueSummary, IndexFile, IssueFile, IssueSummary, Solution, Stakeholder } from '@/types'
import { homeRedirect, recentIssues, recentSolutions, recentStakeholders } from './recent'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile

const available = index.issues.find((i) => i.available) as AvailableIssueSummary

function issue(number: number, updated: string | null, stories = 10): AvailableIssueSummary {
  return { ...available, number, updated, counts: { ...available.counts, stories, solutions: stories } }
}

function stakeholder(id: string, added: string, issues: number[] = [1]): Stakeholder {
  return { id, name: id, path: 'res', focus: [], issues, movedTo: null, added }
}

function solution(id: string, added: string, stories: string[] = []): Solution {
  return { id, name: { text: id, tag: null, pending: false }, summary: '', spaces: [], added, stories }
}

function issueFile(number: number, solutions: Solution[]): IssueFile {
  return { ...trees, number, solutions }
}

describe('recentIssues', () => {
  it('lists analyzed issues by update date, then by number, highest first', () => {
    // #1, #2 and #8 all have 2026-10-18, so the number decides.
    expect(recentIssues(index.issues).map((i) => i.number)).toEqual([8, 2, 1])
  })

  it('leaves out issues without an analysis', () => {
    expect(recentIssues(index.issues).every((i) => i.available)).toBe(true)
  })

  it('puts a newer date first, whatever the number', () => {
    const list = [issue(9, '2026-10-01'), issue(3, '2026-10-17'), issue(5, '2026-10-17')]
    expect(recentIssues(list).map((i) => i.number)).toEqual([5, 3, 9])
  })

  it('puts an issue with no date last', () => {
    const list = [issue(9, null), issue(1, '2026-01-01'), issue(4, null)]
    expect(recentIssues(list).map((i) => i.number)).toEqual([1, 9, 4])
  })

  it('is not changed by the counts', () => {
    const few = [issue(1, '2026-10-18', 1), issue(2, '2026-10-18', 100)]
    const many = [issue(1, '2026-10-18', 100), issue(2, '2026-10-18', 1)]
    expect(recentIssues(few).map((i) => i.number)).toEqual([2, 1])
    expect(recentIssues(many).map((i) => i.number)).toEqual([2, 1])
  })

  it('keeps only the first items when a limit is given', () => {
    expect(recentIssues(index.issues, 2).map((i) => i.number)).toEqual([8, 2])
  })

  it('does not change the list it gets', () => {
    const list: IssueSummary[] = [issue(1, '2026-01-01'), issue(2, '2026-02-01')]
    recentIssues(list)
    expect(list.map((i) => i.number)).toEqual([1, 2])
  })
})

describe('recentStakeholders', () => {
  it('lists active stakeholders by added date, then by ID, highest first', () => {
    // Every row has 2026-10-18, so the ID decides: I before O, high numbers first.
    const ids = recentStakeholders(index.stakeholders).map((s) => s.id)
    expect(ids.slice(0, 5)).toEqual(['I28', 'I27', 'I26', 'I25', 'I24'])
    expect(ids.indexOf('I01')).toBe(ids.indexOf('O24') - 1)
    expect(ids.at(-1)).toBe('O01')
  })

  it('leaves out moved IDs', () => {
    const ids = recentStakeholders(index.stakeholders).map((s) => s.id)
    expect(ids).not.toContain('O02')
    expect(ids).toHaveLength(51)
  })

  it('puts a newer date first, whatever the ID', () => {
    const list = [stakeholder('I09', '2026-10-01'), stakeholder('O01', '2026-10-17'), stakeholder('O03', '2026-10-17')]
    expect(recentStakeholders(list).map((s) => s.id)).toEqual(['O03', 'O01', 'I09'])
  })

  it('compares ID numbers as numbers', () => {
    const list = [stakeholder('I09', '2026-10-18'), stakeholder('I10', '2026-10-18')]
    expect(recentStakeholders(list).map((s) => s.id)).toEqual(['I10', 'I09'])
  })

  it('puts a stakeholder with no date last', () => {
    const list = [stakeholder('I09', ''), stakeholder('I01', '2026-01-01')]
    expect(recentStakeholders(list).map((s) => s.id)).toEqual(['I01', 'I09'])
  })

  it('is not changed by the number of issues', () => {
    const few = [stakeholder('I01', '2026-10-18', [1, 2, 8]), stakeholder('I02', '2026-10-18', [2])]
    const many = [stakeholder('I01', '2026-10-18', [2]), stakeholder('I02', '2026-10-18', [1, 2, 8])]
    expect(recentStakeholders(few).map((s) => s.id)).toEqual(['I02', 'I01'])
    expect(recentStakeholders(many).map((s) => s.id)).toEqual(['I02', 'I01'])
  })

  it('keeps only the first items when a limit is given', () => {
    expect(recentStakeholders(index.stakeholders, 3).map((s) => s.id)).toEqual(['I28', 'I27', 'I26'])
  })
})

describe('recentSolutions', () => {
  const key = (x: { issueNumber: number; solution: Solution }) => `${x.issueNumber}${x.solution.id}`

  it('lists solutions by added date, then issue number, then letter, highest first', () => {
    // #2 A to D were added on 2026-10-16. Every other solution has 2026-10-18.
    expect(recentSolutions([trees, trashcans, smokefree]).map(key)).toEqual([
      '8E', '8D', '8C', '8B', '8A', '2E', '1E', '1D', '1C', '1B', '1A', '2D', '2C', '2B', '2A',
    ])
  })

  it('does not depend on the order of the issue files', () => {
    expect(recentSolutions([smokefree, trees, trashcans]).map(key)).toEqual(
      recentSolutions([trees, trashcans, smokefree]).map(key),
    )
  })

  it('puts a solution with no date last', () => {
    const list = [issueFile(3, [solution('A', ''), solution('B', '2026-01-01')])]
    expect(recentSolutions(list).map(key)).toEqual(['3B', '3A'])
  })

  it('is not changed by the number of stories', () => {
    const few = [issueFile(3, [solution('A', '2026-10-18', ['a', 'b', 'c']), solution('B', '2026-10-18', [])])]
    const many = [issueFile(3, [solution('A', '2026-10-18', []), solution('B', '2026-10-18', ['a', 'b', 'c'])])]
    expect(recentSolutions(few).map(key)).toEqual(['3B', '3A'])
    expect(recentSolutions(many).map(key)).toEqual(['3B', '3A'])
  })

  it('keeps only the first items when a limit is given', () => {
    expect(recentSolutions([trees, trashcans, smokefree], 2).map(key)).toEqual(['8E', '8D'])
  })
})

describe('homeRedirect', () => {
  it('sends the old home link with the cross-issue filter to the stakeholder list', () => {
    expect(homeRedirect('?cross=1')).toBe('/stakeholders?cross=1')
  })

  it('returns null for the plain home page and other values', () => {
    expect(homeRedirect('')).toBeNull()
    expect(homeRedirect('?cross=0')).toBeNull()
    expect(homeRedirect('?other=1')).toBeNull()
  })
})
