import { describe, expect, it } from 'vitest'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IssueFile, Story } from '@/types'
import { priorityCounts, priorityLabel } from './priority'

const trashcans = trashcansJson as IssueFile

function story(id: string, priority: Story['priority'], priorityTag: Story['priorityTag']): Story {
  const cell = { text: id, tag: 'AI模擬' as const, pending: false }
  return { id, stakeholder: id.slice(0, 3), want: cell, group: null, soThat: cell, source: null, priority, priorityTag }
}

describe('priorityLabel', () => {
  it('gives the zh-TW label for each letter', () => {
    expect(priorityLabel('M')).toBe('必須有')
    expect(priorityLabel('S')).toBe('應該有')
    expect(priorityLabel('C')).toBe('可以有')
    expect(priorityLabel('W')).toBe('這次不做')
  })
})

describe('priorityCounts', () => {
  it('returns [] for no stories', () => {
    expect(priorityCounts([])).toEqual([])
  })

  it('counts in the order M, S, C, W and leaves out zero values', () => {
    const stories = [story('I01-US01', 'C', 'AI模擬'), story('I01-US02', 'M', 'AI模擬'), story('I01-US03', 'C', 'AI模擬')]
    expect(priorityCounts(stories)).toEqual([
      { tag: 'AI模擬', counts: [{ priority: 'M', n: 1 }, { priority: 'C', n: 2 }] },
    ])
  })

  it('has one entry per tag, 實證 first, even when AI模擬 comes first in the input', () => {
    const stories = [story('I01-US01', 'W', 'AI模擬'), story('I01-US02', 'S', '實證'), story('I01-US03', 'S', 'AI模擬')]
    expect(priorityCounts(stories)).toEqual([
      { tag: '實證', counts: [{ priority: 'S', n: 1 }] },
      { tag: 'AI模擬', counts: [{ priority: 'S', n: 1 }, { priority: 'W', n: 1 }] },
    ])
  })

  it('orders the tags 實證, AI整理, AI模擬', () => {
    const stories = [story('I01-US01', 'M', 'AI模擬'), story('I01-US02', 'C', 'AI整理'), story('I01-US03', 'S', '實證')]
    expect(priorityCounts(stories).map((c) => c.tag)).toEqual(['實證', 'AI整理', 'AI模擬'])
    expect(priorityCounts(stories)[1]).toEqual({ tag: 'AI整理', counts: [{ priority: 'C', n: 1 }] })
  })

  it('counts the I01 stories of #2 (M 4, S 4, all AI模擬)', () => {
    const i01 = trashcans.stories.filter((s) => s.stakeholder === 'I01')
    expect(i01).toHaveLength(8)
    expect(priorityCounts(i01)).toEqual([
      { tag: 'AI模擬', counts: [{ priority: 'M', n: 4 }, { priority: 'S', n: 4 }] },
    ])
  })
})
