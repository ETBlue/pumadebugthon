import { describe, expect, it } from 'vitest'
import { type MdToken, parseMarkdown, stripMarkdown } from './markdown'

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

describe('parseMarkdown', () => {
  it('returns one text token for plain text', () => {
    expect(parseMarkdown('清潔箱不擋住人行道')).toEqual([{ type: 'text', text: '清潔箱不擋住人行道' }])
  })

  it('returns an empty list for empty text', () => {
    expect(parseMarkdown('')).toEqual([])
  })

  it('turns **bold** into a strong token', () => {
    expect(parseMarkdown('**社區工作坊**：每區一場')).toEqual([
      { type: 'strong', children: [{ type: 'text', text: '社區工作坊' }] },
      { type: 'text', text: '：每區一場' },
    ])
  })

  it('turns an http or https link into a link token', () => {
    expect(parseMarkdown('見 [陳情系統](https://1999.gov.taipei) 的資料')).toEqual([
      { type: 'text', text: '見 ' },
      { type: 'link', href: 'https://1999.gov.taipei', children: [{ type: 'text', text: '陳情系統' }] },
      { type: 'text', text: ' 的資料' },
    ])
    expect(parseMarkdown('[a](http://example.org)')[0]).toMatchObject({ type: 'link', href: 'http://example.org' })
  })

  it('keeps only the text of a link that is not http or https', () => {
    // A #anchor would change the app route; javascript: must never be a link.
    expect(parseMarkdown('[題目原文重點](#題目原文重點)')).toEqual([{ type: 'text', text: '題目原文重點' }])
    expect(parseMarkdown('[x](javascript:alert(1))')).toEqual([{ type: 'text', text: 'x)' }])
  })

  it('handles bold inside a link and a link inside bold', () => {
    expect(parseMarkdown('[**A**](https://a.tw)')).toEqual([
      { type: 'link', href: 'https://a.tw', children: [{ type: 'strong', children: [{ type: 'text', text: 'A' }] }] },
    ])
    expect(parseMarkdown('**見 [B](https://b.tw)**')).toEqual([
      {
        type: 'strong',
        children: [
          { type: 'text', text: '見 ' },
          { type: 'link', href: 'https://b.tw', children: [{ type: 'text', text: 'B' }] },
        ],
      },
    ])
  })

  it('unescapes \\| and keeps a lone ** or brackets as text', () => {
    expect(parseMarkdown('甲 \\| 乙')).toEqual([{ type: 'text', text: '甲 | 乙' }])
    expect(parseMarkdown('a ** b')).toEqual([{ type: 'text', text: 'a ** b' }])
    expect(parseMarkdown('[實證] 文字')).toEqual([{ type: 'text', text: '[實證] 文字' }])
  })

  it('gives the same plain text as stripMarkdown', () => {
    const plain = (tokens: MdToken[]): string =>
      tokens.map((tk) => (tk.type === 'text' ? tk.text : plain(tk.children))).join('')
    for (const s of ['**社區工作坊**：每區一場', '[**A**](a) 與 [B](b)', '甲 \\| 乙', 'a ** b']) {
      expect(plain(parseMarkdown(s))).toBe(stripMarkdown(s))
    }
  })
})
