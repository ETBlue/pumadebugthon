import { describe, expect, it } from 'vitest'
import crossJson from '@/test/fixtures/cross-issue.json'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { CrossIssueFile, IndexFile, IssueFile, IssueSummary, Stakeholder } from '@/types'
import { crossCoverageIssueNumbers, crossStakeholderCoverage } from './crossIssue'
import { solutionsTabView } from './issueTabs'
import { filterIssues, filterSolutions, filterStakeholders, filterTypes, NO_FILTERS, typeFiltersOn } from './listFilter'
import { compareSolutionItems, solutionItemKey, type ListContext } from './listSort'
import { recentSolutionItems } from './recent'
import { isListed } from './stakeholders'
import { issuesByType } from './typeKinds'

const cross = crossJson as CrossIssueFile
const index = indexJson as IndexFile
const files = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]
const ctx: ListContext = { issues: files, cross }
const all = [...recentSolutionItems(files, cross)].sort(compareSolutionItems)

const numbers = (list: IssueSummary[]) => list.map((i) => i.number)
const spacesOf = (i: IssueSummary): string[] => i.spaces
const issueByNumber = (n: number) => index.issues.find((i) => i.number === n)!
const ids = (list: Stakeholder[]) => list.map((s) => s.id)

/** The fixture files, with #2 S1 changed to have its own 領域 police. No
 * fixture solution has an own 領域, and no fixture issue has police. */
const ownPolice: IssueFile[] = files.map((f) =>
  f.number !== 2
    ? f
    : { ...f, solutions: f.solutions.map((s) => (s.id === 'S1' ? { ...s, domains: ['police'], ownDomains: ['police'] } : s)) },
)

/** index.json to go with ownPolice: #2 uses police too (usedDomains). */
const ownIndex: IndexFile = {
  ...index,
  issues: index.issues.map((i) => (i.number === 2 && i.available ? { ...i, usedDomains: [...i.usedDomains, 'police'] } : i)),
}

describe('filterIssues', () => {
  const stakeholders = index.stakeholders

  it('keeps every issue with no filter, also the 製作中 ones', () => {
    expect(numbers(filterIssues(index.issues, NO_FILTERS, stakeholders))).toEqual(numbers(index.issues))
  })

  it('keeps an issue that uses ANY picked space', () => {
    const [a, b] = [index.issues[0].spaces[0], index.issues[1].spaces[0]]
    const kept = filterIssues(index.issues, { ...NO_FILTERS, spaces: [a, b] }, stakeholders)
    expect(numbers(kept)).toEqual(numbers(index.issues.filter((i) => spacesOf(i).includes(a) || spacesOf(i).includes(b))))
    expect(kept.every((i) => i.available)).toBe(true)
  })

  it('keeps the issues of the picked stakeholder, and ALL filters must match', () => {
    const o09 = stakeholders.find((s) => s.id === 'O09')!
    expect(numbers(filterIssues(index.issues, { ...NO_FILTERS, who: 'I06' }, stakeholders))).toEqual([1, 2, 8, 9])
    expect(numbers(filterIssues(index.issues, { ...NO_FILTERS, who: 'O09' }, stakeholders))).toEqual(o09.issues)
    // A space that no issue of O09 uses: the two filters together keep nothing.
    const space = index.spaceTypes
      .map((t) => t.code)
      .find((c) => index.issues.some((i) => spacesOf(i).includes(c)) && !o09.issues.some((n) => spacesOf(issueByNumber(n)).includes(c)))
    expect(space).toBeDefined()
    expect(filterIssues(index.issues, { ...NO_FILTERS, who: 'O09', spaces: [space!] }, stakeholders)).toEqual([])
    // A space that an issue of O09 uses keeps that issue.
    const used = spacesOf(issueByNumber(o09.issues[0]))[0]
    expect(numbers(filterIssues(index.issues, { ...NO_FILTERS, who: 'O09', spaces: [used] }, stakeholders))).toContain(o09.issues[0])
  })
})

describe('filterIssues: 領域 (Task U5)', () => {
  const stakeholders = index.stakeholders
  const kept = (f: Partial<typeof NO_FILTERS>, from: IndexFile = index) =>
    numbers(filterIssues(from.issues, { ...NO_FILTERS, ...f }, stakeholders))

  it('keeps an issue whose 領域 line has ANY picked 領域', () => {
    expect(kept({ domains: ['health'] })).toEqual([8])
    expect(kept({ domains: ['health', 'civil-affairs'] })).toEqual([8, 9])
    expect(kept({ domains: ['environment'] })).toEqual([1, 2, 8])
  })

  it('keeps an issue with a solution that has the 領域 as its own (usedDomains, the rule of the type pages)', () => {
    expect(kept({ domains: ['police'] }, ownIndex)).toEqual([2])
    expect(kept({ domains: ['police'] })).toEqual([])
    expect(kept({ domains: ['environment'] }, ownIndex)).toEqual([1, 2, 8])
  })

  it('needs ALL filters to match: 空間類型, 領域 and 利害關係人', () => {
    expect(kept({ domains: ['environment'], spaces: ['bike-lane'] })).toEqual([1])
    expect(kept({ domains: ['health'], spaces: ['bike-lane'] })).toEqual([])
    expect(kept({ domains: ['civil-affairs'], who: 'I06' })).toEqual([9])
  })
})

describe('filterStakeholders', () => {
  const listed = index.stakeholders.filter(isListed)

  it('keeps the listed stakeholders with no filter, and leaves out moved IDs', () => {
    expect(ids(filterStakeholders(index.stakeholders, NO_FILTERS, index.issues))).toEqual(ids(listed))
  })

  it('議題: ANY of the picked issues', () => {
    const kept = filterStakeholders(index.stakeholders, { ...NO_FILTERS, issues: [8, 9] }, index.issues)
    expect(ids(kept)).toEqual(ids(listed.filter((s) => s.issues.includes(8) || s.issues.includes(9))))
  })

  it('跨議題 keeps the stakeholders in 2 or more analyzed issues, and works with ANY', () => {
    const crossOnly = filterStakeholders(index.stakeholders, { ...NO_FILTERS, crossChoice: true }, index.issues)
    expect(ids(crossOnly)).toEqual(ids(listed.filter((s) => s.issues.length >= 2)))
    expect(crossOnly.length).toBeGreaterThan(0)
    const either = filterStakeholders(index.stakeholders, { ...NO_FILTERS, crossChoice: true, issues: [9] }, index.issues)
    expect(ids(either)).toEqual(ids(listed.filter((s) => s.issues.length >= 2 || s.issues.includes(9))))
  })

  it('跨議題 counts only analyzed issues', () => {
    const s: Stakeholder = { ...listed[0], issues: [1, 3] }
    expect(filterStakeholders([s], { ...NO_FILTERS, crossChoice: true }, index.issues)).toEqual([])
  })

  it('只看特別關注族群, and ALL filters must match', () => {
    const special = filterStakeholders(index.stakeholders, { ...NO_FILTERS, specialOnly: true }, index.issues)
    expect(ids(special)).toEqual(ids(listed.filter((s) => s.focus.length > 0)))
    const both = filterStakeholders(index.stakeholders, { ...NO_FILTERS, specialOnly: true, issues: [9] }, index.issues)
    expect(ids(both)).toEqual(ids(listed.filter((s) => s.focus.length > 0 && s.issues.includes(9))))
  })
})

describe('filterSolutions', () => {
  const keys = (f: Partial<typeof NO_FILTERS>) => filterSolutions(all, { ...NO_FILTERS, ...f }, ctx).map(solutionItemKey)

  it('keeps every solution with no filter', () => {
    expect(keys({})).toEqual(all.map(solutionItemKey))
  })

  it('議題: the issue solutions of the issue, and the cross-issue solutions with it in parts or in their covered needs', () => {
    const kept = keys({ issues: [1] })
    expect(kept).toContain('X-S5') // X-S5 covers #1 N15 through X-N3.
    expect(kept.filter((k) => !k.startsWith('X-'))).toEqual(['1-S1', '1-S2', '1-S3', '1-S4', '1-S5'])
    const crossKept = cross.solutions.filter((s) => crossCoverageIssueNumbers(cross, s).includes(1)).map((s) => s.code)
    expect(kept.filter((k) => k.startsWith('X-'))).toEqual(crossKept)
  })

  it('跨議題解法 keeps only the cross-issue solutions, and works with ANY', () => {
    expect(keys({ crossChoice: true })).toEqual(['X-S1', 'X-S2', 'X-S3', 'X-S4', 'X-S5'])
    expect(keys({ crossChoice: true, issues: [9] })).toEqual(['X-S1', 'X-S2', 'X-S3', 'X-S4', 'X-S5', '9-S1', '9-S2', '9-S3', '9-S4', '9-S5'])
  })

  it('空間類型: ANY of the picked spaces, for both kinds', () => {
    const space = cross.solutions[0].spaces[0]
    const kept = filterSolutions(all, { ...NO_FILTERS, spaces: [space] }, ctx)
    expect(kept.map(solutionItemKey)).toEqual(all.filter((x) => x.solution.spaces.includes(space)).map(solutionItemKey))
    expect(kept.some((x) => x.kind === 'cross')).toBe(true)
  })

  it('利害關係人: the same solutions as the issue 解法 tab, and the cross-issue solutions that cover one of its needs', () => {
    for (const who of ['I06', 'O09', 'O12']) {
      const kept = keys({ who })
      const issueSide = files.flatMap((f) => solutionsTabView(f, who, false).map((x) => `${f.number}-${x.solution.id}`))
      const crossSide = cross.solutions
        .filter((s) => crossStakeholderCoverage(cross, s, files).covered.some((e) => e.id === who))
        .map((s) => s.code)
      expect(kept).toEqual([...crossSide, ...issueSide])
    }
  })

  it('works with no cross-issue file', () => {
    const issueOnly = all.filter((x) => x.kind === 'issue')
    expect(filterSolutions(issueOnly, { ...NO_FILTERS, issues: [1], who: 'I06' }, { issues: files, cross: null }).length).toBeGreaterThan(0)
  })
})

describe('filterSolutions: 領域 and 解法類型 (Task U5)', () => {
  const keys = (f: Partial<typeof NO_FILTERS>, c: ListContext = ctx) =>
    filterSolutions(c === ctx ? all : [...recentSolutionItems(c.issues, c.cross)].sort(compareSolutionItems), { ...NO_FILTERS, ...f }, c).map(solutionItemKey)

  it('領域: an issue solution matches by its domains (the issue 領域 when it has no own)', () => {
    expect(keys({ domains: ['health'] })).toEqual(['X-S1', 'X-S2', 'X-S3', 'X-S4', 'X-S5', '8-S1', '8-S2', '8-S3', '8-S4', '8-S5'])
  })

  it('領域: an X- solution matches by the union of the 領域 of its parts', () => {
    expect(keys({ domains: ['civil-affairs'] })).toEqual(['X-S4', '9-S1', '9-S2', '9-S3', '9-S4', '9-S5'])
  })

  it('領域: a solution with its own 領域 matches by it, not by the issue 領域', () => {
    const own: ListContext = { issues: ownPolice, cross }
    expect(keys({ domains: ['police'] }, own)).toEqual(['2-S1'])
    expect(keys({ domains: ['environment'] }, own)).not.toContain('2-S1')
    expect(keys({ domains: ['environment'] }, own)).toContain('2-S2')
  })

  it('解法類型: ANY of the picked types, for both kinds', () => {
    expect(keys({ solutionTypes: ['enforcement'] })).toEqual(['8-S4'])
    expect(keys({ solutionTypes: ['open-data', 'enforcement'] })).toEqual(['X-S4', '1-S2', '2-S3', '8-S3', '8-S4', '9-S4'])
  })

  it('needs ALL filters to match', () => {
    expect(keys({ domains: ['administration'], solutionTypes: ['digital-tool'] })).toEqual(['X-S4'])
    expect(keys({ domains: ['health'], solutionTypes: ['open-data'], spaces: ['bus-stop'] })).toEqual(['8-S3'])
    expect(keys({ domains: ['administration'], solutionTypes: ['digital-tool'], issues: [9] })).toEqual(['X-S4'])
    expect(keys({ solutionTypes: ['enforcement'], issues: [1] })).toEqual([])
  })
})

describe('typeFiltersOn', () => {
  it('is true when a 空間類型, 領域 or 解法類型 filter is on', () => {
    expect(typeFiltersOn(NO_FILTERS)).toBe(false)
    expect(typeFiltersOn({ ...NO_FILTERS, who: 'I06', issues: [1] })).toBe(false)
    expect(typeFiltersOn({ ...NO_FILTERS, spaces: ['park'] })).toBe(true)
    expect(typeFiltersOn({ ...NO_FILTERS, domains: ['health'] })).toBe(true)
    expect(typeFiltersOn({ ...NO_FILTERS, solutionTypes: ['service'] })).toBe(true)
  })
})

// Before Task U7 these cases tested filterSpaces, a wrapper over
// filterTypes. They now call filterTypes with the space types, and the
// issues of a space from issuesByType, as the #/spaces page does.
describe('filterTypes with the space types (decision 122)', () => {
  const spaceIssues = (code: string) => issuesByType('space', index, [], code).map((i) => i.number)
  const codes = (f: Partial<typeof NO_FILTERS>) =>
    filterTypes(index.spaceTypes, { ...NO_FILTERS, ...f }, spaceIssues).map((s) => s.code)

  it('keeps every space in the data order with no filter', () => {
    expect(codes({})).toEqual(index.spaceTypes.map((s) => s.code))
  })

  it('keeps the spaces of any picked group', () => {
    expect(codes({ groups: ['地下'] })).toEqual(['sewer', 'utility'])
    expect(codes({ groups: ['地下', '建築'] })).toEqual(['sewer', 'utility', 'indoor-home', 'building-shell'])
  })

  it('keeps the spaces that any picked issue uses, and hides the unused spaces', () => {
    expect(codes({ issues: [1] })).toEqual(['sidewalk-furniture', 'bike-lane', 'utility', 'park'])
    expect(codes({ issues: [1, 2] })).toEqual(['sidewalk-furniture', 'arcade', 'bike-lane', 'utility', 'park', 'mrt-exit'])
    expect(codes({ issues: [1] })).not.toContain('parking')
  })

  it('needs both filters to match', () => {
    expect(codes({ issues: [1], groups: ['道路'] })).toEqual(['sidewalk-furniture', 'bike-lane'])
    expect(codes({ issues: [1], groups: ['建築'] })).toEqual([])
  })
})
