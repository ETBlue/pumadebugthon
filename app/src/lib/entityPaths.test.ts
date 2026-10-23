import { describe, expect, it } from 'vitest'
import {
  conflictFocusPath,
  keyStoryPath,
  crossSolutionPath,
  issueFocusPath,
  needFocusPath,
  parseSolutionSlug,
  parseSolutionTab,
  parseSpaceTab,
  parseStakeholderTab,
  SOLUTION_TABS,
  solutionPath,
  SPACE_TABS,
  spaceTabPath,
  STAKEHOLDER_TABS,
  stakeholderTabPath,
  storyPath,
  wantFocusPath,
} from './entityPaths'

describe('parseStakeholderTab', () => {
  it('no tab is the overview', () => {
    expect(parseStakeholderTab(undefined)).toBe('overview')
  })

  it('accepts every tab name', () => {
    expect(STAKEHOLDER_TABS).toEqual(['overview', 'wants', 'needs', 'solutions'])
    for (const tab of STAKEHOLDER_TABS) expect(parseStakeholderTab(tab)).toBe(tab)
  })

  it('returns null for an unknown tab, also for the sub-page name stories', () => {
    for (const s of ['stories', 'opinion', '', 'Wants']) expect(parseStakeholderTab(s)).toBeNull()
  })
})

describe('stakeholderTabPath', () => {
  it('the overview has no tab segment; other tabs have one', () => {
    expect(stakeholderTabPath('I06', 'overview')).toBe('/stakeholders/I06')
    expect(stakeholderTabPath('I06', 'wants')).toBe('/stakeholders/I06/wants')
  })

  it('parseStakeholderTab reads back every path', () => {
    for (const tab of STAKEHOLDER_TABS) {
      expect(parseStakeholderTab(stakeholderTabPath('I06', tab).split('/')[3])).toBe(tab)
    }
  })
})

describe('storyPath', () => {
  it('puts the story under the stakeholder before 「-」', () => {
    expect(storyPath(2, 'I06-US01')).toBe('/stakeholders/I06/stories/2/I06-US01')
    expect(storyPath(1, 'O10-US03')).toBe('/stakeholders/O10/stories/1/O10-US03')
  })
})

describe('wantFocusPath and needFocusPath', () => {
  it('link to the item on the issue tab with ?focus=', () => {
    expect(wantFocusPath(2, 'W08')).toEqual({ pathname: '/issues/2/wants', search: '?focus=W08' })
    expect(needFocusPath(2, 'N07')).toEqual({ pathname: '/issues/2/needs', search: '?focus=N07' })
  })

  it('a want or need with no group uses the story ID as its key', () => {
    expect(wantFocusPath(8, 'I24-US01')).toEqual({ pathname: '/issues/8/wants', search: '?focus=I24-US01' })
    expect(needFocusPath(8, 'I06-US01')).toEqual({ pathname: '/issues/8/needs', search: '?focus=I06-US01' })
  })

  it('keeps the data filter when it is on', () => {
    expect(wantFocusPath(2, 'W08', true).search).toBe('?focus=W08&evidence=1')
    expect(needFocusPath(2, 'N07', true).search).toBe('?focus=N07&evidence=1')
  })

  it('needFocusPath with the URL params keeps evidence and stakeholder, like a tab change', () => {
    const params = new URLSearchParams('stakeholder=I06&evidence=1&focus=C6')
    expect(needFocusPath(2, 'N06', params)).toEqual({
      pathname: '/issues/2/needs',
      search: '?evidence=1&stakeholder=I06&focus=N06',
    })
  })
})

describe('issueFocusPath and conflictFocusPath', () => {
  it('link to a part of an issue tab with ?focus=', () => {
    expect(issueFocusPath(2, 'overview', 'stakeholders')).toEqual({ pathname: '/issues/2', search: '?focus=stakeholders' })
    expect(issueFocusPath(2, 'wants', 'conflicts')).toEqual({ pathname: '/issues/2/wants', search: '?focus=conflicts' })
    expect(conflictFocusPath(2, 'C9')).toEqual({ pathname: '/issues/2/wants', search: '?focus=C9' })
  })

  it('keeps the data filter when it is on', () => {
    expect(issueFocusPath(1, 'needs', 'N03', true).search).toBe('?focus=N03&evidence=1')
    expect(conflictFocusPath(1, 'C7', true)).toEqual({ pathname: '/issues/1/wants', search: '?focus=C7&evidence=1' })
  })

  it('conflictFocusPath with the URL params keeps evidence and stakeholder, like a tab change', () => {
    const params = new URLSearchParams('stakeholder=I06&evidence=1&pick=W08&focus=W08')
    expect(conflictFocusPath(2, 'C6', params)).toEqual({
      pathname: '/issues/2/wants',
      search: '?evidence=1&stakeholder=I06&focus=C6',
    })
    expect(conflictFocusPath(2, 'C6', new URLSearchParams('pick=W08'))).toEqual({
      pathname: '/issues/2/wants',
      search: '?focus=C6',
    })
  })
})

describe('parseSolutionTab', () => {
  it('no tab is the overview', () => {
    expect(parseSolutionTab(undefined)).toBe('overview')
  })

  it('accepts every tab name', () => {
    expect(SOLUTION_TABS).toEqual([
      'overview', 'needs', 'wants', 'stakeholders', 'conflicts', 'controversies', 'legal', 'plan', 'measures', 'policies',
    ])
    for (const tab of SOLUTION_TABS) expect(parseSolutionTab(tab)).toBe(tab)
  })

  it('returns null for an unknown tab', () => {
    for (const s of ['solutions', 'practices', '', 'Needs', 'Wants']) expect(parseSolutionTab(s)).toBeNull()
  })
})

describe('solutionPath and crossSolutionPath', () => {
  it('the overview has no tab segment; other tabs have one', () => {
    expect(solutionPath(2, 'A')).toBe('/solutions/2-A')
    expect(solutionPath(2, 'A', 'overview')).toBe('/solutions/2-A')
    expect(solutionPath(2, 'A', 'needs')).toBe('/solutions/2-A/needs')
    expect(crossSolutionPath('X-A')).toBe('/solutions/X-A')
    expect(crossSolutionPath('X-A', 'stakeholders')).toBe('/solutions/X-A/stakeholders')
  })

  it('parseSolutionSlug and parseSolutionTab read back every path', () => {
    for (const tab of SOLUTION_TABS) {
      const [, , slug, segment] = solutionPath(2, 'A', tab).split('/')
      expect(parseSolutionSlug(slug)).toEqual({ kind: 'issue', issueNumber: 2, code: 'A' })
      expect(parseSolutionTab(segment)).toBe(tab)
      const [, , crossSlug, crossSegment] = crossSolutionPath('X-B', tab).split('/')
      expect(parseSolutionSlug(crossSlug)).toEqual({ kind: 'cross', code: 'X-B' })
      expect(parseSolutionTab(crossSegment)).toBe(tab)
    }
  })
})

describe('parseSolutionSlug', () => {
  it('reads an issue solution', () => {
    expect(parseSolutionSlug('2-A')).toEqual({ kind: 'issue', issueNumber: 2, code: 'A' })
    expect(parseSolutionSlug('12-E')).toEqual({ kind: 'issue', issueNumber: 12, code: 'E' })
  })

  it('reads a cross-issue solution', () => {
    expect(parseSolutionSlug('X-A')).toEqual({ kind: 'cross', code: 'X-A' })
  })

  it('returns null for anything else', () => {
    for (const s of ['2', 'A', '2-', 'X-', '2-a1', '2-a', 'cross', '02-A', '0-A', 'X-a', '2-A-B', '', undefined]) {
      expect(parseSolutionSlug(s)).toBeNull()
    }
  })
})

describe('keyStoryPath', () => {
  it('links a want or need key that is a story ID to the story page (decision 55)', () => {
    expect(keyStoryPath(2, 'I01-US09')).toBe('/stakeholders/I01/stories/2/I01-US09')
    expect(keyStoryPath(9, 'O25-US01')).toBe('/stakeholders/O25/stories/9/O25-US01')
  })

  it('is null for a group key or anything else', () => {
    for (const key of ['W08', 'N07', 'C1', 'X-N01', 'I01', 'i01-us09', 'I01-US', '']) expect(keyStoryPath(2, key)).toBeNull()
  })
})

describe('parseSpaceTab and spaceTabPath (decision 129)', () => {
  it('no tab is the overview, so an old space link opens the first tab', () => {
    expect(SPACE_TABS).toEqual(['overview', 'issues', 'solutions', 'stakeholders'])
    expect(parseSpaceTab(undefined)).toBe('overview')
    for (const tab of SPACE_TABS) expect(parseSpaceTab(tab)).toBe(tab)
  })

  it('returns null for an unknown tab', () => {
    for (const s of ['wants', '', 'Issues', 'people']) expect(parseSpaceTab(s)).toBeNull()
  })

  it('the overview has no tab segment', () => {
    expect(spaceTabPath('sidewalk', 'overview')).toBe('/spaces/sidewalk')
    expect(spaceTabPath('sidewalk', 'solutions')).toBe('/spaces/sidewalk/solutions')
  })
})
