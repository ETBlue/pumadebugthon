// The candidate pairs of one solution, for the 可能合併 tab (Task U6 of
// app/docs/plan-types-ui.md, decision 4, review focus 4 and 5).
import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import type { Candidate, CrossIssueFile } from '@/types'
import { candidateNeeds, solutionCandidates } from './candidates'

const cross = crossJson as CrossIssueFile
const others = (list: { issueNumber: number; code: string }[]) => list.map((c) => `${c.issueNumber}-${c.code}`)

const row = (a: string, b: string): Candidate => ({
  a, b, solutionTypes: ['intake'], domains: [], spaces: [], needs: ['X-N1'], crossSolutions: [],
})

describe('solutionCandidates', () => {
  it('finds the solution on side a and on side b (8-S1 is only on side b)', () => {
    expect(others(solutionCandidates(cross, 8, 'S1'))).toEqual(['1-S3', '1-S4', '1-S5', '2-S4'])
    expect(others(solutionCandidates(cross, 2, 'S4'))).toEqual(['1-S3', '1-S5', '8-S1'])
  })

  it('keeps the row of each pair', () => {
    const [first] = solutionCandidates(cross, 2, 'S1')
    expect(first.issueNumber).toBe(1)
    expect(first.code).toBe('S1')
    expect(first.candidate).toBe(cross.candidates[0])
  })

  it('sorts by issue number, then solution ID, as numbers (#4 S2 before #12 S1, S2 before S10)', () => {
    const data = { ...cross, candidates: [row('1-S1', '12-S1'), row('1-S1', '4-S10'), row('1-S1', '4-S2')] }
    expect(others(solutionCandidates(data, 1, 'S1'))).toEqual(['4-S2', '4-S10', '12-S1'])
  })

  it('does not sort by the number of shared things', () => {
    const many = { ...row('1-S1', '3-S1'), needs: ['X-N1', 'X-N2', 'X-N3'], spaces: ['park', 'arcade'] }
    const data = { ...cross, candidates: [many, row('1-S1', '2-S1')] }
    expect(others(solutionCandidates(data, 1, 'S1'))).toEqual(['2-S1', '3-S1'])
  })

  it('lists each other solution once, even when a row repeats with the sides swapped', () => {
    const data = { ...cross, candidates: [row('1-S1', '2-S1'), row('2-S1', '1-S1')] }
    expect(others(solutionCandidates(data, 1, 'S1'))).toEqual(['2-S1'])
  })

  it('returns [] for a solution with no pair, an X- code or a missing file', () => {
    expect(solutionCandidates(cross, 8, 'S5')).toEqual([])
    expect(solutionCandidates(cross, 1, 'S10')).toEqual([])
    expect(solutionCandidates(null, 1, 'S1')).toEqual([])
  })

  it('does not match a longer ID that starts the same (1-S1 is not 1-S10)', () => {
    const data = { ...cross, candidates: [row('1-S10', '2-S1')] }
    expect(solutionCandidates(data, 1, 'S1')).toEqual([])
  })
})

describe('candidateNeeds', () => {
  it('an X-N ID finds its group; a 1.2 row stays text, in the order of the cell', () => {
    const needs = candidateNeeds(cross, ['X-N2', '1.2 O12'])
    expect(needs).toHaveLength(2)
    expect(needs[0]).toMatchObject({ kind: 'group', id: 'X-N2' })
    expect(needs[0].kind === 'group' && needs[0].group?.id).toBe('X-N2')
    expect(needs[1]).toEqual({ kind: 'text', text: '1.2 O12' })
  })

  it('an unknown X-N ID keeps its ID with no group', () => {
    expect(candidateNeeds(cross, ['X-N99'])).toEqual([{ kind: 'group', id: 'X-N99', group: null }])
  })
})
