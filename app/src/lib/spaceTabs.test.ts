// The sort, filter and search of the space page tabs (design 3.6, decision 138).
import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile } from '@/types'
import { DEFAULT_LIST_STATE, mergeListSearch, type ListState } from './listParams'
import {
  groupByIssue, spaceSolutionIssues, spaceSolutionItems, spaceSolutionsView, spaceStakeholderIssues, spaceStakeholdersView,
  spaceTabParams,
} from './spaceTabs'
import type { RecentSolution } from './recent'
import { findStakeholder } from './stakeholders'

const index = indexJson as IndexFile
const issues = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]
const CODE = 'sidewalk'
const state = (part: Partial<ListState>): ListState => ({ ...DEFAULT_LIST_STATE, issues: [], spaces: [], groups: [], ...part })
/** 「2-A」 for each issue solution of the list. */
const keys = (list: RecentSolution[]) => list.map((x) => (x.kind === 'issue' ? `${x.issueNumber}-${x.solution.id}` : x.solution.code))

describe('spaceTabParams', () => {
  const numbers = spaceSolutionIssues(issues, CODE)

  it('the issues of the tab are the issues with a solution in the space', () => {
    // #9 is analyzed but does not use the sidewalk.
    expect(numbers).toEqual([1, 2, 8])
    expect(spaceStakeholderIssues(issues, CODE)).toEqual([1, 2, 8])
  })

  it('reads the params of #/solutions: q, sort, issue and who', () => {
    const p = spaceTabParams('solutions', new URLSearchParams('q=垃圾&sort=added&issue=2&who=I06'), index, numbers)
    expect(p).toMatchObject({ q: '垃圾', sort: 'added', issues: [2], who: 'I06', replace: false })
  })

  it('drops what the tab does not offer, and asks for a replace', () => {
    // #9 has no solution here, 跨議題 is not offered, and every solution
    // already uses the space.
    const p = spaceTabParams('solutions', new URLSearchParams('issue=9&issue=X&issue=1&space=sidewalk'), index, numbers)
    expect(p).toMatchObject({ issues: [1], crossChoice: false, spaces: [], replace: true })
    // The 解法 tab has no 解法涵蓋比例 sort.
    expect(spaceTabParams('solutions', new URLSearchParams('sort=solutions'), index, numbers)).toMatchObject({
      sort: 'updated',
      replace: true,
    })
  })

  it('the 利害關係人 tab reads specialonly and the share sort, but not view=tree', () => {
    const ok = spaceTabParams('stakeholders', new URLSearchParams('sort=solutions&specialonly=1'), index, numbers)
    expect(ok).toMatchObject({ sort: 'solutions', specialOnly: true, replace: false })
    const tree = spaceTabParams('stakeholders', new URLSearchParams('view=tree'), index, numbers)
    expect(tree).toMatchObject({ view: 'cards', replace: true })
  })

  it('does not look at params that are not list params', () => {
    expect(spaceTabParams('solutions', new URLSearchParams('evidence=1&sort=added'), index, numbers).replace).toBe(false)
  })
})

describe('mergeListSearch', () => {
  it('replaces the list params and keeps the others first', () => {
    const params = new URLSearchParams('evidence=1&q=old&issue=1')
    expect(mergeListSearch(params, 'solutions', state({ sort: 'added', issues: [2] }))).toBe('?evidence=1&sort=added&issue=2')
    expect(mergeListSearch(new URLSearchParams('q=x'), 'solutions', state({}))).toBe('')
  })
})

describe('spaceSolutionsView', () => {
  const items = spaceSolutionItems(issues, CODE)

  it('has every solution of the space: 14', () => {
    expect(items).toHaveLength(14)
  })

  it('sorts as #/solutions, and the groups keep the issue order', () => {
    // 最近更新: all on the same date, so the tie rule of #/solutions: the
    // highest issue number first, then the highest letter first.
    expect(keys(spaceSolutionsView(items, state({}), issues))).toEqual([
      '8-D', '8-C', '8-B', '8-A', '2-E', '2-D', '2-C', '2-B', '2-A', '1-E', '1-D', '1-C', '1-B', '1-A',
    ])
    // 最近新增: #2 A to D were added 2 days before the others, so they go last.
    expect(keys(spaceSolutionsView(items, state({ sort: 'added' }), issues))).toEqual([
      '8-D', '8-C', '8-B', '8-A', '2-E', '1-E', '1-D', '1-C', '1-B', '1-A', '2-D', '2-C', '2-B', '2-A',
    ])
    const groups = groupByIssue(spaceSolutionsView(items, state({ sort: 'added' }), issues))
    expect(groups.map((g) => g.issueNumber)).toEqual([1, 2, 8])
    expect(keys(groups[1].items)).toEqual(['2-E', '2-D', '2-C', '2-B', '2-A'])
  })

  it('資料根據比例 puts a higher share first', () => {
    const list = spaceSolutionsView(items, state({ sort: 'evidence' }), issues)
    expect(list).toHaveLength(14)
    expect(keys(list)).not.toEqual(keys(spaceSolutionsView(items, state({}), issues)))
  })

  it('filters by issue and by stakeholder, and searches', () => {
    expect(keys(spaceSolutionsView(items, state({ issues: [8] }), issues))).toEqual(['8-D', '8-C', '8-B', '8-A'])
    expect(keys(spaceSolutionsView(items, state({ q: '2a' }), issues))).toEqual(['2-A'])
    const who = spaceSolutionsView(items, state({ who: 'I06' }), issues)
    expect(who.length).toBeGreaterThan(0)
    expect(who.length).toBeLessThan(14)
    expect(spaceSolutionsView(items, state({ q: '不會有這個字' }), issues)).toEqual([])
  })
})

describe('spaceStakeholdersView', () => {
  it('with no filter: 50 stakeholders, 16 of them in several issues', () => {
    const v = spaceStakeholdersView(index, issues, CODE, state({}))
    expect(v).toMatchObject({ shown: 50, total: 50, sharedAny: true })
    expect(v.shared).toHaveLength(16)
    expect(v.byIssue.map((e) => e.issueNumber)).toEqual([1, 2, 8])
  })

  it('the 議題 filter keeps the picked groups, and the shared ones in a picked issue', () => {
    const v = spaceStakeholdersView(index, issues, CODE, state({ issues: [8] }))
    expect(v.byIssue.map((e) => e.issueNumber)).toEqual([8])
    expect(v.shown).toBe(20)
    expect(v.shared.every((s) => s.issues.includes(8))).toBe(true)
  })

  it('只看特別關注族群 keeps the stakeholders with a 特別關注 group', () => {
    const v = spaceStakeholdersView(index, issues, CODE, state({ specialOnly: true }))
    expect(v.shown).toBe(9)
    expect(v.byIssue.flatMap((e) => e.stakeholders).every((id) => findStakeholder(index.stakeholders, id).focus.length > 0)).toBe(true)
  })

  it('searches by ID', () => {
    const v = spaceStakeholdersView(index, issues, CODE, state({ q: 'i6' }))
    expect(v.shown).toBe(1)
    expect(v.shared.map((s) => s.id)).toEqual(['I06'])
  })

  it('sorts inside each block: 最近新增 gives the newest first', () => {
    const v = spaceStakeholdersView(index, issues, CODE, state({ sort: 'added' }))
    for (const entry of v.byIssue) {
      const dates = entry.stakeholders.map((id) => findStakeholder(index.stakeholders, id).added ?? '')
      expect(dates).toEqual([...dates].sort().reverse())
    }
  })
})
