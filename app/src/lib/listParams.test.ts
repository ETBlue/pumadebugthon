import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { NO_FILTERS } from './listFilter'
import {
  clearListFilters, CROSS_STAKEHOLDERS_PATH, DEFAULT_LIST_STATE, HOME_ALL_PATHS, LIST_PARAMS, listParamsOf, listPath, listUrlSearch, Q_MAX_LENGTH,
  type ListState,
} from './listParams'

const index = indexJson as IndexFile
const read = (page: Parameters<typeof listParamsOf>[0], search: string) => listParamsOf(page, new URLSearchParams(search), index)

describe('listParamsOf', () => {
  it('gives the default state with no params, and needs no replace', () => {
    for (const page of ['issues', 'stakeholders', 'solutions', 'spaces'] as const) {
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

  it('reads who, and drops a moved, unknown or unlisted ID (decision 113: a moved ID is not changed)', () => {
    expect(read('issues', 'who=I06')).toMatchObject({ who: 'I06', replace: false })
    expect(read('solutions', 'who=O02')).toMatchObject({ who: null, replace: true })
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

  it('reads the #/spaces params: 空間分類, 議題 and q, and drops the rest (decision 122)', () => {
    expect(read('spaces', 'q=park&issue=1&issue=8&group=%E9%81%93%E8%B7%AF&group=%E5%BB%BA%E7%AF%89')).toMatchObject({
      q: 'park', issues: [1, 8], groups: ['道路', '建築'], replace: false,
    })
    // The groups keep the data order. An unknown group is dropped.
    expect(read('spaces', 'group=%E5%BB%BA%E7%AF%89&group=%E9%81%93%E8%B7%AF&group=nope')).toMatchObject({ groups: ['道路', '建築'], replace: true })
    // No 「跨議題」, no issue with no space (#9), no unanalyzed issue (#3).
    expect(read('spaces', 'issue=X&issue=9&issue=3&issue=2')).toMatchObject({ issues: [2], crossChoice: false, replace: true })
    // No sort, and not the params of the other pages.
    expect(read('spaces', 'sort=added&space=park&who=I06&view=tree')).toMatchObject({ ...DEFAULT_LIST_STATE, replace: true })
    // The other pages do not read group.
    expect(read('issues', 'group=%E9%81%93%E8%B7%AF')).toMatchObject({ groups: [], replace: true })
  })

  it('keeps a clean URL as it is', () => {
    const search = 'q=%E7%84%A1%E8%8F%B8&sort=evidence&issue=X&issue=1&issue=8&specialonly=1&view=tree'
    expect(read('stakeholders', search).replace).toBe(false)
  })
})

describe('listUrlSearch', () => {
  const state: ListState = {
    sort: 'evidence', issues: [2], crossChoice: true, spaces: ['sidewalk'], who: 'I06', specialOnly: true, view: 'tree', q: '無菸',
    groups: ['道路'],
  }

  it('writes only the params of the page, in a fixed order', () => {
    expect(listUrlSearch('issues', state)).toBe('?q=%E7%84%A1%E8%8F%B8&sort=evidence&space=sidewalk&who=I06')
    expect(listUrlSearch('stakeholders', state)).toBe('?q=%E7%84%A1%E8%8F%B8&sort=evidence&issue=X&issue=2&specialonly=1&view=tree')
    expect(listUrlSearch('solutions', state)).toBe('?q=%E7%84%A1%E8%8F%B8&sort=evidence&issue=X&issue=2&space=sidewalk&who=I06')
    // #/spaces: no sort and no 「跨議題」 (decision 122).
    expect(listUrlSearch('spaces', { ...state, crossChoice: false })).toBe('?q=%E7%84%A1%E8%8F%B8&issue=2&group=%E9%81%93%E8%B7%AF')
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
    expect(clearListFilters(new URLSearchParams('q=x&issue=1&group=%E9%81%93%E8%B7%AF'))).toBe('')
  })
})

describe('links to the list pages', () => {
  it('builds a path with only the params that differ from the default', () => {
    expect(listPath('issues')).toBe('/issues')
    expect(listPath('solutions', { sort: 'added', issues: [2] })).toBe('/solutions?sort=added&issue=2')
  })

  it('gives each home 「看全部」 link the sort of its block (decisions 91 and 131)', () => {
    // Every block uses 最近更新, the default sort, so no link has a param.
    expect(HOME_ALL_PATHS).toEqual({
      issues: '/issues',
      stakeholders: '/stakeholders',
      solutions: '/solutions',
    })
  })

  it('links the cross-issue stakeholders with issue=X', () => {
    expect(CROSS_STAKEHOLDERS_PATH).toBe('/stakeholders?issue=X')
  })
})

describe('param names', () => {
  it('do not reuse the names that mean other things on other pages', () => {
    const names = Object.values(LIST_PARAMS)
    expect(names).toEqual(['q', 'sort', 'issue', 'space', 'who', 'specialonly', 'view', 'group'])
    for (const old of ['stakeholder', 'evidence', 'cross', 'special', 'focus', 'pick', 'from']) {
      expect(names).not.toContain(old)
    }
  })
})
