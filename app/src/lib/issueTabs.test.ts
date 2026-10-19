import { describe, expect, it } from 'vitest'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile } from '@/types'
import { needsTabView, solutionsTabView } from './issueTabs'

const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile

const needIds = (list: { need: { id: string } }[]) => list.map((x) => x.need.id)

describe('needsTabView', () => {
  it('shows the 21 needs of #2 in 4 priority groups, in the order M, S, C, W', () => {
    const view = needsTabView(trashcans, null, false)
    expect(view.oldFormat).toBe(false)
    expect(view.shown).toBe(21)
    expect(view.groups.map((g) => [g.priority, g.items.length])).toEqual([
      ['M', 8],
      ['S', 10],
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

  it('with the data filter, keeps a need when one of its 以便… cells is [實證] or [AI整理]', () => {
    const view = needsTabView(trashcans, null, true)
    expect(needIds(view.groups.flatMap((g) => g.items))).toEqual(['N01', 'N04', 'N06', 'I24-US01', 'N03', 'I01-US09'])
    expect(view.shown).toBe(6)
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
  it('shows every solution of #2 in letter order, with the needs in the two parts of 6.2', () => {
    const view = solutionsTabView(trashcans, null, false)
    expect(view.map((s) => s.solution.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
    const a = view[0]
    expect(needIds(a.must)).toEqual(['N01', 'N04', 'N05', 'N07', 'O04-US02', 'O12-US01'])
    expect(needIds(a.shouldCould)).toEqual(['N02', 'O04-US04', 'I01-US09'])
    expect(a.otherNeeds).toBe(0)
    expect(a.emptyByData).toBe(false)
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
      ['B', 4],
      ['C', 4],
      ['D', 5],
      ['E', 2],
    ])
  })

  it('with the data filter, keeps only the needs with data, and marks a solution left empty', () => {
    const view = solutionsTabView(trashcans, null, true)
    const a = view[0]
    expect(needIds(a.must)).toEqual(['N01', 'N04'])
    expect(needIds(a.shouldCould)).toEqual(['I01-US09'])
    const c = view[2]
    expect(needIds(c.must)).toEqual(['N01'])
    // The filter does not hide a solution, and the other-needs count stays the
    // count of the stakeholder filter only.
    expect(view.map((s) => s.solution.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(a.otherNeeds).toBe(0)
  })

  it('marks a solution whose needs the data filter hides', () => {
    const view = solutionsTabView(trashcans, 'I06', true)
    expect(view.map((s) => [s.solution.id, s.emptyByData])).toEqual([
      ['A', true],
      ['C', true],
    ])
  })
})
