import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile } from '@/types'
import { SUMMARY_TOPICS, parseSummaryRef, summaryRefTo } from './summary'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile

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
    for (const issue of [trees, trashcans, smokefree]) {
      expect(issue.summary.map((t) => t.topic)).toEqual([...SUMMARY_TOPICS])
    }
  })

  it('links every reference (build_json.py checks that each one exists)', () => {
    for (const issue of [trees, trashcans, smokefree]) {
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
