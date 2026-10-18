import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile } from '@/types'
import { wantCount } from './counts'
import { hasDataBasis } from './dataBasis'
import { opinionPickTo, wantGroups } from './wants'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const all = [smokefree, trees, trashcans]

const total = (groups: ReturnType<typeof wantGroups>) => groups.reduce((n, g) => n + g.items.length, 0)

describe('wantGroups', () => {
  it('lists every 訴求 grouped by issue, in issue number order', () => {
    const groups = wantGroups(all, { query: '', dataBasedOnly: false })
    expect(groups.map((g) => g.issueNumber)).toEqual([1, 2, 8])
    expect(groups[1].title).toBe('找回消失的垃圾桶')
    // The same items as the header count 訴求.
    expect(total(groups)).toBe(wantCount(all))
  })

  it('keeps the order of the opinion check pick list', () => {
    const groups = wantGroups([trashcans], { query: '', dataBasedOnly: false })
    const keys = groups[0].items.map((i) => i.key)
    expect(keys.indexOf('W08')).toBeGreaterThanOrEqual(0)
    expect(keys).toEqual([...new Set(keys)])
  })

  it('filters by the search text', () => {
    const groups = wantGroups(all, { query: '人行道', dataBasedOnly: false })
    const two = groups.find((g) => g.issueNumber === 2)
    expect(two?.items.map((i) => i.key)).toContain('W08')
    expect(total(groups)).toBeLessThan(wantCount(all))
  })

  it('keeps only items with a data-based story when the filter is on', () => {
    const groups = wantGroups(all, { query: '', dataBasedOnly: true })
    expect(total(groups)).toBeGreaterThan(0)
    const stories = new Map(all.flatMap((i) => i.stories.map((s) => [`${i.number}:${s.id}`, s])))
    for (const g of groups) {
      for (const item of g.items) {
        expect(item.storyIds.some((id) => hasDataBasis(stories.get(`${g.issueNumber}:${id}`)!))).toBe(true)
      }
    }
  })

  it('leaves out an issue with no matching item', () => {
    expect(wantGroups(all, { query: '沒有這種字串', dataBasedOnly: false })).toEqual([])
  })
})

describe('opinionPickTo', () => {
  it('links to the opinion check with the pick', () => {
    expect(opinionPickTo(2, 'W08', false)).toEqual({ pathname: '/issues/2/opinion', search: '?pick=W08' })
  })

  it('keeps the 只看有資料根據 filter', () => {
    expect(opinionPickTo(2, 'I09-US01', true)).toEqual({ pathname: '/issues/2/opinion', search: '?pick=I09-US01&evidence=1' })
  })
})
