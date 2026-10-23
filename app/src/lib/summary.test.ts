import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IssueFile, SummaryItem } from '@/types'
import { SUMMARY_TABS } from './issuePage'
import {
  SUMMARY_TOPIC_KEYS, SUMMARY_TOPICS, parseSummaryRef, summaryGroupTag, summaryItemsOf, summaryItemsShown, summaryRefTo,
  summaryTabCount, summaryTabCounts, summaryTopicOf, crossSummaryRefTo, unlinkedSummaryTopics,
} from './summary'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile

describe('parseSummaryRef', () => {
  it('reads each kind of reference', () => {
    expect(parseSummaryRef('I01-US09')).toEqual({ issue: null, kind: 'story', id: 'I01-US09' })
    expect(parseSummaryRef('I05')).toEqual({ issue: null, kind: 'stakeholder', id: 'I05' })
    expect(parseSummaryRef('C9')).toEqual({ issue: null, kind: 'conflict', id: 'C9' })
    expect(parseSummaryRef('W08')).toEqual({ issue: null, kind: 'group', id: 'W08' })
    expect(parseSummaryRef('N01')).toEqual({ issue: null, kind: 'need', id: 'N01' })
    expect(parseSummaryRef('解法 A')).toEqual({ issue: null, kind: 'solution', id: 'A' })
  })

  it('reads a reference to another issue', () => {
    expect(parseSummaryRef('#8 解法 B')).toEqual({ issue: 8, kind: 'solution', id: 'B' })
    expect(parseSummaryRef('#1 C7')).toEqual({ issue: 1, kind: 'conflict', id: 'C7' })
    expect(parseSummaryRef('#1 N03')).toEqual({ issue: 1, kind: 'need', id: 'N03' })
  })

  it('returns null for text that is not a reference', () => {
    for (const bad of ['解法A', 'A', '#8解法 B', 'C5，O01-US02', 'N1', 'N001', '']) expect(parseSummaryRef(bad)).toBeNull()
  })
})

describe('summaryRefTo', () => {
  it('links a story to its story page', () => {
    expect(summaryRefTo('I06-US01', 2, trashcans, false)).toEqual({
      pathname: '/stakeholders/I06/stories/2/I06-US01',
      search: '',
    })
    expect(summaryRefTo('I01-US09', 2, trashcans, true)).toEqual({
      pathname: '/stakeholders/I01/stories/2/I01-US09',
      search: '',
    })
  })

  it('links a group to the opinion check', () => {
    expect(summaryRefTo('W08', 2, trashcans, false)).toEqual({ pathname: '/issues/2/wants', search: '?pick=W08' })
  })

  it('links a W group in each fixture that has one to the opinion check', () => {
    // Only #2 has W refs in its summary now. #1 and #8 refer to N groups.
    const wRefs = (issue: IssueFile) =>
      issue.summary.flatMap((t) => t.items.flatMap((i) => i.refs)).filter((r) => /^W\d\d$/.test(r))
    expect(wRefs(trees)).toEqual([])
    expect(wRefs(smokefree)).toEqual([])
    expect(wRefs(trashcans)).toEqual(['W08'])
    for (const ref of wRefs(trashcans)) {
      expect(summaryRefTo(ref, 2, trashcans, false)).toEqual({ pathname: '/issues/2/wants', search: `?pick=${ref}` })
    }
  })

  it('links an N group to the 需求 tab with ?focus=, keeping the filter', () => {
    expect(summaryRefTo('N01', 2, trashcans, false)).toEqual({ pathname: '/issues/2/needs', search: '?focus=N01' })
    expect(summaryRefTo('N01', 2, trashcans, true)).toEqual({ pathname: '/issues/2/needs', search: '?focus=N01&evidence=1' })
    expect(summaryRefTo('N09', 8, smokefree, false)).toEqual({ pathname: '/issues/8/needs', search: '?focus=N09' })
  })

  it('returns null for an N group that is not in the issue', () => {
    // #2 has N01 to N10.
    expect(summaryRefTo('N11', 2, trashcans, false)).toBeNull()
    expect(summaryRefTo('N99', 2, trashcans, false)).toBeNull()
  })

  it('links a stakeholder to the stakeholder page', () => {
    expect(summaryRefTo('I05', 2, trashcans, true)).toEqual({ pathname: '/stakeholders/I05', search: '' })
  })

  it('links a conflict to the 訴求 tab with ?focus= and a solution to its page, keeping the filter', () => {
    expect(summaryRefTo('C9', 2, trashcans, false)).toEqual({ pathname: '/issues/2/wants', search: '?focus=C9' })
    expect(summaryRefTo('C9', 2, trashcans, true)).toEqual({ pathname: '/issues/2/wants', search: '?focus=C9&evidence=1' })
    expect(summaryRefTo('解法 E', 2, trashcans, false)).toEqual({ pathname: '/solutions/2-E', search: '' })
    expect(summaryRefTo('解法 E', 2, trashcans, true)).toEqual({ pathname: '/solutions/2-E', search: '?evidence=1' })
  })

  it('links a reference to another issue into that issue', () => {
    expect(summaryRefTo('#8 解法 B', 2, trashcans, false)).toEqual({ pathname: '/solutions/8-B', search: '' })
    expect(summaryRefTo('#1 C7', 2, trashcans, false)).toEqual({ pathname: '/issues/1/wants', search: '?focus=C7' })
    expect(summaryRefTo('#1 I06-US02', 2, trashcans, false)).toEqual({
      pathname: '/stakeholders/I06/stories/1/I06-US02',
      search: '',
    })
    expect(summaryRefTo('#8 I06-US01', 2, trashcans, false)).toEqual({
      pathname: '/stakeholders/I06/stories/8/I06-US01',
      search: '',
    })
    expect(summaryRefTo('#1 W08', 2, trashcans, true)).toEqual({ pathname: '/issues/1/wants', search: '?pick=W08&evidence=1' })
    expect(summaryRefTo('#8 I25', 2, trashcans, false)).toEqual({ pathname: '/stakeholders/I25', search: '' })
    expect(summaryRefTo('#1 N03', 2, trashcans, false)).toEqual({ pathname: '/issues/1/needs', search: '?focus=N03' })
    expect(summaryRefTo('#1 N03', 2, trashcans, true)).toEqual({ pathname: '/issues/1/needs', search: '?focus=N03&evidence=1' })
  })

  it('returns null for an unknown ID or text that is not a reference', () => {
    expect(summaryRefTo('C99', 2, trashcans, false)).toBeNull()
    expect(summaryRefTo('解法 Z', 2, trashcans, false)).toBeNull()
    expect(summaryRefTo('I01-US99', 2, trashcans, false)).toBeNull()
    expect(summaryRefTo('相關', 2, trashcans, false)).toBeNull()
  })
})

describe('the summary in the fixtures', () => {
  it('has the 5 topics in the fixed order in every issue', () => {
    for (const issue of [trees, trashcans, smokefree, policy]) {
      expect(issue.summary.map((t) => t.topic)).toEqual([...SUMMARY_TOPICS])
    }
  })

  it('links every reference (build_json.py checks that each one exists)', () => {
    for (const issue of [trees, trashcans, smokefree, policy]) {
      for (const topic of issue.summary) {
        for (const item of topic.items) {
          for (const ref of item.refs) expect(summaryRefTo(ref, issue.number, issue, false), ref).not.toBeNull()
        }
      }
    }
  })

  it('shows the new #2 conflict C9 with #8 解法 B', () => {
    const topic = trashcans.summary.find((t) => t.topic === '可能的爭議')
    const item = topic?.items.find((i) => i.refs.includes('C9'))
    expect(item?.refs).toContain('#8 解法 B')
    expect(item?.text.tag).toBe('AI模擬')
  })
})

// The 分析摘要 topic tabs of the issue page (ETBlue, 2026-10-22; decision 102).
describe('summaryTopicOf', () => {
  it('maps the five keys to the five topics, in the same order', () => {
    expect(SUMMARY_TOPIC_KEYS.map(summaryTopicOf)).toEqual([...SUMMARY_TOPICS])
    expect(summaryTopicOf('dependencies')).toBe('相依事項與現行政策的關係')
    expect(summaryTopicOf('disadvantaged')).toBe('受影響較大的弱勢族群')
  })

  it('the topic tab 難以取捨 is a key too (the other topics are not tabs, decisions 109 and 140)', () => {
    expect(SUMMARY_TABS.every((tab) => (SUMMARY_TOPIC_KEYS as readonly string[]).includes(tab))).toBe(true)
    expect(SUMMARY_TABS).not.toContain('disadvantaged')
  })
})

describe('summaryGroupTag', () => {
  it('drops the note in full-width brackets at the end', () => {
    expect(summaryGroupTag({ item: '呼吸道疾病（尚未納入）' })).toBe('呼吸道疾病')
    expect(summaryGroupTag({ item: '高齡' })).toBe('高齡')
    expect(summaryGroupTag({ item: '兒童與照顧者' })).toBe('兒童與照顧者')
  })
})

describe('summaryTabCounts', () => {
  it('counts the rows of each topic', () => {
    expect(summaryTabCounts(smokefree)).toEqual({ decisions: 4, controversies: 5, disadvantaged: 6, legal: 6, dependencies: 2 })
    expect(summaryTabCounts(policy)).toEqual({ decisions: 6, controversies: 5, disadvantaged: 6, legal: 6, dependencies: 0 })
  })

  it('does not count the 【待補】 rows of 受影響較大的弱勢族群', () => {
    // #1 has 6 rows; 呼吸道疾病（尚未納入） and 外籍（尚未納入） are 【待補】.
    expect(summaryItemsOf(trees, 'disadvantaged')).toHaveLength(6)
    expect(summaryItemsOf(trees, 'disadvantaged').filter((i) => i.text.pending).map((i) => i.item))
      .toEqual(['呼吸道疾病（尚未納入）', '外籍（尚未納入）'])
    expect(summaryTabCounts(trees)).toEqual({ decisions: 5, controversies: 5, disadvantaged: 4, legal: 5, dependencies: 0 })
    // #2 has 6 rows; 呼吸道疾病（尚未納入） is 【待補】.
    expect(summaryTabCounts(trashcans)).toEqual({ decisions: 4, controversies: 5, disadvantaged: 5, legal: 4, dependencies: 2 })
  })

  it('counts a filled row and leaves out a 【待補】 row', () => {
    const row = (item: string, pending: boolean): SummaryItem => ({
      item,
      text: pending ? { text: '【待補：…】', tag: null, pending: true } : { text: '說明', tag: 'AI模擬', pending: false },
      refs: [],
      solutions: [],
    })
    const issue = {
      summary: [{ topic: '受影響較大的弱勢族群', items: [row('高齡', false), row('外籍（尚未納入）', true), row('兒童', false)] }],
    }
    expect(summaryTabCount(issue, 'disadvantaged')).toBe(2)
    expect(summaryItemsOf(issue, 'disadvantaged')).toHaveLength(3)
  })

  it('gives 0 and no rows for a topic the file does not have', () => {
    expect(summaryTabCount({ summary: [] }, 'legal')).toBe(0)
    expect(summaryItemsOf({ summary: [] }, 'legal')).toEqual([])
  })
})

describe('summaryItemsShown', () => {
  const row = (item: string, tag: SummaryItem['text']['tag']): SummaryItem => ({
    item,
    text: tag === null ? { text: '【待補：…】', tag: null, pending: true } : { text: '說明', tag, pending: false },
    refs: [],
    solutions: [],
  })
  const items = [row('a', 'AI模擬'), row('b', '實證'), row('c', null), row('d', 'AI整理'), row('e', 'AI模擬')]

  it('returns every row when the filter is off', () => {
    expect(summaryItemsShown(items, false)).toBe(items)
  })

  it('keeps only [實證] and [AI整理] rows, in file order, when the filter is on', () => {
    expect(summaryItemsShown(items, true).map((i) => i.item)).toEqual(['b', 'd'])
  })

  it('hides every row of #1 and #2 (all [AI模擬] or 【待補】)', () => {
    for (const issue of [trees, trashcans]) {
      for (const key of SUMMARY_TOPIC_KEYS) expect(summaryItemsShown(summaryItemsOf(issue, key), true)).toEqual([])
    }
  })
})

// The 分析摘要 rows that name no solution go to the issue 總覽 (ETBlue, 2026-10-23; decision 140).
describe('unlinkedSummaryTopics', () => {
  it('gives the rows of 可能的爭議, 法規上的障礙 and 相依事項 that name no solution, in topic order (#8)', () => {
    const topics = unlinkedSummaryTopics(smokefree)
    expect(topics.map((t) => t.key)).toEqual(['legal', 'dependencies'])
    expect(topics.map((t) => t.topic)).toEqual(['法規上的障礙', '相依事項與現行政策的關係'])
    expect(topics[0].items.map((i) => i.item)).toEqual(['允許電子煙需要修改國家的法律'])
    expect(topics[1].items.map((i) => i.item)).toEqual(['政策的階段', '和 #1、#2 共用人行道'])
    for (const t of topics) for (const i of t.items) expect(i.solutions).toEqual([])
  })

  it('leaves out 難以取捨 and 受影響較大的弱勢族群, also when their rows name no solution (#2)', () => {
    // #2 has a 難以取捨 row and six 弱勢 rows with no solution; they stay on their tabs.
    expect(summaryItemsOf(trashcans, 'decisions').some((i) => i.solutions.length === 0)).toBe(true)
    expect(summaryItemsOf(trashcans, 'disadvantaged').every((i) => i.solutions.length === 0)).toBe(true)
    expect(unlinkedSummaryTopics(trashcans).map((t) => t.key)).toEqual(['dependencies'])
  })

  it('gives nothing when every row names a solution (#1)', () => {
    expect(unlinkedSummaryTopics(trees)).toEqual([])
  })
})

describe('crossSummaryRefTo (decision 140)', () => {
  const ids = new Set(['I05', 'O28'])

  it('links a cross-issue solution and keeps ?evidence=1', () => {
    expect(crossSummaryRefTo('解法 X-A', ids, false)).toEqual({ pathname: '/solutions/X-A', search: '' })
    expect(crossSummaryRefTo('解法 X-A', ids, true)).toEqual({ pathname: '/solutions/X-A', search: '?evidence=1' })
  })

  it('links an ID of one issue the same way as the issue page', () => {
    expect(crossSummaryRefTo('#1 解法 C', ids, false)).toEqual({ pathname: '/solutions/1-C', search: '' })
    expect(crossSummaryRefTo('#8 I25-US01', ids, false)?.pathname).toBe('/stakeholders/I25/stories/8/I25-US01')
    expect(crossSummaryRefTo('#2 C6', ids, true)).toEqual(summaryRefTo('#2 C6', 1, trees, true))
  })

  it('links a known stakeholder; an X-N group, an X-C conflict or an unknown ID stays plain text', () => {
    expect(crossSummaryRefTo('O28', ids, false)).toEqual({ pathname: '/stakeholders/O28', search: '' })
    for (const ref of ['I99', 'X-N01', 'X-C1', 'C6', '解法 A', 'nonsense']) expect(crossSummaryRefTo(ref, ids, false), ref).toBeNull()
  })
})
