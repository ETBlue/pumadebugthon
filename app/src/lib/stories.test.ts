import { describe, expect, it } from 'vitest'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IssueFile, Story } from '@/types'
import { storyStakeholderOf } from './stories'

const trashcans = trashcansJson as IssueFile

describe('storyStakeholderOf', () => {
  it('gives the stakeholder of a story of the issue', () => {
    const of = storyStakeholderOf(trashcans)
    expect(of('I06-US01')).toBe('I06')
    expect(of('O04-US04')).toBe('O04')
  })

  it('uses the story field, not the ID, when the two differ', () => {
    const story = { ...trashcans.stories[0], id: 'O01-US99', stakeholder: 'I05' } as Story
    expect(storyStakeholderOf({ stories: [story] })('O01-US99')).toBe('I05')
  })

  it('falls back to the part of the ID before 「-」 for an unknown story', () => {
    expect(storyStakeholderOf(trashcans)('I77-US03')).toBe('I77')
  })
})
