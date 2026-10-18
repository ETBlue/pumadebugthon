import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { t } from './zh-TW'

describe('zh-TW strings', () => {
  it('uses the app title from index.html', () => {
    expect(html).toContain('<html lang="zh-TW">')
    expect(html).toContain(`<title>${t.appTitle}</title>`)
  })

  it('names the app 提案小幫手', () => {
    expect(t.appTitle).toBe('提案小幫手')
    expect(html).toContain(t.appSubtitle)
  })
})
