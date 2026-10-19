import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IndexFile, IssueFile, Story } from '@/types'
import { issueCount, needCount, solutionCount, stakeholderCount, wantCount } from './counts'
import { pickList } from './opinion'

const index = indexJson as IndexFile
const issues = [treesJson, trashcansJson, smokefreeJson] as IssueFile[]

describe('issueCount', () => {
  it('counts only the analyzed issues', () => {
    // #1, #2 and #8 are analyzed; #3 to #6 are 製作中.
    expect(issueCount(index)).toBe(3)
  })
})

describe('stakeholderCount', () => {
  it('counts active stakeholders and leaves out moved IDs', () => {
    // 52 rows, one of them (O02) moved to I12.
    expect(index.stakeholders).toHaveLength(52)
    expect(stakeholderCount(index)).toBe(51)
  })
})

describe('solutionCount', () => {
  it('sums the solutions of the analyzed issues', () => {
    expect(solutionCount(index)).toBe(5 + 5 + 5)
  })
})

describe('wantCount', () => {
  it('counts each W group once and each story with no W group, summed over the issues', () => {
    expect(wantCount(issues)).toBe(48 + 39 + 32)
  })

  it('is the same as the opinion check pick lists', () => {
    expect(wantCount(issues)).toBe(issues.reduce((n, i) => n + pickList(i).length, 0))
  })

  it('counts a group once, however many stories it has', () => {
    const story = (id: string, group: string | null): Story => ({
      id, stakeholder: id.split('-')[0], group,
      want: { text: id, tag: 'AI模擬', pending: false },
      soThat: { text: '', tag: 'AI模擬', pending: false },
      source: null, priority: 'M', priorityTag: 'AI模擬',
    })
    const issue = {
      ...issues[0],
      stories: [story('I01-US01', 'W01'), story('I02-US01', 'W01'), story('I03-US01', null)],
      groups: [{ id: 'W01', summary: 'w', tag: 'AI模擬', stories: ['I01-US01', 'I02-US01'] }],
    } as IssueFile
    expect(wantCount([issue])).toBe(2)
    expect(wantCount([])).toBe(0)
  })
})


describe('needCount', () => {
  it('counts one 需求 per story with a 以便… cell, summed over the issues', () => {
    expect(needCount(issues)).toBe(66 + 52 + 45)
  })

  it('counts a 【待補】 cell, but not an empty one', () => {
    const story = (id: string, text: string, pending = false): Story => ({
      id, stakeholder: id.split('-')[0], group: 'W01',
      want: { text: id, tag: 'AI模擬', pending: false },
      soThat: { text, tag: pending ? null : 'AI模擬', pending },
      source: null, priority: 'M', priorityTag: 'AI模擬',
    })
    const issue = {
      ...issues[0],
      stories: [story('I01-US01', 'a'), story('I02-US01', 'a'), story('I03-US01', '【待補】', true), story('I04-US01', ' ')],
    } as IssueFile
    // Two stories with the same text are still two 需求: 以便… cells have no groups.
    expect(needCount([issue])).toBe(3)
    expect(needCount([])).toBe(0)
  })
})
