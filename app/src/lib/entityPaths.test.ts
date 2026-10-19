import { describe, expect, it } from 'vitest'
import {
  crossSolutionPath,
  legacySolutionPath,
  movedStakeholderPath,
  needFocusPath,
  parseSolutionSlug,
  parseSolutionTab,
  parseStakeholderTab,
  SOLUTION_TABS,
  solutionPath,
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
})

describe('parseSolutionTab', () => {
  it('no tab is the overview', () => {
    expect(parseSolutionTab(undefined)).toBe('overview')
  })

  it('accepts every tab name', () => {
    expect(SOLUTION_TABS).toEqual(['overview', 'needs', 'stakeholders'])
    for (const tab of SOLUTION_TABS) expect(parseSolutionTab(tab)).toBe(tab)
  })

  it('returns null for an unknown tab', () => {
    for (const s of ['wants', 'solutions', '', 'Needs']) expect(parseSolutionTab(s)).toBeNull()
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

describe('legacySolutionPath', () => {
  it('maps an old solution URL to the new path', () => {
    expect(legacySolutionPath(2, 'A')).toBe('/solutions/2-A')
    expect(legacySolutionPath(2, 'A', 'needs')).toBe('/solutions/2-A/needs')
    expect(legacySolutionPath(8, 'B', 'stakeholders')).toBe('/solutions/8-B/stakeholders')
  })

  it('keeps an unknown tab segment, so the new page shows "tab not found"', () => {
    expect(legacySolutionPath(2, 'A', 'nope')).toBe('/solutions/2-A/nope')
  })
})

describe('movedStakeholderPath', () => {
  it('changes the ID on the page and on a tab', () => {
    expect(movedStakeholderPath('/stakeholders/O02', 'O02', 'I12')).toBe('/stakeholders/I12')
    expect(movedStakeholderPath('/stakeholders/O02/needs', 'O02', 'I12')).toBe('/stakeholders/I12/needs')
  })

  it('a story ID that starts with the old ID gets the new ID', () => {
    expect(movedStakeholderPath('/stakeholders/O02/stories/2/O02-US01', 'O02', 'I12')).toBe(
      '/stakeholders/I12/stories/2/I12-US01',
    )
  })

  it('keeps any other story ID', () => {
    expect(movedStakeholderPath('/stakeholders/O02/stories/2/I06-US01', 'O02', 'I12')).toBe(
      '/stakeholders/I12/stories/2/I06-US01',
    )
    expect(movedStakeholderPath('/stakeholders/O02/stories/2/O020-US01', 'O02', 'I12')).toBe(
      '/stakeholders/I12/stories/2/O020-US01',
    )
  })

  it('returns null when the path is not a page of the old ID', () => {
    expect(movedStakeholderPath('/stakeholders/O03/needs', 'O02', 'I12')).toBeNull()
    expect(movedStakeholderPath('/issues/2', 'O02', 'I12')).toBeNull()
    expect(movedStakeholderPath('/stakeholders/O020', 'O02', 'I12')).toBeNull()
  })
})
