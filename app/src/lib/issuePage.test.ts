import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile, Pending } from '@/types'
import {
  findIssue, ISSUE_TABS, legacyIssueTab, legacyIssueTabTarget, parseIssueNumber, parseTab, pendingBySection, storiesByPriority, tabPath,
} from './issuePage'

const index = indexJson as IndexFile
const trashcans = trashcansJson as IssueFile

describe('parseTab', () => {
  it('no tab is the overview', () => {
    expect(parseTab(undefined)).toBe('overview')
  })

  it('accepts every tab name', () => {
    expect(ISSUE_TABS).toEqual(['overview', 'wants', 'needs', 'solutions'])
    for (const tab of ISSUE_TABS) expect(parseTab(tab)).toBe(tab)
  })

  it('returns null for an unknown tab', () => {
    expect(parseTab('nope')).toBeNull()
    expect(parseTab('')).toBeNull()
    expect(parseTab('Overview')).toBeNull()
  })

  it('the old tab names are not tabs any more (they redirect)', () => {
    expect(parseTab('opinion')).toBeNull()
    expect(parseTab('conflicts')).toBeNull()
    expect(parseTab('stakeholders')).toBeNull()
  })
})

describe('tabPath', () => {
  it('the overview has no tab segment; other tabs have one', () => {
    expect(tabPath(2, 'overview')).toBe('/issues/2')
    expect(tabPath(2, 'wants')).toBe('/issues/2/wants')
    expect(tabPath(2, 'needs')).toBe('/issues/2/needs')
  })

  it('parseTab reads back every path', () => {
    for (const tab of ISSUE_TABS) expect(parseTab(tabPath(2, tab).split('/')[3])).toBe(tab)
  })
})

describe('legacyIssueTab', () => {
  it('maps each old tab to the new tab and the focus to add (design 3.2)', () => {
    expect(legacyIssueTab('opinion')).toEqual({ tab: 'wants', focus: null })
    expect(legacyIssueTab('conflicts')).toEqual({ tab: 'wants', focus: 'conflicts' })
    expect(legacyIssueTab('stakeholders')).toEqual({ tab: 'overview', focus: 'stakeholders' })
  })

  it('returns null for a current tab, no tab or an unknown name', () => {
    for (const tab of ISSUE_TABS) expect(legacyIssueTab(tab)).toBeNull()
    expect(legacyIssueTab(undefined)).toBeNull()
    expect(legacyIssueTab('nope')).toBeNull()
  })
})

describe('legacyIssueTabTarget', () => {
  it('opinion keeps the same query', () => {
    expect(legacyIssueTabTarget(2, 'opinion', '?pick=W08')).toEqual({ pathname: '/issues/2/wants', search: '?pick=W08' })
    expect(legacyIssueTabTarget(2, 'opinion', '')).toEqual({ pathname: '/issues/2/wants', search: '' })
  })

  it('conflicts goes to the 訴求 tab with focus=conflicts', () => {
    expect(legacyIssueTabTarget(2, 'conflicts', '')).toEqual({ pathname: '/issues/2/wants', search: '?focus=conflicts' })
    expect(legacyIssueTabTarget(2, 'conflicts', '?evidence=1')).toEqual({
      pathname: '/issues/2/wants',
      search: '?evidence=1&focus=conflicts',
    })
  })

  it('stakeholders goes to the overview with focus=stakeholders', () => {
    expect(legacyIssueTabTarget(2, 'stakeholders', '')).toEqual({ pathname: '/issues/2', search: '?focus=stakeholders' })
  })

  it('returns null when the segment is not an old tab', () => {
    expect(legacyIssueTabTarget(2, 'wants', '')).toBeNull()
    expect(legacyIssueTabTarget(2, undefined, '')).toBeNull()
  })
})

describe('parseIssueNumber', () => {
  it('reads a plain positive number', () => {
    expect(parseIssueNumber('2')).toBe(2)
    expect(parseIssueNumber('12')).toBe(12)
  })

  it('returns null for anything else', () => {
    for (const s of [undefined, '', '0', '02', '2.0', '-1', 'x']) expect(parseIssueNumber(s)).toBeNull()
  })
})

describe('findIssue', () => {
  it('finds an available issue', () => {
    const found = findIssue(index, '2')
    expect(found.kind).toBe('available')
    if (found.kind === 'available') expect(found.issue.folder).toBe('2-trashcans')
  })

  it('finds an issue without an analysis', () => {
    expect(findIssue(index, '3')).toMatchObject({ kind: 'unavailable', issue: { number: 3 } })
  })

  it('returns notFound for an unknown or bad number', () => {
    for (const n of ['99', '0', 'abc', '2.0', '02', '', undefined]) {
      expect(findIssue(index, n)).toEqual({ kind: 'notFound' })
    }
  })
})

describe('pendingBySection', () => {
  const groups = pendingBySection(trashcans.pending)

  it('groups by section, in the order of the first item of each section', () => {
    expect(groups.map((g) => g.section)).toEqual([
      '1.2 可能的輸入來源',
      '1.3 特別關注族群檢查',
      '步驟 2：初始使用者故事',
      '步驟 4：使用者故事總表',
      '6.1 候選解法',
      '6.3 成效衡量',
      '7.1 解法 A：清潔箱佈建建議地圖',
      '7.2 解法 B：滿溢回報與動態清運',
      '7.3 解法 C：找桶指引與開放資料更新',
      '7.4 解法 D：參與式選址流程',
      '7.5 解法 E：家用垃圾的彈性收集點（題目外的配套）',
      '資料比對注意事項',
    ])
  })

  it('keeps every item, also items with null context and repeated items', () => {
    expect(groups.flatMap((g) => g.items)).toHaveLength(trashcans.pending.length)
    const notes = groups.find((g) => g.section === '資料比對注意事項')
    expect(notes?.items).toEqual([
      { section: '資料比對注意事項', text: '【待補：環保局確認目前實際數量與兩份表的關係】', context: null },
    ])
    const b = groups.find((g) => g.section === '7.2 解法 B：滿溢回報與動態清運')
    expect(b?.items.map((i) => i.text)).toEqual(['【待補：現有系統資訊】', '【待補：市場詢價】', '【待補：市場詢價】'])
  })

  it('puts items of the same section together, also when they are apart in the list', () => {
    const list: Pending[] = [
      { section: 'X', text: '1', context: null },
      { section: null, text: '2', context: null },
      { section: 'X', text: '3', context: 'c' },
    ]
    expect(pendingBySection(list)).toEqual([
      { section: 'X', items: [list[0], list[2]] },
      { section: null, items: [list[1]] },
    ])
  })

  it('returns [] for no items', () => {
    expect(pendingBySection([])).toEqual([])
  })
})

describe('storiesByPriority', () => {
  const ids = (groups: ReturnType<typeof storiesByPriority>) =>
    groups.map((g) => [g.priority, g.stories.map((s) => s.id)])

  it('groups solution A of #2 in the order M, S and leaves out the empty C and W groups', () => {
    // A covers the Must needs N01, N04, N05, N07, O04-US02, O12-US01 and the
    // Should needs N02, O04-US04, I01-US09 (6.2 of #2). Stories keep the order of a.stories.
    const a = trashcans.solutions.find((s) => s.id === 'A')!
    expect(ids(storiesByPriority(trashcans, a.stories))).toEqual([
      ['M', [
        'I01-US01', 'I01-US03', 'I01-US04', 'I01-US05', 'I01-US06', 'I02-US01', 'I07-US01', 'I08-US01', 'I10-US01',
        'O04-US01', 'O04-US03', 'I01-US07', 'O05-US01', 'I09-US04', 'I09-US05', 'I06-US01', 'I07-US02', 'O04-US02', 'O12-US01',
      ]],
      ['S', ['O01-US01', 'O01-US02', 'O01-US03', 'O01-US04', 'O10-US01', 'O11-US01', 'I12-US01', 'O04-US04', 'I01-US09']],
    ])
  })

  it('has a W group when a W story is listed, and ignores unknown IDs', () => {
    const groups = storiesByPriority(trashcans, ['O09-US01', 'X99-US01', 'I06-US01'])
    expect(ids(groups)).toEqual([['M', ['I06-US01']], ['W', ['O09-US01']]])
  })

  it('returns [] for no stories', () => {
    expect(storiesByPriority(trashcans, [])).toEqual([])
  })
})
