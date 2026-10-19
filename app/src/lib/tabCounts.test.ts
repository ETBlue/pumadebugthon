import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile, Solution } from '@/types'
import { issueTabCounts, solutionTabCounts, stakeholderTabCounts } from './tabCounts'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const issues = [trees, trashcans, smokefree]
const sol = (issue: IssueFile, code: string) => issue.solutions.find((s) => s.id === code) as Solution

describe('issueTabCounts', () => {
  it('gives the counts of the issue tab labels (#2: 訴求 39・衝突 9, 需求 21, 解法 5)', () => {
    expect(issueTabCounts(trashcans)).toEqual({ wants: 39, conflicts: 9, needs: 21, solutions: 5 })
  })

  it('works for the other fixtures', () => {
    expect(issueTabCounts(trees)).toEqual({ wants: 48, conflicts: 8, needs: 29, solutions: 5 })
    expect(issueTabCounts(smokefree)).toEqual({ wants: 33, conflicts: 6, needs: 24, solutions: 5 })
  })
})

describe('stakeholderTabCounts', () => {
  it('sums the counts over the issues (I06: 訴求 5・衝突 4, 需求 4, 解法 4)', () => {
    // #1: W06, W08 / C1, C7 / N08 / D. #2: W08, W11 / C6 / N07, N08 / A, C.
    // #8: W07 / C3 / I06-US01 / A. Design 3.3.
    expect(stakeholderTabCounts(issues, 'I06')).toEqual({ wants: 5, conflicts: 4, needs: 4, solutions: 4 })
  })

  it('counts one issue on its own', () => {
    expect(stakeholderTabCounts([trashcans], 'I06')).toEqual({ wants: 2, conflicts: 1, needs: 2, solutions: 2 })
  })

  it('counts an N group once, however many stories of the stakeholder it has', () => {
    // I01 in #2 has 5 stories in N01, plus N04, N06 and I01-US09.
    expect(stakeholderTabCounts([trashcans], 'I01').needs).toBe(4)
  })

  it('gives zeros for an unknown stakeholder or no issues', () => {
    const zero = { wants: 0, conflicts: 0, needs: 0, solutions: 0 }
    expect(stakeholderTabCounts(issues, 'I99')).toEqual(zero)
    expect(stakeholderTabCounts([], 'I06')).toEqual(zero)
  })
})

describe('solutionTabCounts', () => {
  it('gives the covered and not covered counts (#2 A: needs 9 / 12, stakeholders 14 / 13)', () => {
    expect(solutionTabCounts(trashcans, sol(trashcans, 'A'))).toEqual({
      needs: { covered: 9, notCovered: 12 },
      stakeholders: { covered: 14, notCovered: 13 },
    })
  })

  it('adds up to all the needs and all the stakeholders of the issue', () => {
    for (const issue of issues) {
      for (const solution of issue.solutions) {
        const c = solutionTabCounts(issue, solution)
        expect(c.needs.covered + c.needs.notCovered).toBe(issue.needs.length)
        expect(c.stakeholders.covered + c.stakeholders.notCovered).toBe(issue.stakeholders.length)
      }
    }
  })
})
