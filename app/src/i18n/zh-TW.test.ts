import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { t } from './zh-TW'

describe('zh-TW strings', () => {
  it('uses the app title from index.html', () => {
    expect(html).toContain('<html lang="zh-TW">')
    expect(html).toContain(`<title>${t.appTitle}</title>`)
  })
})
