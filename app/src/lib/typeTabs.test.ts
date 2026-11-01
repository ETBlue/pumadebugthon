// The tab helpers of a type page for the three kinds of type.
import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile } from '@/types'
import { DEFAULT_LIST_STATE, type ListState } from './listParams'
import type { RecentSolution } from './recent'
import {
  typeSolutionIssues, typeSolutionItems, typeSolutionsView, typeStakeholderIssues, typeStakeholdersView, typeTabParams,
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
