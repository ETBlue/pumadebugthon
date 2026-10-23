import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import crossJson from '@/test/fixtures/cross-issue.json'
import type { Cell, CrossIssueFile, IssueFile, Solution, SummaryItem } from '@/types'
import {
  findSolution,
  solutionConflicts,
  solutionGroupCoverage,
  solutionNeedCoverage,
  solutionStakeholderCoverage,
  solutionTitle,
  solutionWayOutConflicts,
  coverageByPriority,
  dataBasedCoverage,
  solutionRelatedConflicts,
  stakeholderEntries,
  practiceSides,
  solutionWantCoverage,
  concernCount,
  concernItems,
  concernItemsShown,
  planPhases,
} from './solutionPage'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const sol = (issue: IssueFile, code: string) => issue.solutions.find((s) => s.id === code) as Solution

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
  it('splits the needs of #2 into 9 covered by A and 13 not covered, in the order of step 5.2', () => {
    const { covered, notCovered } = solutionNeedCoverage(trashcans, sol(trashcans, 'A'))
    expect(ids(covered)).toEqual(['N01', 'N02', 'N04', 'N05', 'N07', 'O04-US02', 'O04-US04', 'O12-US01', 'I01-US09'])
    expect(notCovered).toHaveLength(13)
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
    expect(notCovered).toHaveLength(22)
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

describe('solutionRelatedConflicts', () => {
  it('gives the conflicts with a covered story that do not list the solution in the way out, in file order', () => {
    const list = (issue: IssueFile, code: string) =>
      solutionRelatedConflicts(issue, sol(issue, code)).map((c) => c.conflict.id)
    // #2 A has a covered story in C1–C6 and C9. C1, C2, C6 and C9 list A in the way out.
    expect(list(trashcans, 'A')).toEqual(['C3', 'C4', 'C5'])
    expect(list(smokefree, 'B')).toEqual(['C3'])
    // #1 C lists C3, C4 and C8 in the way out.
    expect(list(trees, 'C')).toEqual(['C5', 'C6'])
  })
})

const groupIds = (groups: { priority: string; items: { need: { id: string } }[] }[]) =>
  groups.map((g) => [g.priority, ids(g.items)])

describe('dataBasedCoverage', () => {
  it('keeps everything when the filter is off', () => {
    const coverage = solutionNeedCoverage(trashcans, sol(trashcans, 'A'))
    expect(dataBasedCoverage(coverage, false)).toEqual(coverage)
  })

  it('keeps the needs with a 實證 or AI整理 以便… cell when the filter is on', () => {
    const { covered, notCovered } = dataBasedCoverage(solutionNeedCoverage(trashcans, sol(trashcans, 'A')), true)
    expect(ids(covered)).toEqual(['N01', 'N04', 'I01-US09'])
    expect(ids(notCovered)).toEqual(['N03', 'N06', 'I09-US06', 'I24-US01'])
  })
})

describe('coverageByPriority', () => {
  it('groups the covered and not covered needs of #2 A by the need priority, in the order M, S, C, W', () => {
    const groups = coverageByPriority(solutionNeedCoverage(trashcans, sol(trashcans, 'A')))
    expect(groupIds(groups.covered)).toEqual([
      ['M', ['N01', 'N04', 'N05', 'N07', 'O04-US02', 'O12-US01']],
      ['S', ['N02', 'O04-US04', 'I01-US09']],
    ])
    expect(groupIds(groups.notCovered)).toEqual([
      ['M', ['N06', 'I24-US01']],
      ['S', ['N03', 'N08', 'N09', 'N10', 'O09-US02', 'I09-US06', 'I11-US01', 'I13-US02']],
      ['C', ['O08-US01', 'O08-US02']],
      ['W', ['O09-US01']],
    ])
  })

  it('keeps the extra fields (part, otherSolutions)', () => {
    const groups = coverageByPriority(solutionNeedCoverage(trashcans, sol(trashcans, 'A')))
    expect(groups.covered[0].items[0].part).toBe('must')
    expect(codes(groups.notCovered[0].items[0].otherSolutions)).toEqual(['B', 'D'])
  })
})

describe('stakeholderEntries', () => {
  it('puts the needs of each stakeholder under its issue, keeping the ID order', () => {
    const coverage = solutionStakeholderCoverage(trashcans, sol(trashcans, 'A'))
    const { covered, notCovered } = stakeholderEntries(2, coverage)
    expect(covered.map((e) => e.id)).toEqual(coverage.covered.map((s) => s.id))
    expect(notCovered.map((e) => e.id)).toEqual(coverage.notCovered.map((s) => s.id))
    const i01 = covered.find((e) => e.id === 'I01')
    expect(i01?.issues.map((i) => i.issueNumber)).toEqual([2])
    expect(ids(i01?.issues[0].covered ?? [])).toEqual(['N01', 'N04', 'I01-US09'])
    expect(ids(i01?.issues[0].notCovered ?? [])).toEqual(['N06'])
  })
})

describe('solutionWantCoverage (decision 103)', () => {
  it('a want (one story) is covered when the solution covers the need of its story', () => {
    for (const issue of [trees, trashcans, smokefree]) {
      for (const solution of issue.solutions) {
        const { covered, notCovered } = solutionWantCoverage(issue, solution)
        // 6.2 lists the same stories.
        expect(covered.map((s) => s.id).sort()).toEqual([...solution.stories].sort())
        expect(covered.length + notCovered.length).toBe(issue.stories.length)
        const keys = new Set([...solution.needs!.must, ...solution.needs!.shouldCould])
        for (const s of covered) expect(keys.has(s.needGroup ?? s.id)).toBe(true)
        for (const s of notCovered) expect(keys.has(s.needGroup ?? s.id)).toBe(false)
      }
    }
  })

  it('keeps the order of the stories in the issue file', () => {
    const { covered } = solutionWantCoverage(trashcans, sol(trashcans, 'A'))
    const order = trashcans.stories.map((s) => s.id)
    const at = covered.map((s) => order.indexOf(s.id))
    expect(at).toEqual([...at].sort((a, b) => a - b))
  })
})

describe('practiceSides (decision 104)', () => {
  it('splits into 國內 and 國外 and keeps the file order', () => {
    const { practices } = sol(trashcans, 'A')
    const sides = practiceSides(practices)
    expect(sides.domestic.every((p) => p.domestic)).toBe(true)
    expect(sides.foreign.every((p) => !p.domestic)).toBe(true)
    expect(sides.domestic.length + sides.foreign.length).toBe(practices.length)
    expect(sides.domestic).toEqual(practices.filter((p) => p.domestic))
  })

  it('every dependency row is 國內', () => {
    for (const issue of [trees, trashcans, smokefree]) {
      for (const s of issue.solutions) {
        expect(practiceSides(s.practices).foreign.some((p) => p.source === 'dependency')).toBe(false)
      }
    }
  })
})

// The 潛在風險, 可能爭議, 法規障礙 and 執行計畫 tabs (ETBlue, 2026-10-23;
// decisions 140 and 143).
describe('concernItems', () => {
  const trashcansA = (trashcansJson as IssueFile).solutions.find((s) => s.id === 'A')!
  const label = (c: ReturnType<typeof concernItems>[number]) => (c.kind === 'summary' ? c.item.item : c.key)

  it('潛在風險: only 其他顧慮與風險 and 災害風險, no 分析摘要 row (decision 143)', () => {
    expect(concernItems(trashcansA, 'risks').map(label)).toEqual(['risks', 'disasters'])
  })

  it('可能爭議: the 分析摘要 rows that name the solution, then 隱私 (decision 143)', () => {
    expect(concernItems(trashcansA, 'controversies').map(label)).toEqual(['建議清單公布時', 'privacy'])
  })

  it('法規障礙: the 分析摘要 rows that name the solution, then 相關法規', () => {
    expect(concernItems(trashcansA, 'legal').map(label)).toEqual(['道路上設置物件', 'laws'])
  })

  it('works the same for a cross-issue solution (X-A)', () => {
    const xa = (crossJson as CrossIssueFile).solutions.find((s) => s.code === 'X-A')!
    expect(concernItems(xa, 'risks').map(label)).toEqual(['risks', 'disasters'])
    expect(concernItems(xa, 'controversies').map(label)).toEqual(['合併的選址討論', 'privacy'])
    expect(concernItems(xa, 'legal').map(label)).toEqual(['合併辦理的權責', 'laws'])
  })

  it('a solution with no 分析摘要 row still has its step 7 rows (#2 C)', () => {
    const c = (trashcansJson as IssueFile).solutions.find((s) => s.id === 'C')!
    expect(c.controversies).toEqual([])
    expect(concernItems(c, 'controversies').map(label)).toEqual(['privacy'])
    expect(concernItems(c, 'risks').map(label)).toEqual(['risks', 'disasters'])
  })
})

describe('concernCount and concernItemsShown', () => {
  const cell = (tag: Cell['tag'], text = '說明'): Cell => ({ text, tag, pending: tag === null })
  const row = (item: string, tag: Cell['tag']): SummaryItem => ({ item, text: cell(tag), refs: [], solutions: ['A'] })
  const sol = {
    evaluation: {
      laws: [cell(null, '【待補：法規】')],
      privacy: [cell('AI模擬'), cell('實證')],
      risks: [cell('AI模擬')],
      disasters: [cell(null, '【待補：災害】')],
      feasibility: [cell('AI模擬')],
    },
    controversies: [row('甲', 'AI整理'), row('乙', null)],
    legal: [],
  }

  it('counts the items that are not only 【待補】', () => {
    // 甲 and 隱私 count; 乙 is 【待補】.
    expect(concernCount(concernItems(sol, 'controversies'))).toBe(2)
    // 其他顧慮與風險 counts; 災害風險 is 【待補】.
    expect(concernCount(concernItems(sol, 'risks'))).toBe(1)
    // Only 相關法規, and it is 【待補】.
    expect(concernCount(concernItems(sol, 'legal'))).toBe(0)
  })

  it('with the filter on keeps the items with a [實證] or [AI整理] part', () => {
    const items = concernItems(sol, 'controversies')
    expect(concernItemsShown(items, false)).toEqual(items)
    const shown = concernItemsShown(items, true).map((c) => (c.kind === 'summary' ? c.item.item : c.key))
    expect(shown).toEqual(['甲', 'privacy'])
    // 其他顧慮與風險 has only [AI模擬]; 災害風險 is 【待補】.
    expect(concernItemsShown(concernItems(sol, 'risks'), true)).toEqual([])
  })
})

describe('planPhases', () => {
  const one = (text: string, tag: Cell['tag'] = 'AI模擬'): Cell[] => [{ text, tag, pending: tag === null }]

  it('splits a cell with one tag at 「；」', () => {
    expect(planPhases(one('第一階段：試點；第二階段：擴大； 第三階段：檢討'))).toEqual(['第一階段：試點', '第二階段：擴大', '第三階段：檢討'])
  })

  it('gives null when the cell does not split cleanly', () => {
    expect(planPhases(one('【待補：執行步驟】', null))).toBeNull()
    expect(planPhases(one('只有一步'))).toBeNull()
    expect(planPhases(one('甲；；乙'))).toBeNull()
    expect(planPhases(one('甲；'))).toBeNull()
    // A 「；」 inside brackets.
    expect(planPhases(one('甲（乙；丙）'))).toBeNull()
    // More than one part.
    expect(planPhases([...one('甲；乙'), ...one('丙', '實證')])).toBeNull()
  })
})
