import { describe, expect, it } from 'vitest'
import { activeNavItem, isNavListPage } from './nav'

describe('activeNavItem', () => {
  it.each([
    ['/issues', 'issues'],
    ['/issues/', 'issues'],
    ['/issues/2', 'issues'],
    ['/issues/2/overview', 'issues'],
    ['/issues/2/solutions', 'issues'],
    ['/issues/2/solutions/A', 'solutions'],
    ['/issues/2/solutions/A/', 'solutions'],
    ['/stakeholders', 'stakeholders'],
    ['/stakeholders/I12', 'stakeholders'],
    ['/wants', 'wants'],
    ['/wants/anything', 'wants'],
    ['/needs', 'needs'],
    ['/needs/anything', 'needs'],
    ['/solutions', 'solutions'],
    ['/solutions/x', 'solutions'],
  ] as const)('%s is %s', (path, item) => {
    expect(activeNavItem(path)).toBe(item)
  })

  it.each(['/', '', '/spaces/sidewalk', '/nope', '/issuesx', '/issuesx/2', '/stakeholdersx', '/wantsx', '/needsx', '/solutionsx'])(
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
    expect(isNavListPage('/needs')).toBe(true)
    expect(isNavListPage('/needs/x')).toBe(false)
    expect(isNavListPage('/issues/2')).toBe(false)
    expect(isNavListPage('/issues/2/solutions/A')).toBe(false)
    expect(isNavListPage('/')).toBe(false)
    expect(isNavListPage('/spaces/sidewalk')).toBe(false)
  })
})
