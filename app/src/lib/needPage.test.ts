import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, IssueFile } from '@/types'
import { NEED_TABS, needPath, parseNeedTab } from './entityPaths'
import { needPageTabs, needPageView, needTabCounts, type NeedPageView } from './needPage'

const cross = crossJson as CrossIssueFile
const issues = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]

const view = (key: string, c: CrossIssueFile | null = cross): NeedPageView => {
  const v = needPageView(issues, c, key)
  if (v === null) throw new Error(`no need ${key}`)
  return v
}
const codes = (v: NeedPageView) =>
  v.solutionGroups.map((g) => [g.part, [...g.issue.map((s) => s.id), ...g.cross.map((s) => s.code)]])

describe('need page paths', () => {
  it('has the tabs in the order of the plan', () => {
    expect(NEED_TABS).toEqual(['overview', 'stories', 'stakeholders', 'solutions', 'conflicts', 'same-needs'])
  })

  it('builds the tab paths; the overview has no tab segment', () => {
    expect(needPath('1-N01')).toBe('/needs/1-N01')
    expect(needPath('1-N01', 'overview')).toBe('/needs/1-N01')
    expect(needPath('2-O04-US02', 'stories')).toBe('/needs/2-O04-US02/stories')
    expect(needPath('2-N07', 'same-needs')).toBe('/needs/2-N07/same-needs')
  })

  it('reads the tab of the URL; an unknown name is null', () => {
    expect(parseNeedTab(undefined)).toBe('overview')
    expect(parseNeedTab('conflicts')).toBe('conflicts')
    expect(parseNeedTab('wants')).toBeNull()
  })
})

describe('needPageView', () => {
  it('is null for an unknown or a malformed key', () => {
    expect(needPageView(issues, cross, '2-N99')).toBeNull()
    expect(needPageView(issues, cross, '7-N01')).toBeNull()
    expect(needPageView(issues, cross, 'N01')).toBeNull()
    expect(needPageView(issues, cross, '02-N01')).toBeNull()
    expect(needPageView(issues, cross, '2-n01')).toBeNull()
  })

  it('gives two different needs for the same ID in two issues', () => {
    const a = view('1-N01')
    const b = view('2-N01')
    expect(a.issue.number).toBe(1)
    expect(b.issue.number).toBe(2)
    expect(a.item.summary.text).not.toBe(b.item.summary.text)
  })

  it('lists the issue conflicts with the need in needsA or needsB, in file order', () => {
    const v = view('2-N01')
    const expected = (trashcansJson as IssueFile).conflicts
      .filter((c) => c.needsA.includes('N01') || c.needsB.includes('N01'))
      .map((c) => c.id)
    expect(expected.length).toBeGreaterThan(0)
    expect(v.issueConflicts.map((c) => c.conflict.id)).toEqual(expected)
  })

  it('lists the cross-issue conflicts that name the need', () => {
    expect(view('2-N01').crossConflicts.map((c) => c.conflict.id)).toEqual(['X-C1', 'X-C2'])
  })

  it('lists a cross-issue conflict that names its X-N group (2-N07 is in X-N2)', () => {
    expect(view('2-N07').crossConflicts.map((c) => c.conflict.id)).toEqual(['X-C1'])
    // Without cross-issue.json there is no cross-issue part.
    expect(view('2-N07', null).crossConflicts).toEqual([])
    expect(view('2-N07', null).sameNeeds).toEqual([])
  })

  it('lists the other needs of its X-N group, in issue and ID order', () => {
    const v = view('2-N07')
    expect(v.sameNeeds.map((g) => g.group.id)).toEqual(['X-N2'])
    expect(v.sameNeeds[0].needs.map((n) => n.key)).toEqual(['1-N08', '8-I06-US01'])
  })

  it('groups the solutions by part, the issue solutions before the X- solutions', () => {
    // 1-N06: X-S1 covers it only through its group X-N7.
    const groups = codes(view('1-N06'))
    expect(groups.at(-1)).toEqual(['crossIssue', ['X-S1']])
    // 2-N05: X-S1 lists it in needs.must.
    const must = codes(view('2-N05')).find(([part]) => part === 'must')
    expect(must?.[1]).toContain('X-S1')
    const list = must?.[1] as string[]
    expect(list.findIndex((c) => c.startsWith('X-'))).toBeGreaterThan(list.findIndex((c) => !c.startsWith('X-')))
  })

  it('has the same solutions as the need record', () => {
    for (const key of ['1-N01', '2-N05', '2-N06', '1-N06', '8-N07']) {
      const v = view(key)
      const shown = v.solutionGroups.flatMap((g) => [...g.issue.map((s) => `${v.issue.number}-${s.id}`), ...g.cross.map((s) => s.code)])
      expect(new Set(shown)).toEqual(new Set(v.item.solutions))
    }
  })
})

describe('the tabs of a need', () => {
  it('leaves out a tab with no content and keeps the order', () => {
    // 8-I01-US11 has no solution, no conflict and no X-N group.
    const tabs = needPageTabs(needTabCounts(view('8-I01-US11')))
    expect(tabs).toEqual(['overview', 'stories', 'stakeholders'])
  })

  it('a W need (2-O09-US01) has no 解法 tab', () => {
    const v = view('2-O09-US01')
    expect(v.item.need.priority).toBe('W')
    expect(needPageTabs(needTabCounts(v))).not.toContain('solutions')
  })

  it('a need with an X-N group has 其他議題的相同需求', () => {
    const counts = needTabCounts(view('2-N07'))
    expect(counts['same-needs']).toBe(2)
    expect(needPageTabs(counts)).toContain('same-needs')
  })

  it('counts the issue and the cross-issue conflicts', () => {
    const v = view('2-N01')
    expect(needTabCounts(v).conflicts).toBe(v.issueConflicts.length + 2)
  })
})
