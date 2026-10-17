import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IssueFile } from '@/types'
import { filterPickList, opinionResult, pickList, type PickItem } from './opinion'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile

const ids = (list: { id: string }[]) => list.map((x) => x.id)

describe('pickList', () => {
  const items = pickList(trashcans)

  it('has one item per W group and one per story without a group', () => {
    const grouped = trashcans.stories.filter((s) => s.group !== null).length
    expect(items).toHaveLength(trashcans.groups.length + trashcans.stories.length - grouped)
    const allIds = items.flatMap((i) => i.storyIds)
    expect(allIds.sort()).toEqual(trashcans.stories.map((s) => s.id).sort())
  })

  it('uses the group summary and all group stories for a W group', () => {
    expect(items.find((i) => i.key === 'W08')).toEqual({
      key: 'W08', label: '清潔箱不擋住人行道', storyIds: ['O12-US01', 'I06-US01', 'I07-US02'],
    })
  })

  it('uses the 我想要… text for a story without a group', () => {
    expect(items.find((i) => i.key === 'I09-US01')).toEqual({
      key: 'I09-US01', label: '清潔箱不要放在我家門口', storyIds: ['I09-US01'],
    })
  })

  it('keeps the order of the stories in the issue file', () => {
    expect(items.slice(0, 4).map((i) => i.key)).toEqual(['O01-US01', 'O01-US02', 'W01', 'W02'])
  })
})

describe('filterPickList', () => {
  const items: PickItem[] = [
    { key: 'W01', label: '清潔箱不擋住人行道', storyIds: ['I06-US01'] },
    { key: 'I01-US01', label: '開放資料提供 API', storyIds: ['I01-US01'] },
    { key: 'I02-US01', label: '見 [**市府網站**](https://example.org)', storyIds: ['I02-US01'] },
  ]

  it('returns all items for an empty or blank query', () => {
    expect(filterPickList(items, '')).toEqual(items)
    expect(filterPickList(items, '   ')).toEqual(items)
  })

  it('matches a substring, after trimming the query', () => {
    expect(filterPickList(items, ' 人行道 ').map((i) => i.key)).toEqual(['W01'])
  })

  it('ignores case for Latin letters', () => {
    expect(filterPickList(items, 'api').map((i) => i.key)).toEqual(['I01-US01'])
  })

  it('matches the text without Markdown, not the URL', () => {
    expect(filterPickList(items, '市府網站').map((i) => i.key)).toEqual(['I02-US01'])
    expect(filterPickList(items, 'example')).toEqual([])
  })

  it('finds W08 in #2 with 人行道', () => {
    const found = filterPickList(pickList(trashcans), '人行道')
    expect(found.map((i) => i.key)).toContain('W08')
  })
})

describe('opinionResult on #2', () => {
  const w08 = pickList(trashcans).find((i) => i.key === 'W08')!
  const r = opinionResult(trashcans, w08.storyIds)

  it('same: the 3 picked stories, from O12, I06 and I07', () => {
    expect(ids(r.same)).toEqual(['O12-US01', 'I06-US01', 'I07-US02'])
    expect(r.same.map((s) => s.stakeholder)).toEqual(['O12', 'I06', 'I07'])
  })

  it('otherSide: C6 with I01-US01', () => {
    expect(r.otherSide.map((o) => o.conflict.id)).toEqual(['C6'])
    expect(ids(r.otherSide[0].otherStories)).toEqual(['I01-US01'])
  })

  it('solutions: A and D', () => {
    expect(ids(r.solutions)).toEqual(['A', 'D'])
  })

  it('notMentioned: every other stakeholder of the issue, in ID order', () => {
    const expected = trashcans.stakeholders.map((s) => s.id).filter((id) => !['O12', 'I06', 'I07', 'I01'].includes(id))
    expect(r.notMentioned).toEqual(expected)
    expect(r.notMentioned[0]).toBe('O01')
    expect(r.notMentioned.at(-1)).toBe('I13')
  })

  it('a story on side A shows side B', () => {
    const c = opinionResult(trashcans, ['I01-US01'])
    expect(c.otherSide.map((o) => o.conflict.id)).toEqual(['C1', 'C2', 'C3', 'C6'])
    expect(ids(c.otherSide[0].otherStories)).toEqual(['I09-US01'])
  })

  it('picked stories on both sides: other stories of both sides, minus the picked ones', () => {
    // C1 is I01-US01, I10-US01 vs I09-US01.
    const c = opinionResult(trashcans, ['I01-US01', 'I09-US01'])
    const c1 = c.otherSide.find((o) => o.conflict.id === 'C1')!
    expect(ids(c1.otherStories)).toEqual(['I10-US01'])
  })

  it('ignores unknown story IDs and returns empty parts for an empty pick', () => {
    const c = opinionResult(trashcans, [])
    expect(c).toMatchObject({ same: [], otherSide: [], solutions: [] })
    expect(c.notMentioned).toHaveLength(trashcans.stakeholders.length)
    expect(opinionResult(trashcans, ['X99-US01']).same).toEqual([])
  })
})

describe('opinionResult on #1', () => {
  it('picking W08 (I06-US02, I07-US03) shows C7 with O14-US06', () => {
    const w08 = pickList(trees).find((i) => i.key === 'W08')!
    expect(w08.storyIds).toEqual(['I06-US02', 'I07-US03'])
    const r = opinionResult(trees, w08.storyIds)
    expect(r.otherSide.map((o) => o.conflict.id)).toEqual(['C7'])
    expect(ids(r.otherSide[0].otherStories)).toEqual(['O14-US06'])
    expect(ids(r.solutions)).toEqual(['D'])
  })
})
