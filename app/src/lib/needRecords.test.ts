import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, CrossNeedGroup, CrossSolution, IssueFile } from '@/types'
import { compareIds } from './ids'
import { dataBasedNeeds, issueNeeds } from './needs'
import {
  crossGroupsOfNeed, needByKey, needHasDataBasis, needRecordKey, needRecords, needShare, parseNeedKey,
  type NeedRecord,
} from './needRecords'

const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile
const cross = crossJson as CrossIssueFile
// Not in number order on purpose: the list must sort by issue number.
const issues = [smokefree, trees, policy, trashcans]

const records = needRecords(issues, cross)
const rec = (key: string, list: NeedRecord[] = records): NeedRecord => {
  const r = list.find((x) => x.key === key)
  if (!r) throw new Error(`no record ${key}`)
  return r
}
const unique = <T,>(xs: T[]) => new Set(xs).size === xs.length

/** A copy of the cross-issue file with one more X-N group and one more
 * cross-issue solution that covers the group only through needs.crossIssue. */
function crossWith(group: CrossNeedGroup, solution: CrossSolution): CrossIssueFile {
  return { ...cross, needGroups: [...cross.needGroups, group], solutions: [...cross.solutions, solution] }
}
const baseGroup = cross.needGroups[0]
const baseSolution = cross.solutions[0]
// 8-I01-US11 has no issue solution, no cross-issue solution and no X-N group
// in the fixtures. These copies cover it only through the X-N group X-N10.
const groupX10: CrossNeedGroup = { ...baseGroup, id: 'X-N10', needs: [{ issue: 8, id: 'I01-US11', priority: 'C' }] }
const solutionX9: CrossSolution = {
  ...baseSolution,
  code: 'X-S9',
  spaces: ['crossing', 'sidewalk-furniture'],
  domains: ['transport'],
  needs: { must: [], shouldCould: [], crossIssue: ['X-N10'] },
}

describe('needRecordKey and parseNeedKey', () => {
  it('makes the key from the issue number and the need ID', () => {
    expect(needRecordKey(2, 'O04-US02')).toBe('2-O04-US02')
    expect(needRecordKey(1, 'N01')).toBe('1-N01')
  })

  it('reads the issue number and the need ID from a key', () => {
    expect(parseNeedKey('2-O04-US02')).toEqual({ issue: 2, id: 'O04-US02' })
    expect(parseNeedKey('1-N01')).toEqual({ issue: 1, id: 'N01' })
    expect(parseNeedKey('12-I69-US01')).toEqual({ issue: 12, id: 'I69-US01' })
  })

  it('gives null for text that is not a need key', () => {
    for (const text of ['', 'N01', '2-', '0-N01', '02-N01', 'X-N1', '2-S1', '2-O04', '2-n01', '2-N01-x', ' 2-N01']) {
      expect(parseNeedKey(text)).toBeNull()
    }
  })
})

describe('needRecords', () => {
  it('has one record per need of every issue, with a unique key', () => {
    const total = issues.reduce((sum, i) => sum + i.needs.length, 0)
    expect(records).toHaveLength(total)
    expect(unique(records.map((r) => r.key))).toBe(true)
  })

  it('orders by issue number, then need ID with the numeric compare', () => {
    const expected = [...records].sort((a, b) => a.issue - b.issue || compareIds(a.need.id, b.need.id))
    expect(records.map((r) => r.key)).toEqual(expected.map((r) => r.key))
    expect(records[0].key).toBe('1-O01-US02')
    expect(records.map((r) => r.issue)).toEqual([...records.map((r) => r.issue)].sort((a, b) => a - b))
  })

  it('keeps the same need ID in two issues as two records', () => {
    const a = rec('1-N01')
    const b = rec('2-N01')
    expect(a.issue).toBe(1)
    expect(b.issue).toBe(2)
    expect(a.need).toBe(trees.needs.find((n) => n.id === 'N01'))
    expect(b.need).toBe(trashcans.needs.find((n) => n.id === 'N01'))
    expect(a.stories.map((s) => s.id)).not.toEqual(b.stories.map((s) => s.id))
  })

  it('gives the need its dates from the issue JSON', () => {
    expect(typeof rec('2-N01').need.added).toBe('string')
    expect(typeof rec('2-N01').need.updated).toBe('string')
  })

  it('gives the stories of the need, in the order of the need', () => {
    const r = rec('2-N01')
    expect(r.stories.map((s) => s.id)).toEqual(r.need.stories)
  })

  it('gives the stakeholders of its stories, each once, in ID order', () => {
    expect(rec('2-N01').stakeholders).toEqual(['I01', 'I02', 'I07', 'I08', 'I10'])
    for (const r of records) {
      expect(r.stakeholders).toEqual([...new Set(r.stories.map((s) => s.stakeholder))].sort(compareIds))
    }
  })

  it('lists the issue solutions, then the cross-issue solutions, as keys in code order', () => {
    // 2-N01: issue solutions S1, S2, S3, S5; X-S4 and X-S5 list it in needs.must.
    expect(rec('2-N01').solutions).toEqual(['2-S1', '2-S2', '2-S3', '2-S5', 'X-S4', 'X-S5'])
  })

  it('counts a cross-issue solution that covers the need through an X-N group', () => {
    // 2-N10 is in X-N4. X-S4 lists X-N4 in needs.crossIssue.
    expect(cross.solutions.find((s) => s.code === 'X-S4')!.needs.crossIssue).toContain('X-N4')
    expect(rec('2-N10').solutions).toContain('X-S4')
  })

  it('covers a need only through an X-N group (decision 60)', () => {
    const list = needRecords(issues, crossWith(groupX10, solutionX9))
    const r = rec('8-I01-US11', list)
    expect(r.solutions).toEqual(['X-S9'])
    expect(r.crossGroups).toEqual(['X-N10'])
    expect(r.covered).toBe(true)
  })

  it('a need with no covering solution: not covered, but it has its issue 空間 and 領域', () => {
    const r = rec('8-I01-US11')
    expect(r.solutions).toEqual([])
    expect(r.covered).toBe(false)
    expect(r.spaces).toEqual(smokefree.spaces)
    expect(r.domains).toEqual(smokefree.domains)
  })

  it('a W need is not covered', () => {
    const r = rec('2-O09-US01')
    expect(r.need.priority).toBe('W')
    expect(r.covered).toBe(false)
  })

  it('a W need is not covered, even when a solution lists it', () => {
    const withW: IssueFile = {
      ...trashcans,
      solutions: trashcans.solutions.map((s) =>
        s.id === 'S1' && s.needs ? { ...s, needs: { ...s.needs, shouldCould: [...s.needs.shouldCould, 'O09-US01'] } } : s,
      ),
    }
    const r = rec('2-O09-US01', needRecords([withW], cross))
    expect(r.solutions).toEqual(['2-S1'])
    expect(r.covered).toBe(false)
  })

  it('a need with a solution that is not W is covered', () => {
    expect(rec('2-N01').covered).toBe(true)
  })

  it('空間 and 領域: the issue values first, then the values of the covering solutions, each once', () => {
    const r = rec('2-N01')
    expect(r.spaces.slice(0, trashcans.spaces.length)).toEqual(trashcans.spaces)
    expect(unique(r.spaces)).toBe(true)
    const solSpaces = [
      ...trashcans.solutions.filter((s) => ['S1', 'S2', 'S3', 'S5'].includes(s.id)).flatMap((s) => s.spaces),
      ...cross.solutions.filter((s) => ['X-S4', 'X-S5'].includes(s.code)).flatMap((s) => s.spaces),
    ]
    expect(new Set(r.spaces)).toEqual(new Set([...trashcans.spaces, ...solSpaces]))
    expect(r.domains.slice(0, trashcans.domains.length)).toEqual(trashcans.domains)
    expect(unique(r.domains)).toBe(true)
  })

  it('空間 and 領域 include the values of a cross-issue solution through an X-N group', () => {
    const r = rec('8-I01-US11', needRecords(issues, crossWith(groupX10, solutionX9)))
    expect(r.spaces).toEqual([...smokefree.spaces, 'crossing'])
    expect(r.domains).toEqual([...smokefree.domains, 'transport'])
  })

  it('gives the X-N group of a need', () => {
    expect(rec('2-N05').crossGroups).toEqual(['X-N1'])
    expect(rec('9-N01').crossGroups).toEqual(['X-N4'])
    expect(rec('2-N02').crossGroups).toEqual([])
  })

  it('gives every X-N group when the data has two, in code order', () => {
    const second: CrossNeedGroup = { ...baseGroup, id: 'X-N10', needs: [{ issue: 2, id: 'N05', priority: 'M' }] }
    const twice = { ...cross, needGroups: [second, ...cross.needGroups] }
    expect(rec('2-N05', needRecords(issues, twice)).crossGroups).toEqual(['X-N1', 'X-N10'])
    expect(crossGroupsOfNeed(twice, 2, 'N05').map((g) => g.id)).toEqual(['X-N1', 'X-N10'])
  })

  it('without cross-issue.json: no X- solutions and no X-N groups', () => {
    const r = rec('2-N01', needRecords(issues, null))
    expect(r.solutions).toEqual(['2-S1', '2-S2', '2-S3', '2-S5'])
    expect(r.crossGroups).toEqual([])
  })

  it('cells: the 我想要… and 以便… cells of its stories, each story once', () => {
    for (const r of records) {
      const c = r.cells
      expect(c.evidence + c.aiSummary + c.aiSimulated + c.pending).toBe(2 * r.stories.length)
    }
    expect(rec('8-I01-US11').cells).toEqual({ evidence: 2, aiSummary: 0, aiSimulated: 0, pending: 0 })
    expect(rec('2-O09-US01').cells).toEqual({ evidence: 0, aiSummary: 0, aiSimulated: 2, pending: 0 })
  })
})

describe('needShare (資料根據比例)', () => {
  it('is the cells tagged 實證 or AI整理, of all cells of its stories', () => {
    expect(needShare(rec('8-I01-US11'))).toEqual({ part: 2, total: 2 })
    expect(needShare(rec('2-O09-US01'))).toEqual({ part: 0, total: 2 })
    const r = rec('2-N01')
    expect(needShare(r)).toEqual({ part: r.cells.evidence + r.cells.aiSummary, total: 2 * r.stories.length })
  })
})

describe('needHasDataBasis (只看有資料根據)', () => {
  it('is true when a 以便… cell is tagged 實證 or AI整理, false when every cell is AI模擬', () => {
    expect(needHasDataBasis(rec('8-I01-US11'))).toBe(true)
    expect(needHasDataBasis(rec('2-O09-US01'))).toBe(false)
  })

  it('checks only the 以便… cell, not the 我想要… cell', () => {
    const r = rec('2-O09-US01')
    const story = r.stories[0]
    const wantOnly = { ...story, want: { ...story.want, tag: 'AI整理' as const } }
    expect(needHasDataBasis({ ...r, stories: [wantOnly] })).toBe(false)
    const soThatEvidence = { ...story, soThat: { ...story.soThat, tag: '實證' as const } }
    expect(needHasDataBasis({ ...r, stories: [soThatEvidence] })).toBe(true)
    const soThatSummary = { ...story, soThat: { ...story.soThat, tag: 'AI整理' as const } }
    expect(needHasDataBasis({ ...r, stories: [soThatSummary] })).toBe(true)
  })

  it('shows or hides each need the same way as the issue 需求 tab (dataBasedNeeds)', () => {
    for (const issue of issues) {
      const tab = new Set(dataBasedNeeds(issueNeeds(issue)).map((i) => i.need.id))
      for (const r of records.filter((x) => x.issue === issue.number)) {
        expect(needHasDataBasis(r)).toBe(tab.has(r.need.id))
      }
    }
  })

  it('a need with a data-based 我想要… cell but no data-based 以便… cell is hidden, but its share still counts both cells', () => {
    // A fixture need may not have this mix, so build one.
    const r = rec('2-O09-US01')
    const story = { ...r.stories[0], want: { ...r.stories[0].want, tag: '實證' as const } }
    const issue: IssueFile = { ...trashcans, stories: trashcans.stories.map((s) => (s.id === story.id ? story : s)) }
    const mixed = rec('2-O09-US01', needRecords([issue], cross))
    expect(needHasDataBasis(mixed)).toBe(false)
    expect(needShare(mixed)).toEqual({ part: 1, total: 2 })
  })

  it('does not hide every need', () => {
    const shown = records.filter(needHasDataBasis)
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(records.length)
  })
})

describe('needByKey', () => {
  it('gives the same record as the list', () => {
    expect(needByKey(issues, cross, '2-O04-US02')).toEqual(rec('2-O04-US02'))
    expect(needByKey(issues, cross, '1-N01')).toEqual(rec('1-N01'))
  })

  it('gives null for an unknown key, an unknown issue or text that is not a key', () => {
    expect(needByKey(issues, cross, '2-N99')).toBeNull()
    expect(needByKey(issues, cross, '7-N01')).toBeNull()
    expect(needByKey(issues, cross, 'N01')).toBeNull()
  })
})
