import { describe, expect, it } from 'vitest'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IssueFile } from '@/types'
import { dataBasedPickList } from './dataBasis'
import { issueWants } from './wantList'
import { pickSearch, wantsTabView } from './wantsTab'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile

const keys = (list: { key: string }[]) => list.map((x) => x.key)
const conflictIds = (view: ReturnType<typeof wantsTabView>) => view.conflicts.map((c) => c.conflict.id)

describe('wantsTabView', () => {
  it('shows every want and every conflict with no filter (#2: 39 and 9)', () => {
    const view = wantsTabView(trashcans, null, false)
    expect(view.wants).toHaveLength(39)
    expect(keys(view.wants)).toEqual(keys(issueWants(trashcans)))
    expect(conflictIds(view)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'])
  })

  it('shows 2 wants (W08, W11) and 1 conflict (C6) for I06 in #2', () => {
    const view = wantsTabView(trashcans, 'I06', false)
    expect(keys(view.wants)).toEqual(['W08', 'W11'])
    expect(conflictIds(view)).toEqual(['C6'])
  })

  it('with a stakeholder filter, a want lists only the conflicts the tab shows', () => {
    // #1 W05 has a story of O07 and is in C6, but no story of O07 is on a
    // side of C6. So C6 is not on the tab with ?stakeholder=O07, and a link
    // 「有衝突：C6」 would point to nothing.
    const all = issueWants(trees).find((w) => w.key === 'W05')!
    expect(all.conflicts.map((c) => c.id)).toContain('C6')
    const view = wantsTabView(trees, 'O07', false)
    const shown = new Set(conflictIds(view))
    expect(shown.has('C6')).toBe(false)
    const w05 = view.wants.find((w) => w.key === 'W05')!
    expect(w05.conflicts.map((c) => c.id)).toEqual(all.conflicts.map((c) => c.id).filter((id) => shown.has(id)))
    // Without a filter, the want keeps all its conflicts.
    const w05All = wantsTabView(trees, null, false).wants.find((w) => w.key === 'W05')!
    expect(w05All.conflicts).toEqual(all.conflicts)
  })

  it('gives each conflict its stories, needs and way out', () => {
    const c1 = wantsTabView(trashcans, null, false).conflicts[0]
    expect(c1.needsA.map((n) => n.id)).toEqual(['N01'])
    expect(c1.needsB.map((n) => n.id)).toEqual(['N06'])
    expect(c1.wayOutSolutions.map((s) => s.id)).toEqual(['A', 'B', 'D'])
    expect(c1.hasWayOut).toBe(true)
  })

  it('keeps the wants with a data-based story when the data filter is on', () => {
    const all = issueWants(trashcans)
    const view = wantsTabView(trashcans, null, true)
    expect(keys(view.wants)).toEqual(keys(dataBasedPickList(all, trashcans.stories)))
    expect(view.wants.length).toBeLessThan(all.length)
    // The data filter does not hide a conflict. It only hides stories inside it.
    expect(view.conflicts).toHaveLength(9)
  })

  it('applies the stakeholder filter and the data filter together', () => {
    // O04 in #2 has 5 wants. Only W04 and O04-US04 have a story with a
    // [實證] or [AI整理] cell, so the two filters together keep those 2.
    expect(keys(wantsTabView(trashcans, 'O04', false).wants)).toEqual([
      'W04', 'O04-US01', 'O04-US02', 'O04-US03', 'O04-US04',
    ])
    expect(keys(wantsTabView(trashcans, 'O04', true).wants)).toEqual(['W04', 'O04-US04'])
    // The data filter alone keeps more wants than the two filters together.
    expect(wantsTabView(trashcans, null, true).wants.length).toBeGreaterThan(2)
  })

  it('works on #8 too: I06 has one want, W07 (its story I06-US01 is in W07)', () => {
    const view = wantsTabView(smokefree, 'I06', false)
    expect(keys(view.wants)).toEqual(['W07'])
    for (const w of view.wants) expect(w.stakeholders).toContain('I06')
  })
})

describe('pickSearch', () => {
  it('sets pick and keeps evidence and stakeholder', () => {
    const params = new URLSearchParams('evidence=1&stakeholder=I06&pick=W11&focus=C6')
    expect(pickSearch(params, 'W08')).toBe('?evidence=1&stakeholder=I06&pick=W08')
  })

  it('has only pick when nothing else is kept', () => {
    expect(pickSearch(new URLSearchParams('focus=W08'), 'W08')).toBe('?pick=W08')
  })
})
