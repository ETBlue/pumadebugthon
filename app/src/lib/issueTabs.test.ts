import { describe, expect, it } from 'vitest'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import discoveryJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IssueFile } from '@/types'
import { needsTabView, solutionsTabView } from './issueTabs'
import { dataBasedNeeds, issueNeeds } from './needs'
import { solutionNeedCoverage } from './solutionPage'

const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const allIssues = [treesJson as IssueFile, trashcans, smokefree, discoveryJson as IssueFile]

const needIds = (list: { need: { id: string } }[]) => list.map((x) => x.need.id)

describe('needsTabView', () => {
  it('shows the 22 needs of #2 in 4 priority groups, in the order M, S, C, W', () => {
    const view = needsTabView(trashcans, null, false)
    expect(view.oldFormat).toBe(false)
    expect(view.shown).toBe(22)
    expect(view.groups.map((g) => [g.priority, g.items.length])).toEqual([
      ['M', 8],
      ['S', 11],
      ['C', 2],
      ['W', 1],
    ])
  })

  it('keeps the file order of step 5.2 inside a group', () => {
    const m = needsTabView(trashcans, null, false).groups[0]
    expect(needIds(m.items)).toEqual(['N01', 'N04', 'N05', 'N06', 'N07', 'O04-US02', 'O12-US01', 'I24-US01'])
  })

  it('with a stakeholder, shows only its needs, each once (I01 has 5 stories in N01)', () => {
    const view = needsTabView(trashcans, 'I01', false)
    const all = view.groups.flatMap((g) => g.items)
    expect(needIds(all)).toEqual(['N01', 'N04', 'N06', 'I01-US09'])
    expect(all.filter((i) => i.need.id === 'N01')).toHaveLength(1)
    expect(view.shown).toBe(4)
  })

  it('with a stakeholder, a need lists only the conflicts the 訴求 tab shows (#2, I02, N01)', () => {
    // N01 is in C1, C2, C3, C6 and C9. No story of I02 is on a side of
    // these conflicts, so the 訴求 tab with ?stakeholder=I02 hides them, and
    // the links 「出現在衝突」 would point to nothing.
    const all = needsTabView(trashcans, null, false).groups.flatMap((g) => g.items)
    expect(all.find((i) => i.need.id === 'N01')!.conflicts.map((c) => c.id)).toEqual(['C1', 'C2', 'C3', 'C6', 'C9'])
    const view = needsTabView(trashcans, 'I02', false)
    const n01 = view.groups.flatMap((g) => g.items).find((i) => i.need.id === 'N01')!
    expect(n01.conflicts).toEqual([])
    // A conflict with a story of the stakeholder stays: I06 is on a side of C6.
    const i06 = needsTabView(trashcans, 'I06', false).groups.flatMap((g) => g.items)
    for (const item of i06) {
      const full = all.find((i) => i.need.id === item.need.id)!
      expect(item.conflicts.map((c) => c.id)).toEqual(full.conflicts.map((c) => c.id).filter((id) => id === 'C6'))
    }
    expect(i06.some((i) => i.conflicts.length > 0)).toBe(true)
  })

  it('with the data filter, keeps a need when one of its 以便… cells is [實證] or [AI整理]', () => {
    const view = needsTabView(trashcans, null, true)
    expect(needIds(view.groups.flatMap((g) => g.items))).toEqual(['N01', 'N04', 'N06', 'I24-US01', 'N03', 'I01-US09', 'I09-US06'])
    expect(view.shown).toBe(7)
  })

  it('uses both filters together', () => {
    const view = needsTabView(trashcans, 'I06', true)
    expect(view.shown).toBe(0)
    expect(view.groups).toEqual([])
  })

  it('has the need of a story with no N group (#8 I06-US01)', () => {
    const view = needsTabView(smokefree, 'I06', false)
    expect(needIds(view.groups.flatMap((g) => g.items))).toContain('I06-US01')
  })

  it('marks an issue in the old format (decision 52)', () => {
    const old: IssueFile = { ...trashcans, format: 'stories', needs: [], needGroups: [] }
    const view = needsTabView(old, null, false)
    expect(view.oldFormat).toBe(true)
    expect(view.groups).toEqual([])
    expect(view.shown).toBe(0)
  })
})

describe('solutionsTabView', () => {
  it('with a stakeholder, lists only the 解開的衝突 that the 訴求 tab shows (#2, I06 and I02)', () => {
    // Solution A is the way out of C1, C2, C6, C7 and C9. Only C6 has a
    // story of I06, so with ?stakeholder=I06 only C6 is on the 訴求 tab.
    const all = solutionsTabView(trashcans, null, false).find((s) => s.solution.id === 'A')!
    expect(all.wayOutConflicts.map((c) => c.id)).toEqual(['C1', 'C2', 'C6', 'C7', 'C9'])
    const i06 = solutionsTabView(trashcans, 'I06', false).find((s) => s.solution.id === 'A')!
    expect(i06.wayOutConflicts.map((c) => c.id)).toEqual(['C6'])
    // No conflict of #2 has a story of I02.
    for (const item of solutionsTabView(trashcans, 'I02', false)) expect(item.wayOutConflicts).toEqual([])
  })

  it('shows every solution of #2 in letter order, with the needs in the two parts of 6.2', () => {
    const view = solutionsTabView(trashcans, null, false)
    expect(view.map((s) => s.solution.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
    const a = view[0]
    expect(needIds(a.must)).toEqual(['N01', 'N04', 'N05', 'N07', 'O04-US02', 'O12-US01'])
    expect(needIds(a.shouldCould)).toEqual(['N02', 'O04-US04', 'I01-US09'])
    expect(a.otherNeeds).toBe(0)
  })

  it('lists the conflicts that the solution solves, in file order', () => {
    const a = solutionsTabView(trashcans, null, false)[0]
    expect(a.wayOutConflicts.map((c) => c.id)).toEqual(['C1', 'C2', 'C6', 'C7', 'C9'])
    const e = solutionsTabView(trashcans, null, false)[4]
    expect(e.wayOutConflicts.map((c) => c.id)).toEqual(['C2', 'C8'])
  })

  it('with a stakeholder, shows only the solutions with one of its needs, and only its needs', () => {
    const view = solutionsTabView(trashcans, 'I06', false)
    expect(view.map((s) => s.solution.id)).toEqual(['A', 'C'])
    expect(needIds(view[0].must)).toEqual(['N07'])
    expect(needIds(view[0].shouldCould)).toEqual([])
    expect(needIds(view[1].shouldCould)).toEqual(['N08'])
  })

  it('counts the other needs the solution covers (「這個解法還涵蓋其他 6 個需求」)', () => {
    const view = solutionsTabView(trashcans, 'I01', false)
    expect(view.map((s) => [s.solution.id, s.otherNeeds])).toEqual([
      ['A', 6],
      ['B', 5],
      ['C', 4],
      ['D', 5],
      ['E', 2],
    ])
  })

  it('with the data filter, keeps only the needs with data', () => {
    const view = solutionsTabView(trashcans, null, true)
    const a = view[0]
    expect(needIds(a.must)).toEqual(['N01', 'N04'])
    expect(needIds(a.shouldCould)).toEqual(['I01-US09'])
    const c = view[2]
    expect(needIds(c.must)).toEqual(['N01'])
    // In #2 every solution keeps a need with data, and the other-needs count
    // stays the count of the stakeholder filter only.
    expect(view.map((s) => s.solution.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(a.otherNeeds).toBe(0)
  })

  // Decision 74: with a stakeholder picked, a solution is listed only when
  // at least one of the stakeholder's needs in it is still shown.
  it('with a stakeholder and the data filter, leaves out a solution whose needs of the stakeholder are all hidden (#2, I06)', () => {
    // Without the filter, A (N07) and C (N08) cover a need of I06.
    expect(solutionsTabView(trashcans, 'I06', false).map((s) => s.solution.id)).toEqual(['A', 'C'])
    // N07 and N08 have no data basis, so both solutions leave the list.
    expect(solutionsTabView(trashcans, 'I06', true)).toEqual([])
  })

  it('with a stakeholder and the data filter, keeps a solution with one shown need of the stakeholder', () => {
    const view = solutionsTabView(trashcans, 'I01', true)
    expect(view.length).toBeGreaterThan(0)
    for (const item of view) {
      expect(item.must.length + item.shouldCould.length, item.solution.id).toBeGreaterThan(0)
    }
  })

  // Option B (decision 77): with no stakeholder picked, the data filter hides
  // a solution when it hides every need the solution covers.
  it('without a stakeholder, the data filter hides a solution whose needs are all hidden', () => {
    for (const issue of allIssues) {
      const want = [...issue.solutions]
        .filter((sol) => {
          const covered = solutionNeedCoverage(issue, sol).covered
          return covered.length === 0 || dataBasedNeeds(covered).length > 0
        })
        .map((sol) => sol.id)
        .sort()
      expect(solutionsTabView(issue, null, true).map((s) => s.solution.id), `#${issue.number}`).toEqual(want)
    }
  })

  it('the data filter hides at least one solution in the fixtures (so the test above checks something)', () => {
    const hidden = allIssues.some((issue) => solutionsTabView(issue, null, true).length < solutionsTabView(issue, null, false).length)
    expect(hidden).toBe(true)
  })
})

// Decision 75: the 特別關注 chips filter the 需求 and 解法 tabs too.
describe('the 需求 and 解法 tabs with 特別關注 (special)', () => {
  const special = new Set(['I05', 'I06', 'I11']) // 高齡 and 身心障礙 in #2
  const has = (ids: string[]) => ids.some((id) => special.has(id))

  it('需求: shows only the needs with a story of a stakeholder in the groups', () => {
    const view = needsTabView(trashcans, null, false, special)
    const want = issueNeeds(trashcans).filter((n) => has(n.stakeholders)).map((n) => n.need.id)
    expect(view.shown).toBe(want.length)
    expect(view.shown).toBeGreaterThan(0)
    expect(view.shown).toBeLessThan(21)
    expect(view.groups.flatMap((g) => needIds(g.items)).sort()).toEqual([...want].sort())
  })

  it('需求: works with the data filter and with a picked stakeholder on top', () => {
    const data = needsTabView(trashcans, null, true, special)
    expect(data.shown).toBe(dataBasedNeeds(issueNeeds(trashcans).filter((n) => has(n.stakeholders))).length)
    expect(needsTabView(trashcans, 'I06', false, special).shown).toBe(needsTabView(trashcans, 'I06', false).shown)
  })

  it('解法: shows only the solutions that cover such a need, with only those needs', () => {
    const view = solutionsTabView(trashcans, null, false, special)
    const want = [...trashcans.solutions]
      .filter((sol) => solutionNeedCoverage(trashcans, sol).covered.some((n) => has(n.stakeholders)))
      .map((sol) => sol.id)
      .sort()
    expect(view.map((s) => s.solution.id)).toEqual(want)
    for (const item of view) {
      const shown = [...item.must, ...item.shouldCould]
      expect(shown.length).toBeGreaterThan(0)
      for (const n of shown) expect(has(n.stakeholders)).toBe(true)
      expect(item.otherNeeds).toBe(solutionNeedCoverage(trashcans, item.solution).covered.length - shown.length)
    }
  })

  it('解法: with the data filter, a solution whose matching needs are all hidden is left out', () => {
    for (const item of solutionsTabView(trashcans, null, true, special)) {
      expect(item.must.length + item.shouldCould.length).toBeGreaterThan(0)
    }
  })

  it('an empty set shows nothing, null is no filter', () => {
    expect(needsTabView(trashcans, null, false, new Set()).shown).toBe(0)
    expect(solutionsTabView(trashcans, null, false, new Set())).toEqual([])
    expect(solutionsTabView(trashcans, null, true, null)).toEqual(solutionsTabView(trashcans, null, true))
  })
})

describe('needsTabView with 優先順序 and 只看有衝突的需求 (decision 127)', () => {
  const all = needsTabView(trashcans, null, false)
  const allItems = all.groups.flatMap((g) => g.items)

  it('priorities keeps only the picked groups, in the fixed order', () => {
    const view = needsTabView(trashcans, null, false, null, { priorities: ['W', 'M'] })
    expect(view.groups.map((g) => [g.priority, g.items.length])).toEqual([['M', 8], ['W', 1]])
    expect(view.shown).toBe(9)
    expect(needsTabView(trashcans, null, false, null, { priorities: [] })).toEqual(all)
  })

  it('conflictOnly keeps only the needs that list a conflict', () => {
    const view = needsTabView(trashcans, null, false, null, { conflictOnly: true })
    const items = view.groups.flatMap((g) => g.items)
    expect(needIds(items)).toEqual(needIds(allItems.filter((i) => i.conflicts.length > 0)))
    expect(view.shown).toBe(15)
    expect(items.every((i) => i.conflicts.length > 0)).toBe(true)
  })

  it('conflictOnly uses the conflicts after the stakeholder filter', () => {
    const own = needsTabView(trashcans, 'I01', false).groups.flatMap((g) => g.items)
    const view = needsTabView(trashcans, 'I01', false, null, { conflictOnly: true, priorities: ['M', 'S'] })
    const items = view.groups.flatMap((g) => g.items)
    expect(needIds(items)).toEqual(needIds(own.filter((i) => i.conflicts.length > 0 && i.need.priority !== 'C' && i.need.priority !== 'W')))
  })
})
