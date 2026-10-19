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
  solutionNeedCoverage,
  solutionStakeholderCoverage,
  solutionTitle,
  solutionWayOutConflicts,
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
      ['W05', true],
      ['W08', true],
      ['W09', false],
      ['W10', true],
    ])
    // A covers N01, which has I08-US01 but not I01-US02 (that one is in N06).
    const w09 = groups[4]
    expect(w09.covered).toEqual(['I08-US01'])
    // The member stakeholders of the whole group, in ID order.
    expect(w09.stakeholders).toEqual(['I01', 'I08'])
  })

  it('is empty for a solution that covers no W group (#8 E)', () => {
    expect(solutionGroupCoverage(smokefree, sol(smokefree, 'E'))).toEqual([])
  })
})

describe('solutionStakeholders', () => {
  it('lists the stakeholders of the covered stories once each, in ID order', () => {
    // E covers N01 (I01, I02, I07, I08, I10), O04-US02 and I24-US01 (6.2 of #2).
    expect(solutionStakeholders(trashcans, sol(trashcans, 'E'))).toEqual(['O04', 'I01', 'I02', 'I07', 'I08', 'I10', 'I24'])
    const a = solutionStakeholders(trashcans, sol(trashcans, 'A'))
    expect(a).toEqual(['O01', 'O04', 'O05', 'O10', 'O11', 'O12', 'I01', 'I02', 'I06', 'I07', 'I08', 'I09', 'I10', 'I12'])
  })
})

describe('solutionConflicts', () => {
  it('lists the conflicts with a covered story on either side, in file order', () => {
    const a = solutionConflicts(trashcans, sol(trashcans, 'A'))
    expect(a.map((c) => c.conflict.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C9'])
    const c6 = a.find((c) => c.conflict.id === 'C6')!
    // Covered stories on both sides, side A first.
    expect(c6.covered).toContain('I01-US01')
    expect(c6.covered).toContain('I06-US01')
    expect(c6.covered.indexOf('I01-US01')).toBeLessThan(c6.covered.indexOf('I06-US01'))
    expect(solutionConflicts(trashcans, sol(trashcans, 'E')).map((c) => c.conflict.id)).toEqual(['C1', 'C2', 'C3', 'C6', 'C8', 'C9'])
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

const ids = (list: { need: { id: string } }[]) => list.map((x) => x.need.id)
const codes = (list: { id: string }[]) => list.map((x) => x.id)

describe('solutionNeedCoverage', () => {
  it('splits the needs of #2 into 9 covered by A and 12 not covered, in the order of step 5.2', () => {
    const { covered, notCovered } = solutionNeedCoverage(trashcans, sol(trashcans, 'A'))
    expect(ids(covered)).toEqual(['N01', 'N02', 'N04', 'N05', 'N07', 'O04-US02', 'O04-US04', 'O12-US01', 'I01-US09'])
    expect(notCovered).toHaveLength(12)
    expect(ids(notCovered)).toEqual(trashcans.needs.map((n) => n.id).filter((id) => !ids(covered).includes(id)))
  })

  it('gives each covered need the part of step 6.2 that lists it', () => {
    const { covered } = solutionNeedCoverage(trashcans, sol(trashcans, 'A'))
    expect(covered.find((c) => c.need.id === 'N01')?.part).toBe('must')
    expect(covered.find((c) => c.need.id === 'N02')?.part).toBe('shouldCould')
  })

  it('gives each not covered need the other solutions that cover it, in letter order', () => {
    const { notCovered } = solutionNeedCoverage(trashcans, sol(trashcans, 'A'))
    const others = (id: string) => codes(notCovered.find((n) => n.need.id === id)?.otherSolutions ?? [])
    expect(others('N06')).toEqual(['B', 'D'])
    expect(others('I24-US01')).toEqual(['E'])
    // O09-US01 is 這次不做 and no solution covers it. It is still in the list.
    expect(others('O09-US01')).toEqual([])
    expect(notCovered.find((n) => n.need.id === 'O09-US01')?.need.priority).toBe('W')
  })

  it('has no covered needs in the old format (needs is null)', () => {
    const old = { ...sol(trashcans, 'A'), needs: null }
    const { covered, notCovered } = solutionNeedCoverage(trashcans, old)
    expect(covered).toEqual([])
    expect(notCovered).toHaveLength(21)
  })
})

describe('solutionStakeholderCoverage', () => {
  it('splits the stakeholders of #2 into 14 covered by A and 13 not covered, in ID order', () => {
    const { covered, notCovered } = solutionStakeholderCoverage(trashcans, sol(trashcans, 'A'))
    expect(covered.map((s) => s.id)).toEqual([
      'O01', 'O04', 'O05', 'O10', 'O11', 'O12', 'I01', 'I02', 'I06', 'I07', 'I08', 'I09', 'I10', 'I12',
    ])
    expect(notCovered.map((s) => s.id)).toEqual([
      'O03', 'O06', 'O07', 'O08', 'O09', 'O13', 'I03', 'I04', 'I05', 'I11', 'I13', 'I23', 'I24',
    ])
  })

  it('gives each stakeholder its covered and not covered needs, each need once', () => {
    const { covered } = solutionStakeholderCoverage(trashcans, sol(trashcans, 'A'))
    const i01 = covered.find((s) => s.id === 'I01')
    // I01 has 5 stories in N01, but N01 shows once.
    expect(ids(i01?.covered ?? [])).toEqual(['N01', 'N04', 'I01-US09'])
    expect(ids(i01?.notCovered ?? [])).toEqual(['N06'])
    expect(codes(i01?.notCovered[0].otherSolutions ?? [])).toEqual(['B', 'D'])
  })

  it('gives a not covered stakeholder only not covered needs', () => {
    const { notCovered } = solutionStakeholderCoverage(trashcans, sol(trashcans, 'A'))
    const o09 = notCovered.find((s) => s.id === 'O09')
    expect(o09?.covered).toEqual([])
    expect(ids(o09?.notCovered ?? [])).toContain('O09-US01')
  })
})

describe('solutionWayOutConflicts', () => {
  it('gives the conflicts whose way out lists the solution, in file order', () => {
    const list = (code: string) => solutionWayOutConflicts(trashcans, sol(trashcans, code)).map((v) => v.conflict.id)
    expect(list('A')).toEqual(['C1', 'C2', 'C6', 'C7', 'C9'])
    expect(list('E')).toEqual(['C2', 'C8'])
  })

  it('gives each conflict its needs and way out', () => {
    const [c1] = solutionWayOutConflicts(trashcans, sol(trashcans, 'A'))
    expect(codes(c1.needsA)).toEqual(['N01'])
    expect(codes(c1.needsB)).toEqual(['N06'])
    expect(c1.hasWayOut).toBe(true)
  })

  it('is empty for a solution in no way out', () => {
    const none = { ...sol(trashcans, 'A'), id: 'Z' }
    expect(solutionWayOutConflicts(trashcans, none)).toEqual([])
  })
})
