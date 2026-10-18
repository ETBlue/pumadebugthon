import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile } from '@/types'
import { movedFrom, pathTrail, stakeholderIssueNumbers, stakeholderIssueView } from './stakeholderPage'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile

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
