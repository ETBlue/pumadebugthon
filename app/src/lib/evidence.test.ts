import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IssueFile, Story } from '@/types'
import {
  evidenceCount, evidenceOnly, evidencePickList, evidenceSearch, hasEvidence, isEvidenceOnly, withEvidence,
} from './evidence'
import { pickList } from './opinion'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const ids = (list: { id: string }[]) => list.map((x) => x.id)

const story = trashcans.stories[0]
const ai = { text: 'x', tag: 'AI模擬' as const, pending: false }
const ev = { text: 'x', tag: '實證' as const, pending: false }
const pending = { text: '【待補：原文】', tag: null, pending: true }

describe('hasEvidence', () => {
  it('is true when the 我想要… cell has the 實證 tag', () => {
    expect(hasEvidence({ ...story, want: ev, soThat: ai })).toBe(true)
  })

  it('is true when only the 以便… cell has the 實證 tag', () => {
    expect(hasEvidence({ ...story, want: ai, soThat: ev })).toBe(true)
  })

  it('is false for AI and pending cells, even when the priority tag is 實證', () => {
    expect(hasEvidence({ ...story, want: ai, soThat: pending, priorityTag: '實證' })).toBe(false)
  })
})

describe('evidenceOnly', () => {
  it('keeps the 6 stories of #2 with a 實證 tag, in file order', () => {
    expect(ids(evidenceOnly(trashcans.stories))).toEqual([
      'O01-US03', 'O03-US04', 'O04-US04', 'O04-US05', 'I01-US04', 'I09-US04',
    ])
  })

  it('keeps the 7 stories of #1 with a 實證 tag', () => {
    expect(evidenceOnly(trees.stories)).toHaveLength(7)
    expect(evidenceOnly(trees.stories).every(hasEvidence)).toBe(true)
  })

  it('returns an empty list when no story has the tag', () => {
    const stories: Story[] = [{ ...story, want: ai, soThat: ai }]
    expect(evidenceOnly(stories)).toEqual([])
  })
})

describe('evidencePickList', () => {
  it('keeps a pick item when any of its stories has the 實證 tag (#2)', () => {
    const items = evidencePickList(pickList(trashcans), trashcans.stories)
    expect(items.map((i) => i.key)).toEqual(['W01', 'W04', 'O04-US04'])
  })

  it('keeps the W groups of the 7 #1 stories', () => {
    const items = evidencePickList(pickList(trees), trees.stories)
    expect(items.map((i) => i.key)).toEqual(['W01', 'W02'])
    expect(items.flatMap((i) => i.storyIds).filter((id) => evidenceOnly(trees.stories).some((s) => s.id === id)))
      .toHaveLength(7)
  })

  it('ignores unknown story IDs', () => {
    const item = { key: 'X', label: 'x', tag: null, pending: false, storyIds: ['O99-US99'], searchText: 'x' }
    expect(evidencePickList([item], trashcans.stories)).toEqual([])
  })
})

describe('evidenceCount', () => {
  it('counts the stories of the item with a 實證 tag', () => {
    const w01 = pickList(trashcans).find((i) => i.key === 'W01')!
    expect(evidenceCount(w01, trashcans.stories)).toBe(3)
    const w08 = pickList(trashcans).find((i) => i.key === 'W08')!
    expect(evidenceCount(w08, trashcans.stories)).toBe(0)
  })
})

describe('URL setting', () => {
  it('is on only for evidence=1', () => {
    expect(isEvidenceOnly(new URLSearchParams('evidence=1'))).toBe(true)
    expect(isEvidenceOnly(new URLSearchParams('evidence=0'))).toBe(false)
    expect(isEvidenceOnly(new URLSearchParams(''))).toBe(false)
  })

  it('withEvidence sets or removes evidence and keeps the other values', () => {
    const before = new URLSearchParams('pick=W01')
    expect(withEvidence(before, true).toString()).toBe('pick=W01&evidence=1')
    expect(withEvidence(new URLSearchParams('pick=W01&evidence=1'), false).toString()).toBe('pick=W01')
    // The input is not changed.
    expect(before.toString()).toBe('pick=W01')
  })

  it('evidenceSearch keeps only the evidence setting, for a link to another tab', () => {
    expect(evidenceSearch(new URLSearchParams('pick=W01&evidence=1'))).toBe('?evidence=1')
    expect(evidenceSearch(new URLSearchParams('pick=W01'))).toBe('')
  })
})
