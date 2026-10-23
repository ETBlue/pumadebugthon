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
    // The slogan is also the index.html meta description (decision 128).
    expect(t.slogan).toBe('看見各方利害關係人，打造更體貼周到的市政規劃')
    expect(html).toContain(t.slogan)
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

  it('has one 資料根據 note for the whole app, on #/about (decision 128)', () => {
    // It names all three kinds of items, so it fits every list.
    expect(t.about.basisNote).toContain('不代表議題、利害關係人或解法的重要性或好壞')
    expect(t.about.basisNote).toContain('[AI模擬]')
    expect(t.about.basisHeading).toBe(t.basis.label)
  })
})
