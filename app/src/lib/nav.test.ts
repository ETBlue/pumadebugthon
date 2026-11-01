import { describe, expect, it } from 'vitest'
import { activeNavItem, isNavListPage, NAV_ITEMS } from './nav'

describe('activeNavItem', () => {
  it.each([
    ['/issues', 'issues'],
    ['/issues/', 'issues'],
    ['/issues/2', 'issues'],
    ['/issues/2/overview', 'issues'],
    ['/issues/2/solutions', 'issues'],
    ['/issues/2/solutions/A', 'solutions'],
    ['/issues/2/solutions/A/', 'solutions'],
    ['/issues/2/solutions/A/needs', 'solutions'],
    ['/issues/2/wants', 'issues'],
    ['/issues/2/needs', 'issues'],
    ['/stakeholders', 'stakeholders'],
    ['/stakeholders/I12', 'stakeholders'],
    ['/stakeholders/I06/needs', 'stakeholders'],
    ['/stakeholders/I06/stories/2/I06-US01', 'stakeholders'],
    ['/solutions', 'solutions'],
    ['/solutions/x', 'solutions'],
    ['/solutions/2-S1', 'solutions'],
    ['/solutions/2-S1/needs', 'solutions'],
    ['/solutions/X-S1', 'solutions'],
    // Decision 120: the space list and the space pages belong to 空間.
    ['/spaces', 'spaces'],
    ['/spaces/', 'spaces'],
    ['/spaces/sidewalk-furniture', 'spaces'],
  ] as const)('%s is %s', (path, item) => {
    expect(activeNavItem(path)).toBe(item)
  })

  it.each(['/', '', '/spacesx', '/nope', '/issuesx', '/issuesx/2', '/stakeholdersx', '/solutionsx', '/about', '/wants', '/needs'])(
    '%s has no active item',
    (path) => {
      expect(activeNavItem(path)).toBeNull()
    },
  )
})

describe('isNavListPage', () => {
  it('is true only on the exact list page', () => {
    expect(isNavListPage('/issues')).toBe(true)
    expect(isNavListPage('/issues/')).toBe(true)
    expect(isNavListPage('/solutions')).toBe(true)
    expect(isNavListPage('/stakeholders')).toBe(true)
    expect(isNavListPage('/stakeholders/I12')).toBe(false)
    expect(isNavListPage('/about')).toBe(false)
    expect(isNavListPage('/wants')).toBe(false)
    expect(isNavListPage('/issues/2')).toBe(false)
    expect(isNavListPage('/issues/2/solutions/A')).toBe(false)
    expect(isNavListPage('/solutions/2-S1')).toBe(false)
    expect(isNavListPage('/')).toBe(false)
    expect(isNavListPage('/spaces')).toBe(true)
    expect(isNavListPage('/spaces/sidewalk-furniture')).toBe(false)
  })

  it('is true on #/domains and #/solution-types, false on their detail pages (Task U3)', () => {
    expect(isNavListPage('/domains')).toBe(true)
    expect(isNavListPage('/solution-types')).toBe(true)
    expect(isNavListPage('/domains/police')).toBe(false)
    expect(isNavListPage('/solution-types/open-data/issues')).toBe(false)
  })
})

describe('the nav items (Task U3)', () => {
  it('are in the menu order 議題 | 利害關係人 | 空間 | 領域 | 解法 | 解法類型', () => {
    expect(NAV_ITEMS).toEqual(['issues', 'stakeholders', 'spaces', 'domains', 'solutions', 'solution-types'])
  })

  it.each([
    ['/domains', 'domains'],
    ['/domains/police', 'domains'],
    ['/domains/environment/solutions', 'domains'],
    ['/domains/economic-development', 'domains'],
    ['/solution-types', 'solution-types'],
    ['/solution-types/open-data', 'solution-types'],
    ['/solution-types/open-data/stakeholders', 'solution-types'],
  ] as const)('%s is %s', (path, item) => {
    expect(activeNavItem(path)).toBe(item)
  })

  it.each(['/domainsx', '/solution-type', '/solution-typesx'])('%s has no active item', (path) => {
    expect(activeNavItem(path)).toBeNull()
  })
})
