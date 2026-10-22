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
    ['/issues/2/solutions/A/needs', 'solutions'],
    ['/issues/2/wants', 'issues'],
    ['/issues/2/needs', 'issues'],
    ['/stakeholders', 'stakeholders'],
    ['/stakeholders/I12', 'stakeholders'],
    ['/stakeholders/I06/needs', 'stakeholders'],
    ['/stakeholders/I06/stories/2/I06-US01', 'stakeholders'],
    ['/solutions', 'solutions'],
    ['/solutions/x', 'solutions'],
    ['/solutions/2-A', 'solutions'],
    ['/solutions/2-A/needs', 'solutions'],
    ['/solutions/X-A', 'solutions'],
    // Decision 120: the space list and the space pages belong to 空間.
    ['/spaces', 'spaces'],
    ['/spaces/', 'spaces'],
    ['/spaces/sidewalk', 'spaces'],
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
    expect(isNavListPage('/solutions/2-A')).toBe(false)
    expect(isNavListPage('/')).toBe(false)
    expect(isNavListPage('/spaces')).toBe(true)
    expect(isNavListPage('/spaces/sidewalk')).toBe(false)
  })
})
