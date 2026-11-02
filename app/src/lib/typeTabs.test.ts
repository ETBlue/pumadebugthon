// The tab helpers of a type page for the three kinds of type.
import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile } from '@/types'
import { DEFAULT_LIST_STATE, mergeListSearch, type ListState } from './listParams'
import type { RecentSolution } from './recent'
import { findStakeholder } from './stakeholders'
import {
  groupByIssue, typeSolutionIssues, typeSolutionItems, typeSolutionsView, typeStakeholderIssues, typeStakeholdersView, typeTabParams,
} from './typeTabs'

const index = indexJson as IndexFile
const issues = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]
const state = (part: Partial<ListState>): ListState => ({ ...DEFAULT_LIST_STATE, issues: [], spaces: [], groups: [], ...part })
const keys = (list: RecentSolution[]) => list.map((x) => (x.kind === 'issue' ? `${x.issueNumber}-${x.solution.id}` : x.solution.code))

describe('typeSolutionItems and typeSolutionIssues', () => {
  it('domain health: the 5 solutions of #8', () => {
    expect(keys(typeSolutionItems('domain', issues, 'health'))).toEqual(['8-S1', '8-S2', '8-S3', '8-S4', '8-S5'])
    expect(typeSolutionIssues('domain', issues, 'health')).toEqual([8])
  })

  it('solution type digital-tool: #1 and #2', () => {
    expect(keys(typeSolutionItems('solutionType', issues, 'digital-tool'))).toEqual(['1-S1', '2-S1', '2-S2', '2-S3'])
    expect(typeSolutionIssues('solutionType', issues, 'digital-tool')).toEqual([1, 2])
  })

  it('a level 1 code gives nothing', () => {
    expect(typeSolutionItems('domain', issues, 'general-affairs')).toEqual([])
    expect(typeSolutionItems('space', issues, 'road')).toEqual([])
    expect(typeSolutionIssues('domain', issues, 'general-affairs')).toEqual([])
  })

  it('the 解法 view filters by issue', () => {
    const items = typeSolutionItems('solutionType', issues, 'open-data')
    expect(keys(typeSolutionsView(items, state({ issues: [9] }), issues))).toEqual(['9-S4'])
  })
})

describe('typeStakeholderIssues and typeStakeholdersView', () => {
  it('domain administration: only #9', () => {
    expect(typeStakeholderIssues('domain', issues, 'administration')).toEqual([9])
    const v = typeStakeholdersView('domain', index, issues, 'administration', state({}))
    expect(v.byIssue.map((e) => e.issueNumber)).toEqual([9])
    expect(v.sharedAny).toBe(false)
    expect(v.shown).toBe(v.total)
  })

  it('solution type participation: all 4 issues, some stakeholders in several', () => {
    const v = typeStakeholdersView('solutionType', index, issues, 'participation', state({}))
    expect(v.byIssue.map((e) => e.issueNumber)).toEqual([1, 2, 8, 9])
    expect(v.sharedAny).toBe(true)
  })

  it('a level 1 or unused code gives an empty view, not a crash', () => {
    const empty = { shared: [], sharedAny: false, byIssue: [], shown: 0, total: 0 }
    expect(typeStakeholdersView('domain', index, issues, 'general-affairs', state({}))).toEqual(empty)
    expect(typeStakeholdersView('domain', index, issues, 'police', state({}))).toEqual(empty)
    expect(typeStakeholdersView('solutionType', index, issues, 'subsidy', state({}))).toEqual(empty)
  })
})

describe('typeTabParams', () => {
  // It does not depend on the kind: the tabs of every type page offer the
  // same filters (議題, 利害關係人 and the search).
  it('keeps only the tab issues, and drops 跨議題 and space=', () => {
    const p = typeTabParams('solutions', new URLSearchParams('issue=9&issue=X&issue=1&space=park'), index, [1])
    expect(p).toMatchObject({ issues: [1], crossChoice: false, spaces: [], replace: true })
  })

  it('drops domain= and solutiontype= too (Task U5: only the list pages have them)', () => {
    const p = typeTabParams('solutions', new URLSearchParams('domain=environment&solutiontype=open-data'), index, [1])
    expect(p).toMatchObject({ domains: [], solutionTypes: [], replace: true })
  })
})

// Kind 'space': the sort, filter and search of the space page tabs (design
// 3.6, decision 138). These cases were in spaceTabs.test.ts and tested the
// space wrappers. Task U7 removed spaceTabs.ts, so the same cases now call
// the generic helpers.
describe("kind 'space' (moved from spaceTabs.test.ts)", () => {
  const CODE = 'sidewalk-furniture'

  describe('typeTabParams', () => {
    const numbers = typeSolutionIssues('space', issues, CODE)

    it('the issues of the tab are the issues with a solution in the space', () => {
      // #9 is analyzed but does not use sidewalk-furniture.
      expect(numbers).toEqual([1, 2, 8])
      expect(typeStakeholderIssues('space', issues, CODE)).toEqual([1, 2, 8])
    })

    it('reads the params of #/solutions: q, sort, issue and who', () => {
      const p = typeTabParams('solutions', new URLSearchParams('q=垃圾&sort=added&issue=2&who=I06'), index, numbers)
      expect(p).toMatchObject({ q: '垃圾', sort: 'added', issues: [2], who: 'I06', replace: false })
    })

    it('drops what the tab does not offer, and asks for a replace', () => {
      // #9 has no solution here, 跨議題 is not offered, and every solution
      // already uses the space.
      const p = typeTabParams('solutions', new URLSearchParams('issue=9&issue=X&issue=1&space=sidewalk-furniture'), index, numbers)
      expect(p).toMatchObject({ issues: [1], crossChoice: false, spaces: [], replace: true })
      // The 解法 tab has no 解法涵蓋比例 sort.
      expect(typeTabParams('solutions', new URLSearchParams('sort=solutions'), index, numbers)).toMatchObject({
        sort: 'updated',
        replace: true,
      })
    })

    it('the 利害關係人 tab reads specialonly and the share sort, but not view=tree', () => {
      const ok = typeTabParams('stakeholders', new URLSearchParams('sort=solutions&specialonly=1'), index, numbers)
      expect(ok).toMatchObject({ sort: 'solutions', specialOnly: true, replace: false })
      const tree = typeTabParams('stakeholders', new URLSearchParams('view=tree'), index, numbers)
      expect(tree).toMatchObject({ view: 'cards', replace: true })
    })

    it('does not look at params that are not list params', () => {
      expect(typeTabParams('solutions', new URLSearchParams('evidence=1&sort=added'), index, numbers).replace).toBe(false)
    })
  })

  describe('mergeListSearch', () => {
    it('replaces the list params and keeps the others first', () => {
      const params = new URLSearchParams('evidence=1&q=old&issue=1')
      expect(mergeListSearch(params, 'solutions', state({ sort: 'added', issues: [2] }))).toBe('?evidence=1&sort=added&issue=2')
      expect(mergeListSearch(new URLSearchParams('q=x'), 'solutions', state({}))).toBe('')
    })
  })

  describe('typeSolutionsView', () => {
    const items = typeSolutionItems('space', issues, CODE)

    it('has every solution of the space: 14', () => {
      expect(items).toHaveLength(14)
    })

    it('sorts as #/solutions, and the groups keep the issue order', () => {
      // 最近更新: all on the same date, so the tie rule of #/solutions: the
      // highest issue number first, then the highest code first.
      expect(keys(typeSolutionsView(items, state({}), issues))).toEqual([
        '8-S4', '8-S3', '8-S2', '8-S1', '2-S5', '2-S4', '2-S3', '2-S2', '2-S1', '1-S5', '1-S4', '1-S3', '1-S2', '1-S1',
      ])
      // 最近新增: #2 S1 to S4 were added 2 days before the others, so they go last.
      expect(keys(typeSolutionsView(items, state({ sort: 'added' }), issues))).toEqual([
        '8-S4', '8-S3', '8-S2', '8-S1', '2-S5', '1-S5', '1-S4', '1-S3', '1-S2', '1-S1', '2-S4', '2-S3', '2-S2', '2-S1',
      ])
      const groups = groupByIssue(typeSolutionsView(items, state({ sort: 'added' }), issues))
      expect(groups.map((g) => g.issueNumber)).toEqual([1, 2, 8])
      expect(keys(groups[1].items)).toEqual(['2-S5', '2-S4', '2-S3', '2-S2', '2-S1'])
    })

    it('資料根據比例 puts a higher share first', () => {
      const list = typeSolutionsView(items, state({ sort: 'evidence' }), issues)
      expect(list).toHaveLength(14)
      expect(keys(list)).not.toEqual(keys(typeSolutionsView(items, state({}), issues)))
    })

    it('filters by issue and by stakeholder, and searches', () => {
      expect(keys(typeSolutionsView(items, state({ issues: [8] }), issues))).toEqual(['8-S4', '8-S3', '8-S2', '8-S1'])
      expect(keys(typeSolutionsView(items, state({ q: '2s1' }), issues))).toEqual(['2-S1'])
      const who = typeSolutionsView(items, state({ who: 'I06' }), issues)
      expect(who.length).toBeGreaterThan(0)
      expect(who.length).toBeLessThan(14)
      expect(typeSolutionsView(items, state({ q: '不會有這個字' }), issues)).toEqual([])
    })
  })

  describe('typeStakeholdersView', () => {
    const view = (part: Partial<ListState>) => typeStakeholdersView('space', index, issues, CODE, state(part))

    it('with no filter: 50 stakeholders, 16 of them in several issues', () => {
      const v = view({})
      expect(v).toMatchObject({ shown: 50, total: 50, sharedAny: true })
      expect(v.shared).toHaveLength(16)
      expect(v.byIssue.map((e) => e.issueNumber)).toEqual([1, 2, 8])
    })

    it('the 議題 filter keeps the picked groups, and the shared ones in a picked issue', () => {
      const v = view({ issues: [8] })
      expect(v.byIssue.map((e) => e.issueNumber)).toEqual([8])
      expect(v.shown).toBe(20)
      expect(v.shared.every((s) => s.issues.includes(8))).toBe(true)
    })

    it('只看特別關注族群 keeps the stakeholders with a 特別關注 group', () => {
      const v = view({ specialOnly: true })
      expect(v.shown).toBe(9)
      expect(v.byIssue.flatMap((e) => e.stakeholders).every((id) => findStakeholder(index.stakeholders, id).focus.length > 0)).toBe(true)
    })

    it('searches by ID', () => {
      const v = view({ q: 'i6' })
      expect(v.shown).toBe(1)
      expect(v.shared.map((s) => s.id)).toEqual(['I06'])
    })

    it('sorts inside each block: 最近新增 gives the newest first', () => {
      const v = view({ sort: 'added' })
      for (const entry of v.byIssue) {
        const dates = entry.stakeholders.map((id) => findStakeholder(index.stakeholders, id).added ?? '')
        expect(dates).toEqual([...dates].sort().reverse())
      }
    })
  })
})
