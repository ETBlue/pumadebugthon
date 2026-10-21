import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import discoveryJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile } from '@/types'
import { FOCUS_ORDER } from './issues'
import type { SideBarFilters } from './stakeholderFilter'
import { stakeholderStats } from './stakeholderStats'

const index = indexJson as IndexFile
const trashcans = trashcansJson as IssueFile
const issues = [treesJson, trashcansJson, smokefreeJson, discoveryJson] as IssueFile[]
const filters = (f: Partial<SideBarFilters> = {}): SideBarFilters => ({
  dataBasedOnly: false, crossIssueOnly: false, special: [], ...f,
})
const stats = (f: Partial<SideBarFilters> = {}, list = issues) => stakeholderStats(index.stakeholders, list, filters(f), index.pathLabels)

/** True when the numbers are already in count order (largest first). */
const inCountOrder = (numbers: number[]) => numbers.every((n, i) => i === 0 || numbers[i - 1] >= n)

describe('stakeholderStats: totals', () => {
  it('counts the stakeholders of the menu (active, in an analyzed issue) and their stories', () => {
    // 65 of the 67 rows: O02 is moved, and I34 is in no issue (it left #9 on 2026-10-21).
    expect(stats().totals).toEqual({ stakeholders: 65, organizations: 30, individuals: 35, crossIssue: 18, stories: 208 })
  })

  it('gives no cross-issue number with fewer than 2 analyzed issues', () => {
    expect(stats({}, [trashcans]).totals.crossIssue).toBeNull()
    expect(stats({}, [trashcans]).totals.stakeholders).toBe(27)
  })

  it('with 只看有資料根據, only the story counts change', () => {
    const off = stats()
    const on = stats({ dataBasedOnly: true })
    expect(on.totals).toEqual({ ...off.totals, stories: 75 })
    expect(on.byCategory.map((r) => r.stakeholders)).toEqual(off.byCategory.map((r) => r.stakeholders))
    expect(on.byCategory.map((r) => r.stories)).not.toEqual(off.byCategory.map((r) => r.stories))
    expect(on.byFocusGroup).toEqual(off.byFocusGroup)
    expect(on.byIssue).toEqual(off.byIssue)
  })

  it('follows 只看跨議題 and 特別關注, the same as the menu', () => {
    expect(stats({ crossIssueOnly: true }).totals).toMatchObject({ stakeholders: 18, organizations: 8, individuals: 10, crossIssue: 18 })
    const old = stats({ special: ['高齡'] })
    expect(old.totals).toMatchObject({ stakeholders: 2, organizations: 0, individuals: 2, crossIssue: 1 })
    // 高齡 and 只看跨議題: I05 only (I11 is only in #2).
    expect(stats({ special: ['高齡'], crossIssueOnly: true }).totals.stakeholders).toBe(1)
  })
})

describe('stakeholderStats: byCategory', () => {
  it('has one row per first level, in FIRST_LEVEL_ORDER', () => {
    expect(stats().byCategory).toEqual([
      { root: 'O', path: 'gov', label: '政府', stakeholders: 14, stories: 44 },
      { root: 'O', path: 'soe', label: '公營事業', stakeholders: 1, stories: 1 },
      { root: 'O', path: 'ind', label: '產業', stakeholders: 8, stories: 21 },
      { root: 'O', path: 'acd', label: '學術', stakeholders: 1, stories: 4 },
      { root: 'O', path: 'edu', label: '教育機構', stakeholders: 1, stories: 1 },
      { root: 'O', path: 'ngo', label: '公民團體', stakeholders: 2, stories: 6 },
      { root: 'O', path: 'cmt', label: '社群', stakeholders: 3, stories: 9 },
      { root: 'I', path: 'res', label: '居民', stakeholders: 19, stories: 63 },
      { root: 'I', path: 'mov', label: '用路人', stakeholders: 6, stories: 43 },
      { root: 'I', path: 'vis', label: '遊客', stakeholders: 2, stories: 3 },
      { root: 'I', path: 'wrk', label: '工作者', stakeholders: 8, stories: 13 },
    ])
  })

  it('is not in count order (公營事業 1 stays before 產業 8)', () => {
    const rows = stats().byCategory
    expect(inCountOrder(rows.map((r) => r.stakeholders))).toBe(false)
    expect(inCountOrder(rows.map((r) => r.stories))).toBe(false)
  })

  it('leaves out a row with 0 stakeholders', () => {
    // #2 has no 教育機構 stakeholder.
    expect(stats({}, [trashcans]).byCategory.map((r) => r.path)).toEqual(['gov', 'soe', 'ind', 'acd', 'ngo', 'cmt', 'res', 'mov', 'vis', 'wrk'])
    expect(stats({ special: ['身心障礙'] }).byCategory).toEqual([
      { root: 'I', path: 'mov', label: '用路人', stakeholders: 1, stories: expect.any(Number) },
    ])
  })

  it('with 只看有資料根據, counts only the data-based stories', () => {
    expect(stats({ dataBasedOnly: true }).byCategory.map((r) => r.stories)).toEqual([7, 0, 1, 0, 0, 2, 0, 31, 32, 0, 2])
  })
})

describe('stakeholderStats: byFocusGroup', () => {
  it('has the 6 groups in FOCUS_ORDER, each with its stakeholders in ID order', () => {
    const rows = stats().byFocusGroup
    expect(rows.map((r) => r.group)).toEqual([...FOCUS_ORDER])
    expect(rows.map((r) => r.stakeholders.map((s) => s.id))).toEqual([
      ['I05', 'I11'],
      ['I06'],
      ['I27'],
      ['I07', 'I16', 'I35'],
      ['I03', 'I04'],
      ['I11', 'I19', 'I32'],
    ])
  })

  it('is not in count order', () => {
    expect(inCountOrder(stats().byFocusGroup.map((r) => r.stakeholders.length))).toBe(false)
  })

  it('keeps a group with no stakeholder, with an empty list', () => {
    const rows = stats({ special: ['外籍'] }).byFocusGroup
    expect(rows.map((r) => r.group)).toEqual([...FOCUS_ORDER])
    expect(rows.map((r) => r.stakeholders.length)).toEqual([0, 0, 0, 0, 2, 0])
  })
})

describe('stakeholderStats: byIssue', () => {
  it('has one row per analyzed issue, in issue number order', () => {
    const reversed = [...issues].reverse()
    expect(stats({}, reversed).byIssue).toEqual([
      { issueNumber: 1, title: '把三千棵樹種回來', stakeholders: 28, organizations: 14, individuals: 14 },
      { issueNumber: 2, title: '找回消失的垃圾桶', stakeholders: 27, organizations: 12, individuals: 15 },
      { issueNumber: 8, title: '無菸城市', stakeholders: 21, organizations: 10, individuals: 11 },
      { issueNumber: 9, title: '將產品探索技巧運用到政策前期研究', stakeholders: 20, organizations: 9, individuals: 11 },
    ])
  })

  it('is not in count order when the issue order differs', () => {
    // 28, 27, 21, 20 happens to be in count order, so check a case where it is not.
    const rows = stats({ special: ['高齡'] }).byIssue
    expect(rows.map((r) => r.issueNumber)).toEqual([1, 2, 8, 9])
    expect(rows.map((r) => r.stakeholders)).toEqual([1, 2, 1, 1])
    expect(inCountOrder(rows.map((r) => r.stakeholders))).toBe(false)
  })
})
