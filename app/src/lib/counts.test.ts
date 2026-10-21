import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { CrossIssueFile, IndexFile, IssueFile, Need, Story } from '@/types'
import { issueCount, needCount, solutionCount, stakeholderCount, wantCount } from './counts'
import { pickList } from './opinion'

const index = indexJson as IndexFile
const issues = [treesJson, trashcansJson, smokefreeJson] as IssueFile[]

describe('issueCount', () => {
  it('counts only the analyzed issues', () => {
    // #1, #2, #8 and #9 are analyzed; #3 to #6 are 製作中.
    expect(issueCount(index)).toBe(4)
  })
})

describe('stakeholderCount', () => {
  it('counts active stakeholders and leaves out moved IDs', () => {
    // 67 rows, one of them (O02) moved to I12. #9 added O25–O31, I29–I35 and I36.
    // I34 left #9 (no issue now) but is not moved, so it is still counted.
    expect(index.stakeholders).toHaveLength(67)
    expect(stakeholderCount(index)).toBe(66)
  })
})

describe('solutionCount', () => {
  it('sums the solutions of the analyzed issues', () => {
    expect(solutionCount(index)).toBe(5 + 5 + 5 + 5)
    expect(solutionCount(index, null)).toBe(20)
  })

  it('adds the cross-issue solutions when the file exists (decision 51)', () => {
    expect(solutionCount(index, crossJson as CrossIssueFile)).toBe(20 + 5)
  })
})

describe('wantCount', () => {
  it('counts each W group once and each story with no W group, summed over the issues', () => {
    expect(wantCount(issues)).toBe(50 + 40 + 33)
  })

  it('is the same as the opinion check pick lists', () => {
    expect(wantCount(issues)).toBe(issues.reduce((n, i) => n + pickList(i).length, 0))
  })

  it('counts a group once, however many stories it has', () => {
    const story = (id: string, group: string | null): Story => ({
      id, stakeholder: id.split('-')[0], group,
      want: { text: id, tag: 'AI模擬', pending: false },
      soThat: { text: '', tag: 'AI模擬', pending: false },
      source: null, priority: 'M', priorityTag: 'AI模擬', needGroup: null,
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
  it('counts the rows of step 5.2 (issue.needs), summed over the issues', () => {
    // Each N group once, plus each story with no N group (decision 43).
    expect(needCount(issues)).toBe(31 + 22 + 24)
    expect(needCount([trashcansJson as IssueFile])).toBe(22)
  })

  it('counts an N group once, however many stories it has', () => {
    const need = (id: string, stories: string[]): Need => ({
      id, kind: id.startsWith('N') ? 'group' : 'story', summary: id, stories,
      priority: 'M', priorityTag: 'AI模擬', reason: { text: '', tag: 'AI模擬', pending: false },
    })
    const issue = {
      ...issues[0],
      needs: [need('N01', ['I01-US01', 'I02-US01', 'I03-US01']), need('I04-US01', ['I04-US01'])],
    } as IssueFile
    expect(needCount([issue])).toBe(2)
    expect(needCount([{ ...issues[0], needs: [] } as IssueFile])).toBe(0)
    expect(needCount([])).toBe(0)
  })
})
