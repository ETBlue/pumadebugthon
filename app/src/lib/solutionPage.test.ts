import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile, Solution } from '@/types'
import {
  findSolution,
  solutionConflicts,
  solutionGroupCoverage,
  solutionPath,
  solutionStakeholders,
  solutionStoryGroups,
  solutionTitle,
} from './solutionPage'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const sol = (issue: IssueFile, code: string) => issue.solutions.find((s) => s.id === code) as Solution

describe('solutionPath', () => {
  it('is under the issue, for example /issues/2/solutions/A', () => {
    expect(solutionPath(2, 'A')).toBe('/issues/2/solutions/A')
    expect(solutionPath(8, 'E')).toBe('/issues/8/solutions/E')
  })
})

describe('findSolution', () => {
  it('finds a solution by its code', () => {
    expect(findSolution(trashcans, 'A')?.id).toBe('A')
    expect(findSolution(trees, 'E')?.id).toBe('E')
  })

  it('returns null for an unknown or badly written code', () => {
    expect(findSolution(trashcans, 'Z')).toBeNull()
    expect(findSolution(trashcans, 'a')).toBeNull()
    expect(findSolution(trashcans, 'AB')).toBeNull()
    expect(findSolution(trashcans, '')).toBeNull()
    expect(findSolution(trashcans, undefined)).toBeNull()
  })
})

describe('solutionTitle', () => {
  it('is 「#2 A 名稱」 as plain text, without the tag', () => {
    expect(solutionTitle(2, sol(trashcans, 'A'))).toBe('#2 A 清潔箱佈建建議地圖')
  })
})

describe('solutionStoryGroups', () => {
  it('groups the covered stories by priority, M first', () => {
    const groups = solutionStoryGroups(trashcans, sol(trashcans, 'A'), false)
    expect(groups.map((g) => g.priority)).toEqual(['M', 'S', 'C'].filter((p) => groups.some((g) => g.priority === p)))
    expect(groups[0].priority).toBe('M')
    expect(groups[0].stories.map((s) => s.id)).toContain('I06-US01')
    expect(groups.flatMap((g) => g.stories)).toHaveLength(sol(trashcans, 'A').stories.length)
  })

  it('with the data basis filter, keeps only stories with 實證 or AI整理', () => {
    const all = solutionStoryGroups(trashcans, sol(trashcans, 'A'), false).flatMap((g) => g.stories)
    const kept = solutionStoryGroups(trashcans, sol(trashcans, 'A'), true).flatMap((g) => g.stories)
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(all.length)
    for (const s of kept) expect([s.want.tag, s.soThat.tag].some((t) => t === '實證' || t === 'AI整理')).toBe(true)
  })
})

describe('solutionGroupCoverage', () => {
  it('lists the W groups with a covered story: 全部 or 部分, in file order', () => {
    const groups = solutionGroupCoverage(trashcans, sol(trashcans, 'A'))
    expect(groups.map((g) => [g.group.id, g.full])).toEqual([
      ['W01', true],
      ['W02', true],
      ['W08', true],
      ['W10', false],
    ])
    const w10 = groups[3]
    expect(w10.covered).toEqual(['I02-US01'])
    // The member stakeholders of the whole group, in ID order.
    expect(w10.stakeholders).toEqual(['I01', 'I02'])
  })

  it('is empty for a solution that covers no W group (#2 E)', () => {
    expect(solutionGroupCoverage(trashcans, sol(trashcans, 'E'))).toEqual([])
  })
})

describe('solutionStakeholders', () => {
  it('lists the stakeholders of the covered stories once each, in ID order', () => {
    expect(solutionStakeholders(trashcans, sol(trashcans, 'E'))).toEqual(['O04', 'I01', 'I24'])
    const a = solutionStakeholders(trashcans, sol(trashcans, 'A'))
    expect(a).toEqual(['O01', 'O04', 'O10', 'O11', 'O12', 'I01', 'I02', 'I06', 'I07', 'I09', 'I10', 'I12', 'I23'])
  })
})

describe('solutionConflicts', () => {
  it('lists the conflicts with a covered story on either side, in file order', () => {
    const a = solutionConflicts(trashcans, sol(trashcans, 'A'))
    expect(a.map((c) => c.conflict.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6'])
    const c6 = a.find((c) => c.conflict.id === 'C6')!
    // Covered stories on both sides, side A first.
    expect(c6.covered).toContain('I01-US01')
    expect(c6.covered).toContain('I06-US01')
    expect(c6.covered.indexOf('I01-US01')).toBeLessThan(c6.covered.indexOf('I06-US01'))
    expect(solutionConflicts(trashcans, sol(trashcans, 'E')).map((c) => c.conflict.id)).toEqual(['C2', 'C8'])
  })

  it('works for the other issues', () => {
    for (const issue of [trees, smokefree]) {
      for (const s of issue.solutions) {
        for (const { conflict, covered } of solutionConflicts(issue, s)) {
          expect(covered.length).toBeGreaterThan(0)
          for (const id of covered) {
            expect(s.stories).toContain(id)
            expect([...conflict.sideA, ...conflict.sideB]).toContain(id)
          }
        }
      }
    }
  })
})
