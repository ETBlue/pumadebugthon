import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile } from '@/types'
import { needCount } from './counts'
import { DATA_BASED_TAGS } from './dataBasis'
import { needGroups, needPickKey } from './needs'
import { pickList } from './opinion'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const all = [smokefree, trees, trashcans]

const total = (groups: ReturnType<typeof needGroups>) => groups.reduce((n, g) => n + g.stories.length, 0)

describe('needGroups', () => {
  it('lists the 以便… cell of every story, grouped by issue, in issue number order', () => {
    const groups = needGroups(all, { query: '', dataBasedOnly: false })
    expect(groups.map((g) => g.issueNumber)).toEqual([1, 2, 8])
    expect(groups[1].title).toBe('找回消失的垃圾桶')
    // The same items as the header count 需求.
    expect(total(groups)).toBe(needCount(all))
  })

  it('keeps the story order of the issue file', () => {
    const groups = needGroups([trashcans], { query: '', dataBasedOnly: false })
    expect(groups[0].stories.map((s) => s.id)).toEqual(trashcans.stories.map((s) => s.id))
  })

  it('filters by the search text, without Markdown', () => {
    const first = trashcans.stories[0].soThat.text
    const groups = needGroups(all, { query: first, dataBasedOnly: false })
    expect(groups.find((g) => g.issueNumber === 2)?.stories.map((s) => s.id)).toContain(trashcans.stories[0].id)
    expect(total(groups)).toBeLessThan(needCount(all))
    expect(needGroups(all, { query: '  ', dataBasedOnly: false })).toEqual(needGroups(all, { query: '', dataBasedOnly: false }))
  })

  it('keeps only 以便… cells with a data-based tag when the filter is on', () => {
    const groups = needGroups(all, { query: '', dataBasedOnly: true })
    const stories = groups.flatMap((g) => g.stories)
    expect(stories.length).toBeGreaterThan(0)
    expect(stories.length).toBeLessThan(needCount(all))
    expect(stories.every((s) => DATA_BASED_TAGS.includes(s.soThat.tag))).toBe(true)
  })

  it('leaves out issues with no matching story', () => {
    expect(needGroups(all, { query: 'no-such-text-xyz', dataBasedOnly: false })).toEqual([])
  })
})

describe('needPickKey', () => {
  it('is the W group of a story in a group, else the story ID, the same keys as the pick list', () => {
    const keys = new Set(pickList(trashcans).map((i) => i.key))
    for (const s of trashcans.stories) {
      const key = needPickKey(trashcans, s)
      expect(keys.has(key)).toBe(true)
      expect(key).toBe(s.group ?? s.id)
    }
  })

  it('uses the story ID when its group is not in the group table', () => {
    const s = { ...trashcans.stories[0], group: 'W99' }
    expect(needPickKey(trashcans, s)).toBe(s.id)
  })
})
