import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile } from '@/types'
import { issuesBySpace, sameSpaceIssues, solutionsBySpace } from './spaces'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile

const pairs = (list: { issueNumber: number; solution: { id: string } }[]) =>
  list.map((x) => `#${x.issueNumber} ${x.solution.id}`)

describe('issuesBySpace', () => {
  it('sidewalk: issues 1 and 2', () => {
    expect(issuesBySpace(index, 'sidewalk').map((i) => i.number)).toEqual([1, 2])
  })

  it('arcade: only issue 2; an unused or unknown code: none', () => {
    expect(issuesBySpace(index, 'arcade').map((i) => i.number)).toEqual([2])
    expect(issuesBySpace(index, 'parking')).toEqual([])
    expect(issuesBySpace(index, 'nope')).toEqual([])
  })
})

describe('solutionsBySpace', () => {
  it('sidewalk: every solution of both issues, by issue number then solution ID', () => {
    const list = solutionsBySpace([trashcans, trees], 'sidewalk')
    expect(pairs(list)).toEqual(['#1 A', '#1 B', '#1 C', '#1 D', '#1 E', '#2 A', '#2 B', '#2 C', '#2 D'])
    expect(list.find((x) => x.issueNumber === 2 && x.solution.id === 'A')?.solution.summary).toBe(
      trashcans.solutions[0].summary,
    )
  })

  it('arcade: #2 C and D; utility: #1 A and D', () => {
    expect(pairs(solutionsBySpace([trees, trashcans], 'arcade'))).toEqual(['#2 C', '#2 D'])
    expect(pairs(solutionsBySpace([trees, trashcans], 'utility'))).toEqual(['#1 A', '#1 D'])
  })
})

describe('sameSpaceIssues', () => {
  it('#2 shares sidewalk and park with #1, in the order of the #2 space list', () => {
    expect(sameSpaceIssues(index, 2)).toEqual([
      { code: 'sidewalk', issues: [1] },
      { code: 'park', issues: [1] },
    ])
  })

  it('#1 shares sidewalk and park with #2', () => {
    expect(sameSpaceIssues(index, 1)).toEqual([
      { code: 'sidewalk', issues: [2] },
      { code: 'park', issues: [2] },
    ])
  })

  it('is empty when no other issue uses the same space, or for an unknown issue', () => {
    const only2: IndexFile = { ...index, issues: index.issues.filter((i) => i.number !== 1) }
    expect(sameSpaceIssues(only2, 2)).toEqual([])
    expect(sameSpaceIssues(index, 3)).toEqual([])
    expect(sameSpaceIssues(index, 99)).toEqual([])
  })
})
