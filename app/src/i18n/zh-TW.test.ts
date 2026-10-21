import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { t } from './zh-TW'

describe('zh-TW strings', () => {
  it('uses the app title from index.html', () => {
    expect(html).toContain('<html lang="zh-TW">')
    expect(html).toContain(`<title>${t.appTitle}</title>`)
  })

  it('names the app 市政提案小幫手', () => {
    expect(t.appTitle).toBe('市政提案小幫手')
    expect(html).toContain(t.appSubtitle)
  })

  it('keeps the sort names short, and the note names what the share counts', () => {
    // At 360 px the sort <select> is about 130 px wide on #/stakeholders,
    // so each name has at most 6 characters (decision 100).
    for (const label of Object.values(t.listBar.sorts)) expect([...label].length).toBeLessThanOrEqual(6)
    expect(t.listBar.sorts.evidence).toBe('資料根據比例')
    expect(t.listBar.sorts.solutions).toBe('解法涵蓋比例')
    // The short name drops 「（實證＋AI整理）」, so the note must say it.
    expect(t.listBar.sortNotes.evidence).toContain('[實證]')
    expect(t.listBar.sortNotes.evidence).toContain('[AI整理]')
  })

  it('names the right thing in the 資料根據 note of each list', () => {
    expect(t.basis.listNote('議題')).toContain('不代表議題的重要性')
    expect(t.basis.listNote('利害關係人')).toContain('不代表利害關係人的重要性')
    expect(t.basis.listNote('解法')).toContain('不代表解法的重要性')
    // The issue lists keep the old text.
    expect(t.basis.listNote('議題')).toBe(
      '「資料根據」是分析內容的資料來源組成，不代表議題的重要性或好壞。組織的使用者故事在真人訪談前都標記 [AI模擬]，所以不會到 100%。',
    )
  })
})
