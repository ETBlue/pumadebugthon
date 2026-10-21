import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { NO_FILTERS } from './listFilter'
import {
  clearListFilters, CROSS_STAKEHOLDERS_PATH, DEFAULT_LIST_STATE, HOME_ALL_PATHS, legacyListRedirect, LIST_PARAMS, listParamsOf, listPath, listUrlSearch, Q_MAX_LENGTH,
  type ListState,
} from './listParams'

const index = indexJson as IndexFile
const read = (page: Parameters<typeof listParamsOf>[0], search: string) => listParamsOf(page, new URLSearchParams(search), index)

describe('listParamsOf', () => {
  it('gives the default state with no params, and needs no replace', () => {
    for (const page of ['issues', 'stakeholders', 'solutions'] as const) {
      expect(read(page, '')).toEqual({ ...DEFAULT_LIST_STATE, replace: false })
    }
    expect(DEFAULT_LIST_STATE).toEqual({ ...NO_FILTERS, sort: 'updated', view: 'cards', q: null })
  })

  it('reads the sorts of each page', () => {
    expect(read('issues', 'sort=evidence')).toMatchObject({ sort: 'evidence', replace: false })
    expect(read('stakeholders', 'sort=solutions')).toMatchObject({ sort: 'solutions', replace: false })
    expect(read('solutions', 'sort=added')).toMatchObject({ sort: 'added', replace: false })
  })

  it('drops sort=id (Q24) and a sort the page does not have, and reports a replace', () => {
    expect(read('issues', 'sort=id')).toMatchObject({ sort: 'updated', replace: true })
    expect(read('stakeholders', 'sort=id')).toMatchObject({ sort: 'updated', replace: true })
    expect(read('solutions', 'sort=solutions')).toMatchObject({ sort: 'updated', replace: true })
    expect(read('issues', 'sort=solutions')).toMatchObject({ sort: 'updated', replace: true })
    expect(read('issues', 'sort=xyz')).toMatchObject({ sort: 'updated', replace: true })
  })

  it('reads the 議題 filter with 「跨議題」, and drops an issue with no analysis', () => {
    expect(read('stakeholders', 'issue=X&issue=2')).toMatchObject({ issues: [2], crossChoice: true, replace: false })
    expect(read('solutions', 'issue=2&issue=X')).toMatchObject({ issues: [2], crossChoice: true, replace: true })
    expect(read('solutions', 'issue=1&issue=3&issue=99&issue=a')).toMatchObject({ issues: [1], crossChoice: false, replace: true })
    // #/issues has no 議題 filter.
    expect(read('issues', 'issue=1')).toMatchObject({ issues: [], replace: true })
  })

  it('reads the used space types only, in the order of space-types.csv', () => {
    expect(read('issues', 'space=sidewalk&space=park')).toMatchObject({ spaces: ['sidewalk', 'park'], replace: false })
    expect(read('solutions', 'space=park&space=sidewalk')).toMatchObject({ spaces: ['sidewalk', 'park'], replace: true })
    expect(read('issues', 'space=parking&space=nope')).toMatchObject({ spaces: [], replace: true })
    expect(read('stakeholders', 'space=sidewalk')).toMatchObject({ spaces: [], replace: true })
  })

  it('reads who, resolves a moved ID, and drops an unknown or unlisted ID', () => {
    expect(read('issues', 'who=I06')).toMatchObject({ who: 'I06', replace: false })
    expect(read('solutions', 'who=O02')).toMatchObject({ who: 'I12', replace: true })
    expect(read('solutions', 'who=I999')).toMatchObject({ who: null, replace: true })
    expect(read('issues', 'who=I34')).toMatchObject({ who: null, replace: true })
    expect(read('stakeholders', 'who=I06')).toMatchObject({ who: null, replace: true })
  })

  it('reads specialonly and view on #/stakeholders only', () => {
    expect(read('stakeholders', 'specialonly=1&view=tree')).toMatchObject({ specialOnly: true, view: 'tree', replace: false })
    expect(read('stakeholders', 'specialonly=yes&view=list')).toMatchObject({ specialOnly: false, view: 'cards', replace: true })
    expect(read('issues', 'specialonly=1')).toMatchObject({ specialOnly: false, replace: true })
    expect(read('solutions', 'view=tree')).toMatchObject({ view: 'cards', replace: true })
  })

  it('trims q, cuts it at 100 characters and drops it when empty', () => {
    expect(read('issues', `q=${encodeURIComponent('  無菸 ')}`)).toMatchObject({ q: '無菸', replace: true })
    expect(read('issues', `q=${encodeURIComponent('無菸')}`)).toMatchObject({ q: '無菸', replace: false })
    expect(read('stakeholders', `q=${encodeURIComponent('   ')}`)).toMatchObject({ q: null, replace: true })
    expect(Q_MAX_LENGTH).toBe(100)
    const long = '樹'.repeat(101)
    const cut = read('solutions', `q=${encodeURIComponent(long)}`)
    expect(cut.q).toBe('樹'.repeat(100))
    expect(cut.replace).toBe(true)
  })

  it('drops sort=updated, which the bar never writes', () => {
    expect(read('issues', 'sort=updated')).toMatchObject({ sort: 'updated', replace: true })
  })

  it('keeps a clean URL as it is', () => {
    const search = 'q=%E7%84%A1%E8%8F%B8&sort=evidence&issue=X&issue=1&issue=8&specialonly=1&view=tree'
    expect(read('stakeholders', search).replace).toBe(false)
  })
})

describe('listUrlSearch', () => {
  const state: ListState = {
    sort: 'evidence', issues: [2], crossChoice: true, spaces: ['sidewalk'], who: 'I06', specialOnly: true, view: 'tree', q: '無菸',
  }

  it('writes only the params of the page, in a fixed order', () => {
    expect(listUrlSearch('issues', state)).toBe('?q=%E7%84%A1%E8%8F%B8&sort=evidence&space=sidewalk&who=I06')
    expect(listUrlSearch('stakeholders', state)).toBe('?q=%E7%84%A1%E8%8F%B8&sort=evidence&issue=X&issue=2&specialonly=1&view=tree')
    expect(listUrlSearch('solutions', state)).toBe('?q=%E7%84%A1%E8%8F%B8&sort=evidence&issue=X&issue=2&space=sidewalk&who=I06')
  })

  it('writes nothing for the default state, and no sort=updated', () => {
    expect(listUrlSearch('stakeholders', DEFAULT_LIST_STATE)).toBe('')
    expect(listUrlSearch('issues', { ...DEFAULT_LIST_STATE, sort: 'updated', spaces: ['park'] })).toBe('?space=park')
  })

  it('round-trips through listParamsOf', () => {
    for (const page of ['issues', 'stakeholders', 'solutions'] as const) {
      const search = listUrlSearch(page, state)
      const back = listParamsOf(page, new URLSearchParams(search), index)
      expect(back.replace).toBe(false)
      expect(listUrlSearch(page, back)).toBe(search)
    }
  })
})

describe('clearListFilters', () => {
  it('removes every filter and q, and keeps sort and view', () => {
    const params = new URLSearchParams('q=x&sort=added&issue=X&issue=2&space=park&who=I06&specialonly=1&view=tree')
    expect(clearListFilters(params)).toBe('?sort=added&view=tree')
    expect(clearListFilters(new URLSearchParams('q=x&space=park'))).toBe('')
  })
})

describe('legacyListRedirect', () => {
  it('turns cross=1 into issue=X on #/stakeholders, and keeps the other params', () => {
    expect(legacyListRedirect('stakeholders', '?cross=1&sort=added')).toBe('?sort=added&issue=X')
    expect(legacyListRedirect('stakeholders', '?cross=1&issue=X')).toBe('?issue=X')
  })

  it('turns special=<group> into specialonly=1', () => {
    expect(legacyListRedirect('stakeholders', `?special=${encodeURIComponent('高齡')}&special=${encodeURIComponent('兒少')}`)).toBe(
      '?specialonly=1',
    )
  })

  it('drops evidence and an unknown cross value', () => {
    expect(legacyListRedirect('stakeholders', '?evidence=1&view=tree')).toBe('?view=tree')
    expect(legacyListRedirect('stakeholders', '?cross=0')).toBe('')
  })

  it('drops evidence on #/issues and #/solutions too, and keeps the other params', () => {
    expect(legacyListRedirect('issues', '?evidence=1')).toBe('')
    expect(legacyListRedirect('issues', '?sort=added&evidence=1&space=park')).toBe('?sort=added&space=park')
    expect(legacyListRedirect('solutions', '?evidence=1')).toBe('')
    expect(legacyListRedirect('solutions', '?issue=X&evidence=1')).toBe('?issue=X')
  })

  it('gives null when there is nothing to change', () => {
    expect(legacyListRedirect('stakeholders', '?issue=X')).toBeNull()
    expect(legacyListRedirect('stakeholders', '')).toBeNull()
    expect(legacyListRedirect('issues', '?sort=added')).toBeNull()
    expect(legacyListRedirect('issues', '')).toBeNull()
    expect(legacyListRedirect('solutions', '?issue=2')).toBeNull()
  })

  it('changes cross and special only on #/stakeholders', () => {
    expect(legacyListRedirect('solutions', '?cross=1')).toBeNull()
    expect(legacyListRedirect('issues', `?special=${encodeURIComponent('高齡')}`)).toBeNull()
    expect(legacyListRedirect('solutions', '?cross=1&evidence=1')).toBe('?cross=1')
  })
})

describe('links to the list pages', () => {
  it('builds a path with only the params that differ from the default', () => {
    expect(listPath('issues')).toBe('/issues')
    expect(listPath('solutions', { sort: 'added', issues: [2] })).toBe('/solutions?sort=added&issue=2')
  })

  it('gives each home 「看全部」 link the sort of its block (decision 91)', () => {
    expect(HOME_ALL_PATHS).toEqual({
      issues: '/issues',
      stakeholders: '/stakeholders?sort=added',
      solutions: '/solutions?sort=added',
    })
  })

  it('links the cross-issue stakeholders with issue=X', () => {
    expect(CROSS_STAKEHOLDERS_PATH).toBe('/stakeholders?issue=X')
  })
})

describe('param names', () => {
  it('do not reuse the names that mean other things on other pages', () => {
    const names = Object.values(LIST_PARAMS)
    expect(names).toEqual(['q', 'sort', 'issue', 'space', 'who', 'specialonly', 'view'])
    for (const old of ['stakeholder', 'evidence', 'cross', 'special', 'focus', 'pick', 'from']) {
      expect(names).not.toContain(old)
    }
  })
})
