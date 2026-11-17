// The need list #/needs (plan-needs.md, Task N3): the filters, the sorts and
// their tie order, the search, and the URL state. The fixtures have 99 needs
// in #1, #2, #8 and #9, and 8 X-N groups.
import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { filterNeeds, NO_FILTERS, type ListFilters } from './listFilter'
import { DEFAULT_LIST_STATE, listUrlSearch, type ListState } from './listParams'
import { compareNeedRecords, sortNeeds } from './listSort'
import { needListItems, needListView, needsParams, needTypeOptions, type NeedListItem } from './needList'
import { needHasDataBasis, needShare } from './needRecords'
import { compareShares } from './coverage'

const index = indexJson as IndexFile
const cross = crossJson as CrossIssueFile
const issues = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]
const items = needListItems(issues, cross)
const keys = (list: { key: string }[]) => list.map((r) => r.key)
const filtered = (f: Partial<ListFilters>) => keys(filterNeeds(items, { ...NO_FILTERS, ...f }))
const view = (s: Partial<ListState>) => keys(needListView(items, { ...DEFAULT_LIST_STATE, ...s }))

describe('needListItems', () => {
  it('has every need once, in the fixed ID order, with its summary', () => {
    expect(items).toHaveLength(issues.reduce((n, f) => n + f.needs.length, 0))
    expect(new Set(keys(items)).size).toBe(items.length)
    expect(keys([...items].sort(compareNeedRecords))).toEqual(keys(items))
    // The same need ID in two issues: two items.
    expect(keys(items)).toContain('1-N01')
    expect(keys(items)).toContain('2-N01')
    const n01 = items.find((r) => r.key === '1-N01')!
    expect(n01.summary.text).toBe(treesJson.needGroups.find((g) => g.id === 'N01')!.summary)
  })
})

describe('filterNeeds', () => {
  it('keeps all with no filter', () => {
    expect(filtered({})).toEqual(keys(items))
  })

  it('議題: the needs of the picked issues', () => {
    const kept = filterNeeds(items, { ...NO_FILTERS, issues: [2, 9] })
    expect(new Set(kept.map((r) => r.issue))).toEqual(new Set([2, 9]))
    expect(kept).toHaveLength(trashcansJson.needs.length + policyJson.needs.length)
  })

  it('利害關係人: a need with a story of the stakeholder', () => {
    const kept = filterNeeds(items, { ...NO_FILTERS, who: 'I06' })
    expect(kept.length).toBeGreaterThan(0)
    for (const r of kept) expect(r.stories.some((s) => s.stakeholder === 'I06')).toBe(true)
    expect(items.filter((r) => r.stakeholders.includes('I06'))).toHaveLength(kept.length)
  })

  it('空間類型 and 領域: a need with no covering solution still matches its issue values', () => {
    const lonely = items.find((r) => r.solutions.length === 0 && r.need.priority !== 'W')!
    expect(lonely).toBeDefined()
    const issue = issues.find((i) => i.number === lonely.issue)!
    if (issue.spaces.length > 0) expect(filtered({ spaces: [issue.spaces[0]] })).toContain(lonely.key)
    expect(filtered({ domains: [issue.domains[0]] })).toContain(lonely.key)
  })

  it('空間類型: ANY picked space', () => {
    const kept = filterNeeds(items, { ...NO_FILTERS, spaces: ['park', 'sidewalk-furniture'] })
    expect(kept.length).toBeGreaterThan(0)
    for (const r of kept) expect(r.spaces.some((c) => c === 'park' || c === 'sidewalk-furniture')).toBe(true)
  })

  it('優先順序: the picked MoSCoW', () => {
    expect(filtered({ priorities: ['W'] })).toEqual(['2-O09-US01'])
    const mc = filterNeeds(items, { ...NO_FILTERS, priorities: ['M', 'C'] })
    expect(mc.every((r) => r.need.priority === 'M' || r.need.priority === 'C')).toBe(true)
  })

  it('解法涵蓋: 有 / 尚無; a W need is 尚無', () => {
    const yes = filtered({ coverage: ['yes'] })
    const no = filtered({ coverage: ['no'] })
    expect(yes.length + no.length).toBe(items.length)
    expect(no).toContain('2-O09-US01')
    expect(filtered({ coverage: ['yes', 'no'] })).toEqual(keys(items))
  })

  it('議題 「跨議題」 (issue=X): the needs in an X-N group', () => {
    const kept = filtered({ crossChoice: true })
    const inGroups = cross.needGroups.flatMap((g) => g.needs.map((n) => `${n.issue}-${n.id}`))
    expect(new Set(kept)).toEqual(new Set(inGroups))
  })

  it('議題: 「跨議題」 and an issue keep ANY of them', () => {
    const kept = filterNeeds(items, { ...NO_FILTERS, crossChoice: true, issues: [9] })
    expect(kept.every((r) => r.issue === 9 || r.crossGroups.length > 0)).toBe(true)
    expect(kept.length).toBe(items.filter((r) => r.issue === 9 || r.crossGroups.length > 0).length)
  })

  it('只看有資料根據: the rule of the issue 需求 tab, and it does not hide every need', () => {
    const kept = filtered({ dataBased: true })
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(items.length)
    expect(kept).toEqual(keys(items.filter(needHasDataBasis)))
  })

  it('combines filters: ALL must match', () => {
    const kept = filterNeeds(items, { ...NO_FILTERS, issues: [8], priorities: ['M'], coverage: ['yes'] })
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.every((r) => r.issue === 8 && r.need.priority === 'M' && r.covered)).toBe(true)
  })
})

describe('sortNeeds', () => {
  it('最近更新: newest first, the same date with the highest ID first (decision 82)', () => {
    const sorted = sortNeeds(items, 'updated')
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]
      const b = sorted[i]
      expect(a.need.updated! >= b.need.updated!).toBe(true)
      if (a.need.updated === b.need.updated) expect(compareNeedRecords(a, b)).toBeGreaterThan(0)
    }
    // The newest date first, its needs with the highest issue and ID first.
    const newest = sorted[0].need.updated
    expect(keys(sorted.filter((r) => r.need.updated === newest))).toEqual(keys(items.filter((r) => r.need.updated === newest)).reverse())
    expect(sorted[0].issue).toBe(9)
  })

  it('最近新增: newest first, the same date with the highest ID first (decision 82)', () => {
    const sorted = sortNeeds(items, 'added')
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]
      const b = sorted[i]
      expect(a.need.added! >= b.need.added!).toBe(true)
      if (a.need.added === b.need.added) expect(compareNeedRecords(a, b)).toBeGreaterThan(0)
    }
    // 2026-10-21: #9 I36-US01, I31-US05, #2 I09-US06, #1 I14-US06, I14-US05.
    expect(keys(sorted.slice(0, 5))).toEqual(['9-I36-US01', '9-I31-US05', '2-I09-US06', '1-I14-US06', '1-I14-US05'])
  })

  it('puts a need with no date last, in the fixed ID order', () => {
    const noDate = (r: NeedListItem): NeedListItem => ({ ...r, need: { ...r.need, updated: null } })
    const list = [noDate(items[5]), items[3], noDate(items[1])]
    expect(keys(sortNeeds(list, 'updated'))).toEqual([items[3].key, items[1].key, items[5].key])
  })

  it('資料根據比例: the higher share first, ties in the fixed ID order (as #/solutions)', () => {
    const sorted = sortNeeds(items, 'evidence')
    for (let i = 1; i < sorted.length; i++) {
      const c = compareShares(needShare(sorted[i - 1]), needShare(sorted[i]))
      expect(c).toBeLessThanOrEqual(0)
      if (c === 0) expect(compareNeedRecords(sorted[i - 1], sorted[i])).toBeLessThan(0)
    }
  })

  it('does not change the input', () => {
    const before = keys(items)
    sortNeeds(items, 'evidence')
    expect(keys(items)).toEqual(before)
  })
})

describe('needListView', () => {
  it('searches the summary and the story text, and never changes the order', () => {
    const n01 = items.find((r) => r.key === '1-N01')!
    const word = [...n01.summary.text].slice(0, 4).join('')
    const shown = view({ q: word })
    expect(shown).toContain('1-N01')
    expect(shown).toEqual(view({}).filter((k) => shown.includes(k)))
    const story = n01.stories[0].want.text
    expect(view({ q: story })).toContain('1-N01')
    expect(view({ q: '火箭登月計畫' })).toEqual([])
  })

  it('filters, then searches, then sorts', () => {
    const shown = view({ issues: [1], sort: 'added' })
    expect(shown).toEqual(keys(sortNeeds(filterNeeds(items, { ...NO_FILTERS, issues: [1] }), 'added')))
  })
})

describe('the filter options', () => {
  it('offer only the space and 領域 types that a need has, in file order', () => {
    const spaces = needTypeOptions('space', index, items).map((t) => t.code)
    const all = index.spaceTypes.map((t) => t.code)
    expect(spaces).toEqual(all.filter((c) => spaces.includes(c)))
    expect(new Set(spaces)).toEqual(new Set(items.flatMap((r) => r.spaces)))
    expect(needTypeOptions('domain', index, items).length).toBeGreaterThan(0)
  })
})

describe('needsParams', () => {
  const params = (search: string, c: CrossIssueFile | null = cross) =>
    needsParams(new URLSearchParams(search), index, c, needListItems(issues, c))

  it('keeps a space that a need has, and drops the others with a replace', () => {
    expect(params('space=park')).toMatchObject({ spaces: ['park'], replace: false })
    expect(params('space=no-such-space')).toMatchObject({ spaces: [], replace: true })
  })

  it('ignores an old solution= like an unknown param: no filter and no replace (decision 223)', () => {
    const p = params('space=park&solution=2-S1')
    expect(p).toMatchObject({ spaces: ['park'], replace: false })
    expect(p).not.toHaveProperty('solutions')
    expect(listUrlSearch('needs', p)).toBe('?space=park')
  })

  it('drops issue=X (跨議題) when cross-issue.json does not exist', () => {
    expect(params('issue=X')).toMatchObject({ crossChoice: true, replace: false })
    expect(params('issue=X', null)).toMatchObject({ crossChoice: false, replace: true })
  })

  it('round-trips the whole state', () => {
    const search = '?q=x&sort=evidence&issue=X&issue=2&space=park&who=I06&priority=M&covered=yes&basis=1'
    const p = params(search.slice(1))
    expect(p.replace).toBe(false)
    expect(listUrlSearch('needs', p)).toBe(search)
  })
})
