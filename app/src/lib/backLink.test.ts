import { beforeEach, describe, expect, it } from 'vitest'
import { backListPath, forgetListSearches, rememberedListSearch, rememberListSearch } from './backLink'

beforeEach(() => forgetListSearches())

describe('backListPath', () => {
  it('is the plain list page when the reader has not seen it', () => {
    expect(backListPath('issues')).toBe('/issues')
    expect(backListPath('stakeholders')).toBe('/stakeholders')
    expect(backListPath('solutions')).toBe('/solutions')
  })

  it('keeps the last sort, filters and search of that list page', () => {
    rememberListSearch('issues', '?sort=added&space=park')
    expect(backListPath('issues')).toBe('/issues?sort=added&space=park')
    // Each list page has its own value.
    expect(backListPath('solutions')).toBe('/solutions')
  })

  it('uses the newest value, also when it is the plain list', () => {
    rememberListSearch('solutions', '?issue=X')
    rememberListSearch('solutions', '')
    expect(backListPath('solutions')).toBe('/solutions')
  })

  it('treats a value that is not a search string as no search', () => {
    rememberListSearch('stakeholders', 'view=tree')
    expect(rememberedListSearch('stakeholders')).toBe('')
  })
})
