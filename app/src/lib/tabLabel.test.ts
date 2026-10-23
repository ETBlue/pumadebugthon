import { describe, expect, it } from 'vitest'
import { t } from '@/i18n/zh-TW'
import { tabLabelText } from './tabLabel'

describe('tabLabelText', () => {
  it('is the main part alone when there is no second part', () => {
    expect(tabLabelText({ main: '總覽' })).toBe('總覽')
    expect(tabLabelText(t.issue.tabLabels.needs(21))).toBe('需求 21')
    // Decision 142: 訴求 and 衝突 are two tabs, each with one count.
    expect(tabLabelText(t.issue.tabLabels.wants(39))).toBe('訴求 39')
    expect(tabLabelText(t.issue.tabLabels.conflicts(9))).toBe('衝突 9')
    expect(tabLabelText(t.stakeholderPage.tabLabels.wants(5))).toBe('訴求 5')
    expect(tabLabelText(t.stakeholderPage.tabLabels.conflicts(4))).toBe('衝突 4')
  })

  it('joins the two parts with the separator, as the label reads on a wide screen', () => {
    expect(tabLabelText(t.issue.tabLabels.stakeholders(27, 5))).toBe('利害關係人 27・弱勢 5')
    expect(tabLabelText(t.solutionPage.tabLabels.needs(9, 12))).toBe('需求　涵蓋 9・未涵蓋 12')
    expect(tabLabelText(t.solutionPage.tabLabels.stakeholders(14, 13))).toBe('利害關係人　涵蓋 14・未涵蓋 13')
  })

  it('keeps every count in the text (the accessible name of the tab)', () => {
    const label = t.issue.tabLabels.stakeholders(27, 5)
    expect(label.sub).toBe('弱勢 5')
    expect(tabLabelText(label)).toContain('27')
    expect(tabLabelText(label)).toContain('5')
  })
})
