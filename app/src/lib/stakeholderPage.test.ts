import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile } from '@/types'
import {
  movedFrom, movedStakeholderRedirect, pathTrail, stakeholderConflictViews, stakeholderIssueNumbers,
  stakeholderIssueView, stakeholderMenuIds, stakeholderSolutionsView,
} from './stakeholderPage'
import { stakeholderTabCounts } from './tabCounts'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile

const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('pathTrail', () => {
  it('gives the name of every prefix, from the first level down', () => {
    expect(pathTrail('gov-local-taipei-epb', index.pathLabels)).toEqual([
      { path: 'gov', label: '政府' },
      { path: 'gov-local', label: '地方政府' },
      { path: 'gov-local-taipei', label: '臺北市' },
      { path: 'gov-local-taipei-epb', label: '環保局' },
    ])
  })

  it('uses the last code when a prefix has no name', () => {
    expect(pathTrail('gov-xyz', index.pathLabels)).toEqual([
      { path: 'gov', label: '政府' },
      { path: 'gov-xyz', label: 'xyz' },
    ])
  })

  it('is empty for no path', () => {
    expect(pathTrail(null, index.pathLabels)).toEqual([])
  })
})

describe('movedFrom', () => {
  it('returns the old ID when it was moved to the shown ID', () => {
    expect(movedFrom(index.stakeholders, 'O02', 'I12')).toBe('O02')
  })

  it('returns null when the old ID does not lead to the shown ID', () => {
    expect(movedFrom(index.stakeholders, 'O02', 'I06')).toBeNull()
    expect(movedFrom(index.stakeholders, 'I12', 'I12')).toBeNull()
    expect(movedFrom(index.stakeholders, 'X99', 'I12')).toBeNull()
    expect(movedFrom(index.stakeholders, null, 'I12')).toBeNull()
  })
})

describe('stakeholderIssueNumbers', () => {
  it('gives the available issues of the stakeholder, by number', () => {
    const i06 = index.stakeholders.find((s) => s.id === 'I06')!
    expect(stakeholderIssueNumbers(i06, [2, 1])).toEqual([1, 2])
    expect(stakeholderIssueNumbers({ ...i06, issues: [2, 5, 1] }, [1, 2])).toEqual([1, 2])
  })
})

describe('stakeholderIssueView', () => {
  it('I06 in #2: relation, stories, counts', () => {
    const v = stakeholderIssueView(trashcans, 'I06')
    expect(v.relation?.text).toBe('清潔箱可能阻擋通行；輪椅可及性')
    expect(ids(v.stories)).toEqual(['I06-US01', 'I06-US02'])
    expect(v.counts).toEqual([{ tag: 'AI模擬', counts: [{ priority: 'M', n: 1 }, { priority: 'S', n: 1 }] }])
  })

  it('I06 in #2: W groups with the other stakeholders in ID order', () => {
    const v = stakeholderIssueView(trashcans, 'I06')
    expect(v.groups.map((g) => [g.group.id, g.others])).toEqual([
      ['W08', ['O12', 'I07']],
      ['W11', ['I05']],
    ])
  })

  it('I06 in #2: C6 with the other side', () => {
    const v = stakeholderIssueView(trashcans, 'I06')
    expect(v.conflicts.map((c) => [c.conflict.id, ids(c.otherStories)])).toEqual([['C6', ['I01-US01']]])
  })

  it('I06 in #1: C1 and C7 with the other side, in the order of the conflict', () => {
    const v = stakeholderIssueView(trees, 'I06')
    expect(v.conflicts.map((c) => [c.conflict.id, ids(c.otherStories)])).toEqual([
      ['C1', ['I18-US01', 'I05-US01', 'O14-US01']],
      ['C7', ['O14-US06']],
    ])
  })

  it('shows both sides minus its own stories when its stories are on both sides', () => {
    const issue: IssueFile = {
      ...trashcans,
      conflicts: [{ ...trashcans.conflicts[0], id: 'CX', sideA: ['I06-US01', 'I01-US01'], sideB: ['I06-US02', 'I07-US02'] }],
    }
    const v = stakeholderIssueView(issue, 'I06')
    expect(v.conflicts.map((c) => [c.conflict.id, ids(c.otherStories)])).toEqual([['CX', ['I01-US01', 'I07-US02']]])
  })

  it('leaves out a conflict where every story is its own', () => {
    const issue: IssueFile = {
      ...trashcans,
      conflicts: [{ ...trashcans.conflicts[0], id: 'CY', sideA: ['I06-US01'], sideB: ['I06-US02'] }],
    }
    expect(stakeholderIssueView(issue, 'I06').conflicts).toEqual([])
  })

  it('I06: solutions that cover its stories, and no story without a solution', () => {
    expect(ids(stakeholderIssueView(trashcans, 'I06').solutions)).toEqual(['A', 'C'])
    expect(ids(stakeholderIssueView(trees, 'I06').solutions)).toEqual(['D'])
    expect(stakeholderIssueView(trashcans, 'I06').uncovered).toEqual([])
  })

  it('lists the stories that no solution covers', () => {
    const issue: IssueFile = { ...trashcans, solutions: trashcans.solutions.filter((s) => s.id !== 'C') }
    expect(ids(stakeholderIssueView(issue, 'I06').uncovered)).toEqual(['I06-US02'])
  })

  it('I06: its input sources from 1.2', () => {
    expect(stakeholderIssueView(trashcans, 'I06').inputSources.map((s) => s.source)).toEqual([
      '現場觀察（尖峰與深夜各一次）',
      '身障團體、社區關懷據點',
    ])
  })

  it('is empty for a stakeholder that is not in the issue', () => {
    const v = stakeholderIssueView(trees, 'I12')
    expect(v).toEqual({
      relation: null, stories: [], counts: [], groups: [], conflicts: [], solutions: [], uncovered: [], inputSources: [],
    })
  })
})

describe('stakeholderMenuIds', () => {
  it('gives every active stakeholder of the available issues, in ID order', () => {
    // 64 active rows, all in an available issue (#9 added 13).
    const list = stakeholderMenuIds(index)
    expect(list).toHaveLength(64)
    expect(list).not.toContain('O02')
    expect(list.slice(0, 2)).toEqual(['O01', 'O03'])
    expect(list).toContain('I12')
    // O first, then I, each in ID order.
    const firstI = list.findIndex((id) => id.startsWith('I'))
    expect(list.slice(firstI).every((id) => id.startsWith('I'))).toBe(true)
  })

  it('leaves out a stakeholder whose issues are not available', () => {
    const only1 = { ...index, issues: index.issues.map((i) => ({ ...i, available: i.number === 1 && i.available })) }
    const list = stakeholderMenuIds(only1 as IndexFile)
    for (const id of list) expect(index.stakeholders.find((s) => s.id === id)!.issues).toContain(1)
  })
})

describe('movedStakeholderRedirect', () => {
  it('keeps the rest of the path and adds from=', () => {
    expect(movedStakeholderRedirect('/stakeholders/O02/wants', '?evidence=1', 'O02', 'I12')).toEqual({
      pathname: '/stakeholders/I12/wants',
      search: '?evidence=1&from=O02',
    })
  })

  it('falls back to the overview of the new ID when the path is not a page of the old ID', () => {
    // For example when the URL writes the ID in another way than the route param.
    expect(movedStakeholderRedirect('/stakeholders/%4F02', '', 'O02', 'I12')).toEqual({
      pathname: '/stakeholders/I12',
      search: '?from=O02',
    })
  })
})

describe('stakeholderConflictViews', () => {
  it('I06 in #2: C6 with the other side and the conflict view', () => {
    const list = stakeholderConflictViews(trashcans, 'I06')
    expect(list.map((c) => [c.view.conflict.id, ids(c.otherStories)])).toEqual([['C6', ['I01-US01']]])
    expect(ids(list[0].view.wayOutSolutions)).toEqual(['A', 'C'])
  })

  it('I06 in #1: C1 and C7, in file order', () => {
    expect(stakeholderConflictViews(trees, 'I06').map((c) => [c.view.conflict.id, ids(c.otherStories)])).toEqual([
      ['C1', ['I18-US01', 'I05-US01', 'O14-US01']],
      ['C7', ['O14-US06']],
    ])
  })

  it('has as many conflicts as the tab count, also when every story is its own', () => {
    const issue: IssueFile = {
      ...trashcans,
      conflicts: [{ ...trashcans.conflicts[0], id: 'CY', sideA: ['I06-US01'], sideB: ['I06-US02'] }],
    }
    const list = stakeholderConflictViews(issue, 'I06')
    expect(list.map((c) => [c.view.conflict.id, c.otherStories])).toEqual([['CY', []]])
    for (const i of [trees, trashcans, smokefree, policy]) {
      expect(stakeholderConflictViews(i, 'I06').length).toBe(stakeholderTabCounts([i], 'I06').conflicts)
    }
  })
})

describe('stakeholderSolutionsView', () => {
  const needIds = (list: { need: { id: string } }[]) => list.map((n) => n.need.id)

  it('I06 in #2: A covers N07, C covers N08, nothing is left uncovered', () => {
    const v = stakeholderSolutionsView(trashcans, 'I06')
    expect(v.solutions.map((s) => [s.solution.id, needIds(s.needs)])).toEqual([
      ['A', ['N07']],
      ['C', ['N08']],
    ])
    expect(v.uncovered).toEqual([])
  })

  it('has as many solutions as the tab count', () => {
    for (const i of [trees, trashcans, smokefree, policy]) {
      for (const id of ['I06', 'I01', 'O09']) {
        expect(stakeholderSolutionsView(i, id).solutions.length).toBe(stakeholderTabCounts([i], id).solutions)
      }
    }
  })

  it('O09 in #2: B covers O09-US02, and O09-US01 has no solution', () => {
    const v = stakeholderSolutionsView(trashcans, 'O09')
    expect(v.solutions.map((s) => [s.solution.id, needIds(s.needs)])).toEqual([['B', ['O09-US02']]])
    expect(needIds(v.uncovered)).toEqual(['O09-US01'])
  })

  it('with the data filter, keeps only data-based needs and drops a solution with none left', () => {
    // Both needs of I06 in #2 have only [AI模擬] 以便… cells.
    expect(stakeholderSolutionsView(trashcans, 'I06', true)).toEqual({ solutions: [], uncovered: [] })
    // O09-US01 is [AI模擬] too.
    expect(stakeholderSolutionsView(trashcans, 'O09', true).uncovered).toEqual([])
  })

  it('is empty for a stakeholder that is not in the issue', () => {
    expect(stakeholderSolutionsView(trees, 'I12')).toEqual({ solutions: [], uncovered: [] })
  })
})
