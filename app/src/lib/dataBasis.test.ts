import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IssueFile, Story } from '@/types'
import {
  DATA_BASED_TAGS, FILTER_PARAM, dataBasedCount, dataBasedOnly, dataBasedPickList, dataBasisFilterSearch,
  hasDataBasis, isDataBasisFilterOn, withDataBasisFilter,
} from './dataBasis'
import { pickList } from './opinion'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const ids = (list: { id: string }[]) => list.map((x) => x.id)

const story = trashcans.stories[0]
const ai = { text: 'x', tag: 'AI模擬' as const, pending: false }
const ev = { text: 'x', tag: '實證' as const, pending: false }
const sum = { text: 'x', tag: 'AI整理' as const, pending: false }
const pending = { text: '【待補：原文】', tag: null, pending: true }

/** The #2 stories, with the 我想要… cell of the given stories tagged AI整理. */
function withSummary(storyIds: string[]): Story[] {
  return trashcans.stories.map((s) => (storyIds.includes(s.id) ? { ...s, want: sum, soThat: ai } : s))
}

describe('DATA_BASED_TAGS', () => {
  it('is 實證 and AI整理; AI模擬 is not data based', () => {
    expect(DATA_BASED_TAGS).toEqual(['實證', 'AI整理'])
  })
})

describe('hasDataBasis', () => {
  it('is true when the 我想要… cell has the 實證 tag', () => {
    expect(hasDataBasis({ ...story, want: ev, soThat: ai })).toBe(true)
  })

  it('is true when only the 以便… cell has the 實證 tag', () => {
    expect(hasDataBasis({ ...story, want: ai, soThat: ev })).toBe(true)
  })

  it('is true when the 我想要… cell has the AI整理 tag', () => {
    expect(hasDataBasis({ ...story, want: sum, soThat: ai })).toBe(true)
  })

  it('is true when only the 以便… cell has the AI整理 tag', () => {
    expect(hasDataBasis({ ...story, want: ai, soThat: sum })).toBe(true)
  })

  it('is false for AI模擬 and pending cells, even when the priority tag is 實證 or AI整理', () => {
    expect(hasDataBasis({ ...story, want: ai, soThat: pending, priorityTag: '實證' })).toBe(false)
    expect(hasDataBasis({ ...story, want: ai, soThat: ai, priorityTag: 'AI整理' })).toBe(false)
  })
})

describe('dataBasedOnly', () => {
  it('keeps the 6 stories of #2 with a 實證 tag, in file order', () => {
    expect(ids(dataBasedOnly(trashcans.stories))).toEqual([
      'O01-US03', 'O03-US04', 'O04-US04', 'O04-US05', 'I01-US04', 'I09-US04',
    ])
  })

  it('keeps the 7 stories of #1 with a 實證 tag', () => {
    expect(dataBasedOnly(trees.stories)).toHaveLength(7)
    expect(dataBasedOnly(trees.stories).every(hasDataBasis)).toBe(true)
  })

  it('keeps AI整理 stories too, in file order', () => {
    expect(ids(dataBasedOnly(withSummary(['O01-US01', 'I13-US02'])))).toEqual([
      'O01-US01', 'O01-US03', 'O03-US04', 'O04-US04', 'O04-US05', 'I01-US04', 'I09-US04', 'I13-US02',
    ])
  })

  it('returns an empty list when no story has the tag', () => {
    const stories: Story[] = [{ ...story, want: ai, soThat: ai }]
    expect(dataBasedOnly(stories)).toEqual([])
  })
})

describe('dataBasedPickList', () => {
  it('keeps a pick item when any of its stories has the 實證 tag (#2)', () => {
    const items = dataBasedPickList(pickList(trashcans), trashcans.stories)
    expect(items.map((i) => i.key)).toEqual(['W01', 'W04', 'O04-US04'])
  })

  it('keeps a pick item when any of its stories has the AI整理 tag', () => {
    // W08 has O12-US01, I06-US01 and I07-US02, all AI模擬 in the fixture.
    const items = dataBasedPickList(pickList(trashcans), withSummary(['I06-US01']))
    expect(items.map((i) => i.key)).toContain('W08')
  })

  it('keeps the W groups of the 7 #1 stories', () => {
    const items = dataBasedPickList(pickList(trees), trees.stories)
    expect(items.map((i) => i.key)).toEqual(['W01', 'W02'])
    expect(items.flatMap((i) => i.storyIds).filter((id) => dataBasedOnly(trees.stories).some((s) => s.id === id)))
      .toHaveLength(7)
  })

  it('ignores unknown story IDs', () => {
    const item = { key: 'X', label: 'x', tag: null, pending: false, storyIds: ['O99-US99'], searchText: 'x' }
    expect(dataBasedPickList([item], trashcans.stories)).toEqual([])
  })
})

describe('dataBasedCount', () => {
  it('counts the stories of the item with a 實證 or AI整理 tag', () => {
    const w01 = pickList(trashcans).find((i) => i.key === 'W01')!
    expect(dataBasedCount(w01, trashcans.stories)).toBe(3)
    const w08 = pickList(trashcans).find((i) => i.key === 'W08')!
    expect(dataBasedCount(w08, trashcans.stories)).toBe(0)
    expect(dataBasedCount(w08, withSummary(['I06-US01', 'I07-US02']))).toBe(2)
  })
})

describe('URL setting', () => {
  it('keeps the old parameter name, so shared links still work', () => {
    expect(FILTER_PARAM).toBe('evidence')
  })

  it('is on only for evidence=1', () => {
    expect(isDataBasisFilterOn(new URLSearchParams('evidence=1'))).toBe(true)
    expect(isDataBasisFilterOn(new URLSearchParams('evidence=0'))).toBe(false)
    expect(isDataBasisFilterOn(new URLSearchParams(''))).toBe(false)
  })

  it('withDataBasisFilter sets or removes evidence and keeps the other values', () => {
    const before = new URLSearchParams('pick=W01')
    expect(withDataBasisFilter(before, true).toString()).toBe('pick=W01&evidence=1')
    expect(withDataBasisFilter(new URLSearchParams('pick=W01&evidence=1'), false).toString()).toBe('pick=W01')
    // The input is not changed.
    expect(before.toString()).toBe('pick=W01')
  })

  it('dataBasisFilterSearch keeps only the filter setting, for a link to another tab', () => {
    expect(dataBasisFilterSearch(new URLSearchParams('pick=W01&evidence=1'))).toBe('?evidence=1')
    expect(dataBasisFilterSearch(new URLSearchParams('pick=W01'))).toBe('')
  })
})
