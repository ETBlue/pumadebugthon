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
import { filterIssues, filterSolutions, filterStakeholders, NO_FILTERS } from './listFilter'
import { compareSolutionItems, solutionItemKey, type ListContext } from './listSort'
import { recentSolutionItems } from './recent'
import { isListed } from './stakeholders'

const cross = crossJson as CrossIssueFile
const index = indexJson as IndexFile
const files = [treesJson, trashcansJson, smokefreeJson, policyJson] as IssueFile[]
const ctx: ListContext = { issues: files, cross }
const all = [...recentSolutionItems(files, cross)].sort(compareSolutionItems)

const numbers = (list: IssueSummary[]) => list.map((i) => i.number)
const spacesOf = (i: IssueSummary): string[] => i.spaces
const issueByNumber = (n: number) => index.issues.find((i) => i.number === n)!
const ids = (list: Stakeholder[]) => list.map((s) => s.id)

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
    expect(kept).toContain('X-E') // X-E covers #1 N15 through X-N03.
    expect(kept.filter((k) => !k.startsWith('X-'))).toEqual(['1-A', '1-B', '1-C', '1-D', '1-E'])
    const crossKept = cross.solutions.filter((s) => crossCoverageIssueNumbers(cross, s).includes(1)).map((s) => s.code)
    expect(kept.filter((k) => k.startsWith('X-'))).toEqual(crossKept)
  })

  it('跨議題解法 keeps only the cross-issue solutions, and works with ANY', () => {
    expect(keys({ crossChoice: true })).toEqual(['X-A', 'X-B', 'X-C', 'X-D', 'X-E'])
    expect(keys({ crossChoice: true, issues: [9] })).toEqual(['X-A', 'X-B', 'X-C', 'X-D', 'X-E', '9-A', '9-B', '9-C', '9-D', '9-E'])
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
