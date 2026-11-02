import { describe, expect, it } from 'vitest'
import {
  conflictFocusPath,
  keyStoryPath,
  crossSolutionPath,
  issueFocusPath,
  needFocusPath,
  ISSUE_SOLUTION_TABS,
  parseIssueSolutionTab,
  parseSolutionSlug,
  parseSolutionTab,
  parseSpaceTab,
  parseStakeholderTab,
  SOLUTION_TABS,
  solutionPath,
  SPACE_TABS,
  STAKEHOLDER_TABS,
  stakeholderTabPath,
  storyPath,
  parseTypeTab,
  TYPE_TABS,
  typeTabPath,
  wantFocusPath,
} from './entityPaths'

describe('parseStakeholderTab', () => {
  it('no tab is the overview', () => {
    expect(parseStakeholderTab(undefined)).toBe('overview')
  })

  it('accepts every tab name', () => {
    // Decision 142: 衝突 is its own tab, after 需求.
    expect(STAKEHOLDER_TABS).toEqual(['overview', 'issues', 'wants', 'needs', 'conflicts', 'solutions'])
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
    expect(issueFocusPath(2, 'conflicts', 'conflicts')).toEqual({ pathname: '/issues/2/conflicts', search: '?focus=conflicts' })
    // Decision 142: a conflict is on the 衝突 tab, not on the 訴求 tab.
    expect(conflictFocusPath(2, 'C9')).toEqual({ pathname: '/issues/2/conflicts', search: '?focus=C9' })
  })

  it('keeps the data filter when it is on', () => {
    expect(issueFocusPath(1, 'needs', 'N03', true).search).toBe('?focus=N03&evidence=1')
    expect(conflictFocusPath(1, 'C7', true)).toEqual({ pathname: '/issues/1/conflicts', search: '?focus=C7&evidence=1' })
  })

  it('conflictFocusPath with the URL params keeps evidence and stakeholder, like a tab change', () => {
    const params = new URLSearchParams('stakeholder=I06&evidence=1&pick=W08&focus=W08')
    expect(conflictFocusPath(2, 'C6', params)).toEqual({
      pathname: '/issues/2/conflicts',
      search: '?evidence=1&stakeholder=I06&focus=C6',
    })
    expect(conflictFocusPath(2, 'C6', new URLSearchParams('pick=W08'))).toEqual({
      pathname: '/issues/2/conflicts',
      search: '?focus=C6',
    })
  })
})

describe('parseSolutionTab', () => {
  it('no tab is the overview', () => {
    expect(parseSolutionTab(undefined)).toBe('overview')
  })

  it('accepts every tab name', () => {
    // Decision 142: 利害關係人, 訴求, 需求, 衝突, in the order of the issue page.
    // Decision 143: 執行計畫 and 成效衡量, then 潛在風險, 可能爭議 and 法規障礙.
    expect(SOLUTION_TABS).toEqual([
      'overview', 'stakeholders', 'wants', 'needs', 'conflicts', 'plan', 'measures', 'risks', 'controversies', 'legal',
      'policies',
    ])
    for (const tab of SOLUTION_TABS) expect(parseSolutionTab(tab)).toBe(tab)
  })

  it('returns null for an unknown tab', () => {
    for (const s of ['solutions', 'practices', '', 'Needs', 'Wants']) expect(parseSolutionTab(s)).toBeNull()
  })

  it('returns null for candidates: an X- solution has no 可能合併 tab (Task U6)', () => {
    expect(parseSolutionTab('candidates')).toBeNull()
  })
})

describe('parseIssueSolutionTab (Task U6)', () => {
  it('the tabs of an issue solution: SOLUTION_TABS, then candidates last', () => {
    expect(ISSUE_SOLUTION_TABS).toEqual([...SOLUTION_TABS, 'candidates'])
    for (const tab of ISSUE_SOLUTION_TABS) expect(parseIssueSolutionTab(tab)).toBe(tab)
    expect(parseIssueSolutionTab(undefined)).toBe('overview')
    expect(parseIssueSolutionTab('practices')).toBeNull()
  })

  it('solutionPath has the candidates segment', () => {
    expect(solutionPath(2, 'S1', 'candidates')).toBe('/solutions/2-S1/candidates')
  })
})

describe('solutionPath and crossSolutionPath', () => {
  it('the overview has no tab segment; other tabs have one', () => {
    expect(solutionPath(2, 'S1')).toBe('/solutions/2-S1')
    expect(solutionPath(2, 'S1', 'overview')).toBe('/solutions/2-S1')
    expect(solutionPath(2, 'S1', 'needs')).toBe('/solutions/2-S1/needs')
    expect(crossSolutionPath('X-S1')).toBe('/solutions/X-S1')
    expect(crossSolutionPath('X-S1', 'stakeholders')).toBe('/solutions/X-S1/stakeholders')
  })

  it('parseSolutionSlug and parseSolutionTab read back every path', () => {
    for (const tab of SOLUTION_TABS) {
      const [, , slug, segment] = solutionPath(2, 'S1', tab).split('/')
      expect(parseSolutionSlug(slug)).toEqual({ kind: 'issue', issueNumber: 2, code: 'S1' })
      expect(parseSolutionTab(segment)).toBe(tab)
      const [, , crossSlug, crossSegment] = crossSolutionPath('X-S2', tab).split('/')
      expect(parseSolutionSlug(crossSlug)).toEqual({ kind: 'cross', code: 'X-S2' })
      expect(parseSolutionTab(crossSegment)).toBe(tab)
    }
  })
})

describe('parseSolutionSlug', () => {
  it('reads an issue solution', () => {
    expect(parseSolutionSlug('2-S1')).toEqual({ kind: 'issue', issueNumber: 2, code: 'S1' })
    expect(parseSolutionSlug('12-S5')).toEqual({ kind: 'issue', issueNumber: 12, code: 'S5' })
    expect(parseSolutionSlug('2-S10')).toEqual({ kind: 'issue', issueNumber: 2, code: 'S10' })
  })

  it('reads a cross-issue solution', () => {
    expect(parseSolutionSlug('X-S1')).toEqual({ kind: 'cross', code: 'X-S1' })
    expect(parseSolutionSlug('X-S13')).toEqual({ kind: 'cross', code: 'X-S13' })
  })

  it('returns null for an old link: no redirect (decision 151)', () => {
    for (const s of ['2-' + 'A', '12-' + 'E', 'X-' + 'A', 'X-' + 'M']) expect(parseSolutionSlug(s)).toBeNull()
  })

  it('returns null for anything else', () => {
    for (const s of ['2', 'S1', '2-', 'X-', '2-a1', '2-a', 'cross', '02-S1', '0-S1', '2-S0', '2-S01', 'X-S0', 'X-S01', 'X-N1', 'X-C1', '2-s1', 'X-a', '2-A-B', '', undefined]) {
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
    for (const key of ['W08', 'N07', 'C1', 'X-N1', 'I01', 'i01-us09', 'I01-US', '']) expect(keyStoryPath(2, key)).toBeNull()
  })
})

// The path case called spaceTabPath before Task U7. It now calls typeTabPath
// with the kind 'space'.
describe("parseSpaceTab and typeTabPath with the kind 'space' (decision 129)", () => {
  it('no tab is the overview, so an old space link opens the first tab', () => {
    expect(SPACE_TABS).toEqual(['overview', 'issues', 'solutions', 'stakeholders'])
    expect(parseSpaceTab(undefined)).toBe('overview')
    for (const tab of SPACE_TABS) expect(parseSpaceTab(tab)).toBe(tab)
  })

  it('returns null for an unknown tab', () => {
    for (const s of ['wants', '', 'Issues', 'people']) expect(parseSpaceTab(s)).toBeNull()
  })

  it('the overview has no tab segment', () => {
    expect(typeTabPath('space', 'sidewalk-furniture', 'overview')).toBe('/spaces/sidewalk-furniture')
    expect(typeTabPath('space', 'sidewalk-furniture', 'solutions')).toBe('/spaces/sidewalk-furniture/solutions')
  })
})

describe('parseTypeTab and typeTabPath (Task U3)', () => {
  it('uses the space tabs for every kind', () => {
    expect(TYPE_TABS).toBe(SPACE_TABS)
    expect(parseTypeTab(undefined)).toBe('overview')
    expect(parseTypeTab('people')).toBeNull()
  })

  it('builds the path of each kind; the overview has no tab segment', () => {
    expect(typeTabPath('space', 'sidewalk-furniture', 'solutions')).toBe('/spaces/sidewalk-furniture/solutions')
    expect(typeTabPath('domain', 'police', 'overview')).toBe('/domains/police')
    expect(typeTabPath('domain', 'police', 'issues')).toBe('/domains/police/issues')
    expect(typeTabPath('solutionType', 'open-data', 'overview')).toBe('/solution-types/open-data')
    expect(typeTabPath('solutionType', 'open-data', 'stakeholders')).toBe('/solution-types/open-data/stakeholders')
  })
})
