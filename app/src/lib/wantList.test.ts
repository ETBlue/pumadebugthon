import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile } from '@/types'
import { pickList } from './opinion'
import { conflictView, conflictsForStakeholder, issueWants, wantKey, wantsForStakeholder, wantsOfStakeholder } from './wantList'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile

const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('wantKey', () => {
  it('is the W group of a story in a group', () => {
    const s = trashcans.stories.find((x) => x.id === 'I06-US01')!
    expect(wantKey(trashcans, s)).toBe('W08')
  })

  it('is the story ID for a story with no group', () => {
    const s = trashcans.stories.find((x) => x.id === 'I09-US01')!
    expect(wantKey(trashcans, s)).toBe('I09-US01')
  })

  it('is a key of the pick list for every story in the fixtures', () => {
    for (const issue of [trees, trashcans, smokefree]) {
      const keys = new Set(pickList(issue).map((i) => i.key))
      for (const s of issue.stories) {
        expect(keys.has(wantKey(issue, s))).toBe(true)
        expect(wantKey(issue, s)).toBe(s.group ?? s.id)
      }
    }
  })

  it('uses the story ID when its group is not in the group table', () => {
    const s = { ...trashcans.stories[0], group: 'W99' }
    expect(wantKey(trashcans, s)).toBe(s.id)
  })
})

describe('issueWants', () => {
  const items = issueWants(trashcans)

  it('has the items of pickList, in the same order', () => {
    expect(items.map((i) => i.key)).toEqual(pickList(trashcans).map((i) => i.key))
  })

  it('W08 has I06 and the other stakeholders of the group, in ID order', () => {
    const w08 = items.find((i) => i.key === 'W08')!
    expect(w08.storyIds).toEqual(['O12-US01', 'I06-US01', 'I07-US02'])
    expect(w08.stakeholders).toEqual(['O12', 'I06', 'I07'])
  })

  it('lists the conflicts with a story of the item on a side, in file order', () => {
    expect(ids(items.find((i) => i.key === 'W08')!.conflicts)).toEqual(['C6'])
    // I09-US01 is on side B of C1, C7 and C8.
    expect(ids(items.find((i) => i.key === 'I09-US01')!.conflicts)).toEqual(['C1', 'C7', 'C8'])
  })

  it('lists the solutions that cover the need of one of its stories, in file order', () => {
    // W08 has I06-US01 and I07-US02 (need N07: A) and O12-US01 (A, D).
    expect(ids(items.find((i) => i.key === 'W08')!.solutions)).toEqual(['A', 'D'])
  })

  it('has an empty solution list when no solution covers its stories', () => {
    // O09-US01 is 這次不做, so no solution covers it.
    const item = items.find((i) => i.storyIds.includes('O09-US01'))!
    expect(item.solutions).toEqual([])
  })
})

describe('wantsOfStakeholder', () => {
  it('I06 in #2 has the wants W08 and W11', () => {
    expect(wantsOfStakeholder(trashcans, 'I06').map((i) => i.key)).toEqual(['W08', 'W11'])
  })

  it('is empty for a stakeholder that is not in the issue', () => {
    expect(wantsOfStakeholder(trashcans, 'I99')).toEqual([])
  })
})

describe('wantsForStakeholder', () => {
  const items = issueWants(trashcans)

  it('returns all items for null', () => {
    expect(wantsForStakeholder(items, null)).toBe(items)
  })

  it('keeps the items with a story of the stakeholder', () => {
    expect(wantsForStakeholder(items, 'I06').map((i) => i.key)).toEqual(['W08', 'W11'])
  })

  it('is empty for an unknown stakeholder', () => {
    expect(wantsForStakeholder(items, 'I99')).toEqual([])
  })
})

describe('conflictsForStakeholder', () => {
  it('I06 in #2 has the conflict C6', () => {
    expect(ids(conflictsForStakeholder(trashcans.conflicts, 'I06'))).toEqual(['C6'])
  })

  it('keeps a conflict with the stakeholder on either side, in file order', () => {
    // I09 is on side B of C1, C5, C7 and C8.
    expect(ids(conflictsForStakeholder(trashcans.conflicts, 'I09'))).toEqual(['C1', 'C5', 'C7', 'C8'])
  })

  it('returns all conflicts for null', () => {
    expect(conflictsForStakeholder(trashcans.conflicts, null)).toBe(trashcans.conflicts)
  })

  it('is empty for an unknown stakeholder', () => {
    expect(conflictsForStakeholder(trashcans.conflicts, 'I99')).toEqual([])
  })
})

describe('conflictView', () => {
  const c1 = trashcans.conflicts.find((c) => c.id === 'C1')!
  const view = conflictView(trashcans, c1)

  it('has the stories of each side', () => {
    expect(ids(view.storiesA)).toEqual(['I01-US01', 'I01-US05', 'I10-US01'])
    expect(ids(view.storiesB)).toEqual(['I09-US01'])
  })

  it('C1 has the needs N01 vs N06', () => {
    expect(ids(view.needsA)).toEqual(['N01'])
    expect(ids(view.needsB)).toEqual(['N06'])
  })

  it('C1 has the way out A, B, D', () => {
    expect(view.wayOut).toBe(c1.wayOut)
    expect(ids(view.wayOutSolutions)).toEqual(['A', 'B', 'D'])
    expect(view.hasWayOut).toBe(true)
  })

  it('finds a need with no group by its story ID', () => {
    const c6 = conflictView(trashcans, trashcans.conflicts.find((c) => c.id === 'C6')!)
    expect(ids(c6.needsB)).toEqual(['N07', 'O12-US01'])
  })

  it('has no way out when the cell says 未找到', () => {
    const c3 = trashcans.conflicts.find((c) => c.id === 'C3')!
    const v = conflictView(trashcans, c3)
    expect(v.wayOut?.text).toMatch(/^未找到/)
    expect(v.wayOutSolutions).toEqual([])
    expect(v.hasWayOut).toBe(false)
  })

  it('leaves out unknown story, need and solution IDs', () => {
    const fake = { ...c1, sideA: ['I01-US01', 'X99-US01'], needsA: ['N01', 'N99'], wayOutSolutions: ['A', 'Z'] }
    const v = conflictView(trashcans, fake)
    expect(ids(v.storiesA)).toEqual(['I01-US01'])
    expect(ids(v.needsA)).toEqual(['N01'])
    expect(ids(v.wayOutSolutions)).toEqual(['A'])
  })
})
