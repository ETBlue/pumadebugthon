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
    expect(items.find((i) => i.key === 'W08')).toMatchObject({
      key: 'W08', label: '清潔箱不擋住人行道', tag: 'AI模擬', pending: false, storyIds: ['O12-US01', 'I06-US01', 'I07-US02'],
    })
  })

  it('uses the 我想要… text for a story without a group', () => {
    expect(items.find((i) => i.key === 'I09-US01')).toEqual({
      key: 'I09-US01', label: '清潔箱不要放在我家門口', tag: 'AI模擬', pending: false, storyIds: ['I09-US01'], searchText: '清潔箱不要放在我家門口',
    })
  })

  it('searchText of a W group has the summary and the 我想要… of every story in it', () => {
    const w08 = items.find((i) => i.key === 'W08')!
    expect(w08.searchText).toContain('清潔箱不擋住人行道')
    expect(w08.searchText).toContain('清潔箱設置點先確認人行道淨寬與管線位置')
    expect(w08.searchText).toContain('清潔箱不要擋住人行道與導盲磚')
  })

  it('keeps the order of the stories in the issue file', () => {
    expect(items.slice(0, 4).map((i) => i.key)).toEqual(['O01-US01', 'O01-US02', 'W01', 'W02'])
  })

  it('a story item takes the tag and pending flag of its 我想要… cell', () => {
    const story = { ...trashcans.stories[0], group: null, want: { text: '【待補：原文】', tag: null, pending: true } }
    const item = pickList({ ...trashcans, stories: [story], groups: [] })[0]
    expect(item).toMatchObject({ key: story.id, tag: null, pending: true })
  })
})

describe('filterPickList', () => {
  const items: PickItem[] = [
    { key: 'W01', label: '清潔箱不擋住人行道', tag: 'AI模擬', pending: false, storyIds: ['I06-US01'], searchText: '清潔箱不擋住人行道\n不擋住導盲磚' },
    { key: 'I01-US01', label: '開放資料提供 API', tag: 'AI模擬', pending: false, storyIds: ['I01-US01'], searchText: '開放資料提供 API' },
    { key: 'I02-US01', label: '見 [**市府網站**](https://example.org)', tag: 'AI模擬', pending: false, storyIds: ['I02-US01'], searchText: '見 市府網站' },
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

  it('matches searchText, not only the label', () => {
    expect(filterPickList(items, '導盲磚').map((i) => i.key)).toEqual(['W01'])
  })

  it('finds W08 in #2 with 導盲磚, a word only in a story of the group', () => {
    expect(filterPickList(pickList(trashcans), '導盲磚').map((i) => i.key)).toEqual(['W08'])
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

  it('leaves out a conflict when every story in it was picked', () => {
    // C4 is O09-US01 vs O04-US01.
    const c = opinionResult(trashcans, ['O09-US01', 'O04-US01'])
    expect(c.otherSide.map((o) => o.conflict.id)).not.toContain('C4')
    expect(c.otherSide.every((o) => o.otherStories.length > 0)).toBe(true)
  })

  it('notMentioned is in ID order even when the issue lists stakeholders out of order', () => {
    const shuffled: IssueFile = { ...trashcans, stakeholders: [...trashcans.stakeholders].reverse() }
    const r2 = opinionResult(shuffled, w08.storyIds)
    expect(r2.notMentioned).toEqual(r.notMentioned)
    expect(r2.notMentioned.slice(0, 3)).toEqual(['O01', 'O03', 'O04'])
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
