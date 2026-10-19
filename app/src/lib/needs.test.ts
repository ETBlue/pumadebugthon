import { describe, expect, it } from 'vitest'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile, Story } from '@/types'
import {
  dataBasedNeeds,
  issueNeeds,
  needKey,
  needsByPriority,
  needsForStakeholder,
  needsOfStakeholder,
  needSummaryOf,
  shownNeedStories,
} from './needs'

const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile

const story = (issue: IssueFile, id: string): Story => {
  const s = issue.stories.find((x) => x.id === id)
  if (!s) throw new Error(`no story ${id}`)
  return s
}

const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('needKey', () => {
  it('is the N group of a story in a group', () => {
    expect(needKey(story(trashcans, 'I01-US01'))).toBe('N01')
  })

  it('is the story ID of a story in no group', () => {
    expect(needKey(story(trashcans, 'O09-US01'))).toBe('O09-US01')
  })
})

describe('issueNeeds', () => {
  const items = issueNeeds(trashcans)
  const n01 = items.find((i) => i.need.id === 'N01')!

  it('has one item per row of 5.2, in file order', () => {
    expect(items.map((i) => i.need.id)).toEqual(ids(trashcans.needs))
    expect(items).toHaveLength(21)
  })

  it('gives N01 its 9 stories and its stakeholders in ID order', () => {
    expect(n01.stories).toHaveLength(9)
    expect(n01.stakeholders).toEqual(['I01', 'I02', 'I07', 'I08', 'I10'])
  })

  it('uses the group summary and tag for an N group', () => {
    const group = trashcans.needGroups.find((g) => g.id === 'N01')!
    expect(n01.summary).toEqual({ text: group.summary, tag: group.tag, pending: false })
  })

  it('uses the 以便… cell of the story for a need with no group', () => {
    const item = items.find((i) => i.need.id === 'O09-US01')!
    expect(item.summary).toEqual(story(trashcans, 'O09-US01').soThat)
  })

  it('lists the covering solutions in letter order, with the part of 6.2', () => {
    expect(n01.solutions.map((s) => [s.solution.id, s.part])).toEqual([
      ['A', 'must'],
      ['B', 'must'],
      ['C', 'must'],
      ['E', 'must'],
    ])
    const n02 = items.find((i) => i.need.id === 'N02')!
    expect(n02.solutions.map((s) => [s.solution.id, s.part])).toEqual([
      ['A', 'shouldCould'],
      ['D', 'shouldCould'],
    ])
  })

  it('gives a 這次不做 need no solution', () => {
    const item = items.find((i) => i.need.id === 'O09-US01')!
    expect(item.need.priority).toBe('W')
    expect(item.solutions).toEqual([])
  })

  it('lists the conflicts with the need on either side, in file order', () => {
    expect(ids(n01.conflicts)).toEqual(['C1', 'C2', 'C3', 'C6', 'C9'])
    const n06 = items.find((i) => i.need.id === 'N06')!
    expect(ids(n06.conflicts)).toEqual(['C1', 'C5', 'C7', 'C8'])
  })

  it('gives an old-format issue no needs', () => {
    expect(issueNeeds({ ...trashcans, format: 'stories', needs: [], needGroups: [] })).toEqual([])
  })
})

describe('needsByPriority', () => {
  it('groups in the order M, S, C, W and keeps the file order inside a group', () => {
    const groups = needsByPriority(issueNeeds(trashcans))
    expect(groups.map((g) => g.priority)).toEqual(['M', 'S', 'C', 'W'])
    expect(groups[0].items.map((i) => i.need.id)).toEqual(['N01', 'N04', 'N05', 'N06', 'N07', 'O04-US02', 'O12-US01', 'I24-US01'])
    expect(groups[3].items.map((i) => i.need.id)).toEqual(['O09-US01'])
  })

  it('leaves out empty groups', () => {
    const groups = needsByPriority(issueNeeds(smokefree).filter((i) => i.need.priority === 'M'))
    expect(groups.map((g) => g.priority)).toEqual(['M'])
  })
})

describe('needsOfStakeholder', () => {
  it('lists N01 once for I01, with its 5 own stories', () => {
    const items = needsOfStakeholder(trashcans, 'I01')
    expect(items.filter((i) => i.need.id === 'N01')).toHaveLength(1)
    const n01 = items.find((i) => i.need.id === 'N01')!
    expect(ids(n01.ownStories)).toEqual(['I01-US01', 'I01-US03', 'I01-US04', 'I01-US05', 'I01-US06'])
    expect(n01.stories).toHaveLength(9)
  })

  it('keeps the order of 5.2', () => {
    const items = needsOfStakeholder(trashcans, 'I01')
    const order = ids(trashcans.needs)
    const positions = items.map((i) => order.indexOf(i.need.id))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('finds the need I06-US01 for I06 in #8', () => {
    expect(needsOfStakeholder(smokefree, 'I06').map((i) => i.need.id)).toEqual(['I06-US01'])
  })

  it('is empty for a stakeholder with no story', () => {
    expect(needsOfStakeholder(trashcans, 'Z99')).toEqual([])
  })
})

describe('dataBasedNeeds', () => {
  it('keeps a need when one of its stories has a [實證] or [AI整理] 以便… cell', () => {
    const items = issueNeeds(trashcans)
    const kept = dataBasedNeeds(items)
    // N01 is kept although its group tag is [AI模擬]: some of its stories have data.
    expect(kept.map((i) => i.need.id)).toEqual(['N01', 'N03', 'N04', 'N06', 'I01-US09', 'I24-US01'])
    for (const item of items) {
      const based = item.stories.some((s) => s.soThat.tag === '實證' || s.soThat.tag === 'AI整理')
      expect(kept.includes(item)).toBe(based)
    }
  })

  it('looks at the 以便… cell only, not the 我想要… cell', () => {
    const items = issueNeeds(trashcans)
    const item = items[0]
    const stories = item.stories.map((s) => ({
      ...s,
      want: { ...s.want, tag: '實證' as const },
      soThat: { ...s.soThat, tag: 'AI模擬' as const },
    }))
    expect(dataBasedNeeds([{ ...item, stories }])).toEqual([])
  })

  it('keeps the order of the list', () => {
    const items = issueNeeds(trashcans)
    const kept = dataBasedNeeds(items)
    const positions = kept.map((i) => items.indexOf(i))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})

describe('needsForStakeholder', () => {
  const items = issueNeeds(trashcans)

  it('keeps every need when no stakeholder is picked', () => {
    expect(needsForStakeholder(items, null)).toEqual(items)
  })

  it('keeps only the needs with a story of the stakeholder', () => {
    const kept = needsForStakeholder(items, 'I01')
    expect(kept.map((i) => i.need.id)).toEqual(needsOfStakeholder(trashcans, 'I01').map((i) => i.need.id))
    expect(kept.map((i) => i.need.id)).toContain('N01')
    expect(kept.map((i) => i.need.id)).toContain('I01-US09')
  })
})

describe('needSummaryOf', () => {
  const need = (issue: IssueFile, id: string) => {
    const n = issue.needs.find((x) => x.id === id)
    if (!n) throw new Error(`no need ${id}`)
    return n
  }

  it('uses the summary and tag of the N group', () => {
    const group = trashcans.needGroups.find((g) => g.id === 'N01')!
    expect(needSummaryOf(trashcans, need(trashcans, 'N01'))).toEqual({ text: group.summary, tag: group.tag, pending: false })
  })

  it('uses the 以便… cell of the story for a need with no group', () => {
    expect(needSummaryOf(trashcans, need(trashcans, 'O04-US02'))).toEqual(story(trashcans, 'O04-US02').soThat)
  })

  it('is the same cell as the summary of issueNeeds', () => {
    for (const item of issueNeeds(trashcans)) expect(needSummaryOf(trashcans, item.need)).toEqual(item.summary)
  })
})

describe('shownNeedStories', () => {
  it('without the filter, gives every story of the need in its order', () => {
    const n01 = issueNeeds(trashcans).find((i) => i.need.id === 'N01')!
    expect(shownNeedStories(n01, false)).toEqual(n01.stories)
  })

  it('with the filter, keeps only the stories with a [實證] or [AI整理] cell, in order', () => {
    const n01 = issueNeeds(trashcans).find((i) => i.need.id === 'N01')!
    const kept = shownNeedStories(n01, true)
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(n01.stories.length)
    const based = (s: Story) => [s.want.tag, s.soThat.tag].some((t) => t === '實證' || t === 'AI整理')
    expect(kept).toEqual(n01.stories.filter(based))
  })

  it('with the filter, a need that dataBasedNeeds keeps always has a story left', () => {
    for (const item of dataBasedNeeds(issueNeeds(trashcans))) expect(shownNeedStories(item, true).length).toBeGreaterThan(0)
  })
})
