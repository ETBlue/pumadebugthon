import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile, Pending } from '@/types'
import {
  findIssue, ISSUE_TABS, isSummaryTab, parseIssueNumber, parseTab, pendingBySection, tabPath,
} from './issuePage'

const index = indexJson as IndexFile
const trashcans = trashcansJson as IssueFile

describe('parseTab', () => {
  it('no tab is the overview', () => {
    expect(parseTab(undefined)).toBe('overview')
  })

  it('accepts every tab name: seven tabs, 利害關係人 right after 總覽 (decision 116), 衝突 after 需求 (decision 142), 難以取捨 before 解法 (decision 140)', () => {
    expect(ISSUE_TABS).toEqual(['overview', 'stakeholders', 'wants', 'needs', 'conflicts', 'decisions', 'solutions'])
    for (const tab of ISSUE_TABS) expect(parseTab(tab)).toBe(tab)
  })

  it('難以取捨 is the only 分析摘要 tab (decisions 102 and 140); 利害關係人 is not one (decision 109)', () => {
    expect(ISSUE_TABS.filter(isSummaryTab)).toEqual(['decisions'])
    expect(isSummaryTab('stakeholders')).toBe(false)
    expect(tabPath(1, 'stakeholders')).toBe('/issues/1/stakeholders')
    expect(isSummaryTab('overview')).toBe(false)
    expect(isSummaryTab('solutions')).toBe(false)
    expect(tabPath(2, 'decisions')).toBe('/issues/2/decisions')
  })

  it('the removed tabs 可能爭議, 法規障礙 and 相關解法與政策 are not tabs (decision 140)', () => {
    for (const tab of ['controversies', 'legal', 'dependencies']) expect(parseTab(tab), tab).toBeNull()
  })

  it('returns null for an unknown tab', () => {
    expect(parseTab('nope')).toBeNull()
    expect(parseTab('')).toBeNull()
    expect(parseTab('Overview')).toBeNull()
  })

  it('the old tab names are not tabs (they show 「tab not found」)', () => {
    expect(parseTab('opinion')).toBeNull()
    expect(parseTab('disadvantaged')).toBeNull()
  })

  it('conflicts is a tab again, right after needs (decision 142)', () => {
    expect(parseTab('conflicts')).toBe('conflicts')
    expect(ISSUE_TABS.indexOf('conflicts')).toBe(ISSUE_TABS.indexOf('needs') + 1)
  })

  it('stakeholders is a tab again (decision 109)', () => {
    expect(parseTab('stakeholders')).toBe('stakeholders')
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
      '6.4 衝突與以需求為本的解方',
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
    expect(b?.items.map((i) => i.text)).toEqual([
      '【待補：現有系統資訊】',
      '【待補：查證規定的名稱、內容，以及是否適用於市府的 IoT 設備】',
      '【待補：這份計畫是 1994 年的版本，查證環保局現行的做法，以及是否有較新的災後清運規定】',
      '【待補：市場詢價】',
      '【待補：市場詢價】',
    ])
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
