import { describe, expect, it } from 'vitest'
import { stripMarkdown } from './markdown'

describe('stripMarkdown', () => {
  it('keeps plain text as it is', () => {
    expect(stripMarkdown('清潔箱不擋住人行道')).toBe('清潔箱不擋住人行道')
  })

  it('removes bold markers', () => {
    expect(stripMarkdown('**社區工作坊**：每區一場')).toBe('社區工作坊：每區一場')
  })

  it('turns a link into its text', () => {
    expect(stripMarkdown('見 [臺北市陳情系統 1999](https://1999.gov.taipei) 的資料')).toBe('見 臺北市陳情系統 1999 的資料')
    expect(stripMarkdown('[題目原文重點](#題目原文重點)')).toBe('題目原文重點')
  })

  it('handles bold inside a link and two links in one text', () => {
    expect(stripMarkdown('[**A**](a) 與 [B](b)')).toBe('A 與 B')
  })

  it('unescapes \\|', () => {
    expect(stripMarkdown('甲 \\| 乙')).toBe('甲 | 乙')
  })

  it('keeps a lone ** or brackets without a link', () => {
    expect(stripMarkdown('a ** b')).toBe('a ** b')
    expect(stripMarkdown('[實證] 文字')).toBe('[實證] 文字')
  })
})
