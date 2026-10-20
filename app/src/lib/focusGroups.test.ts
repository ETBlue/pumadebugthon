import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile, IssueSummary } from '@/types'
import { focusGapsText, focusRows } from './focusGroups'
import { FOCUS_ORDER } from './issues'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile

describe('focusRows', () => {
  it('has all 6 groups, always in the fixed order', () => {
    for (const issue of [trees, trashcans, smokefree, policy]) {
      expect(focusRows(issue, index.stakeholders).map((r) => r.tag)).toEqual([...FOCUS_ORDER])
    }
  })

  it('keeps the fixed order when the file lists the groups in another order', () => {
    const shuffled = { ...trees, focusGroups: [...trees.focusGroups].reverse() }
    expect(focusRows(shuffled, index.stakeholders).map((r) => r.tag)).toEqual([...FOCUS_ORDER])
  })

  it('gives the stakeholders, the stories and the 資料根據 of each group in #1', () => {
    const rows = focusRows(trees, index.stakeholders)
    expect(rows.map((r) => [r.tag, r.stakeholders.map((s) => s.id), r.stories, r.included])).toEqual([
      ['高齡', ['I05'], 2, true],
      ['身心障礙', ['I06'], 2, true],
      ['呼吸道疾病', [], 0, false],
      ['兒童與照顧者', ['I07', 'I16'], 4, true],
      ['外籍', [], 0, false],
      ['經濟弱勢', ['I19'], 1, true],
    ])
    expect(rows[0].stakeholders[0]).toEqual({ id: 'I05', name: '高齡者' })
    // Two cells per story (我想要… and 以便…).
    for (const r of rows) {
      const c = r.cells
      expect(c.evidence + c.aiSummary + c.aiSimulated + c.pending).toBe(2 * r.stories)
    }
    expect(rows[2].note?.text).toBe('【待補：本議題是否需要納入過敏或呼吸道疾病者的觀點】')
    expect(rows[2].note?.pending).toBe(true)
    expect(rows[0].note).toBeNull()
  })

  it('counts a story once, also when its stakeholder is in two groups (I11 in #2)', () => {
    const rows = focusRows(trashcans, index.stakeholders)
    const old = rows.find((r) => r.tag === '高齡')
    const poor = rows.find((r) => r.tag === '經濟弱勢')
    expect(old?.stakeholders.map((s) => s.id)).toEqual(['I05', 'I11'])
    expect(old?.stories).toBe(2)
    expect(poor?.stories).toBe(1)
  })

  it('counts a story once within one group, also if an ID is listed twice', () => {
    const doubled = {
      ...trees,
      focusGroups: trees.focusGroups.map((g) => (g.tag === '高齡' ? { ...g, stakeholders: ['I05', 'I05'] } : g)),
    }
    const old = focusRows(doubled, index.stakeholders).find((r) => r.tag === '高齡')
    expect(old?.stories).toBe(2)
    expect(old?.stakeholders.map((s) => s.id)).toEqual(['I05'])
  })

  it('#8 includes every group', () => {
    expect(focusRows(smokefree, index.stakeholders).every((r) => r.included)).toBe(true)
  })

  it('#9 includes every group, with I27 and I35 for 呼吸道疾病 and 兒童與照顧者', () => {
    const rows = focusRows(policy, index.stakeholders)
    expect(rows.every((r) => r.included)).toBe(true)
    expect(rows.find((r) => r.tag === '呼吸道疾病')?.stakeholders.map((s) => s.id)).toEqual(['I27'])
    expect(rows.find((r) => r.tag === '兒童與照顧者')?.stakeholders.map((s) => s.id)).toEqual(['I35'])
  })
})

describe('focusGapsText', () => {
  const summary = (n: number) => index.issues.find((i) => i.number === n) as IssueSummary

  it('lists the groups not included yet, in the fixed order', () => {
    expect(focusGapsText(summary(1))).toEqual({ kind: 'gaps', groups: ['呼吸道疾病', '外籍'] })
    expect(focusGapsText(summary(2))).toEqual({ kind: 'gaps', groups: ['呼吸道疾病'] })
  })

  it('says every group is included when there is no gap', () => {
    expect(focusGapsText(summary(8))).toEqual({ kind: 'all' })
    expect(focusGapsText(summary(9))).toEqual({ kind: 'all' })
  })

  it('is null for an issue without an analysis', () => {
    expect(focusGapsText(summary(3))).toBeNull()
  })

  it('sorts the gaps in the fixed order, not in file order', () => {
    const s = { ...summary(1), focusGaps: ['外籍', '呼吸道疾病'] } as IssueSummary
    expect(focusGapsText(s)).toEqual({ kind: 'gaps', groups: ['呼吸道疾病', '外籍'] })
  })
})
