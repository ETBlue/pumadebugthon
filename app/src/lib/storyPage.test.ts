import { describe, expect, it } from 'vitest'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IssueFile } from '@/types'
import { needKey } from './needs'
import { findStory, storyView } from './storyPage'

const trashcans = trashcansJson as IssueFile

const ids = (list: { id: string }[]) => list.map((x) => x.id)
const story = (id: string) => trashcans.stories.find((s) => s.id === id)!

describe('findStory', () => {
  it('finds a story of the right stakeholder', () => {
    expect(findStory(trashcans, 'I06', 'I06-US01')).toEqual({ kind: 'found', story: story('I06-US01') })
  })

  it('does not find a story of another stakeholder; no redirect (decision 113)', () => {
    expect(findStory(trashcans, 'I01', 'I06-US01')).toEqual({ kind: 'notFound' })
  })

  it('does not find an unknown story', () => {
    expect(findStory(trashcans, 'I06', 'I06-US99')).toEqual({ kind: 'notFound' })
  })

  it('does not find a story without an issue', () => {
    expect(findStory(null, 'I06', 'I06-US01')).toEqual({ kind: 'notFound' })
  })
})

describe('storyView', () => {
  const view = storyView(trashcans, story('I06-US01'))

  it('has the want key and the need key', () => {
    expect(view.wantKey).toBe('W08')
    expect(view.needKey).toBe('N07')
  })

  it('has the W group with the other stakeholders, in ID order', () => {
    expect(view.wantGroup?.group.id).toBe('W08')
    expect(view.wantGroup?.others).toEqual(['O12', 'I07'])
  })

  it('has the N group with the other stakeholders', () => {
    expect(view.needGroup?.group.id).toBe('N07')
    expect(view.needGroup?.others).toEqual(['I07'])
  })

  it('has the row of 5.2 for its need', () => {
    expect(view.need?.id).toBe('N07')
  })

  it('has the conflicts with the story on a side, with the other side', () => {
    expect(view.conflicts.map((c) => c.view.conflict.id)).toEqual(['C6'])
    expect(ids(view.conflicts[0].otherStories)).toEqual(['I01-US01'])
    expect(ids(view.conflicts[0].view.needsA)).toEqual(['N01'])
  })

  it('has the solutions that cover its need', () => {
    expect(ids(view.solutions)).toEqual(['A'])
  })

  it('has no groups for a story with no W group and no N group', () => {
    const v = storyView(trashcans, story('I24-US01'))
    expect(v.wantKey).toBe('I24-US01')
    expect(v.needKey).toBe('I24-US01')
    expect(v.wantGroup).toBeNull()
    expect(v.needGroup).toBeNull()
    expect(v.need?.id).toBe('I24-US01')
    expect(ids(v.solutions)).toEqual(['E'])
  })

  it('uses the same need key rule as needs.ts, also when the N group is missing from needGroups', () => {
    const s = { ...story('I06-US01'), needGroup: 'N99' }
    const v = storyView(trashcans, s)
    expect(needKey(s)).toBe('N99')
    expect(v.needKey).toBe('N99')
    expect(v.needGroup).toBeNull()
    expect(v.need).toBeNull()
  })

  it('has no need and no N group in the old format', () => {
    const old: IssueFile = { ...trashcans, format: 'stories', needs: [], needGroups: [] }
    const s = { ...story('I06-US01'), needGroup: null }
    const v = storyView(old, s)
    expect(v.needKey).toBe('I06-US01')
    expect(v.needGroup).toBeNull()
    expect(v.need).toBeNull()
    expect(v.wantKey).toBe('W08')
  })
})
