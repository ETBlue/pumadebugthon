import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import crossJson from '@/test/fixtures/cross-issue.json'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'
import { crossSolutionCells, solutionCells } from './coverage'
import { findCrossSolution } from './crossIssue'
import { filterSolutions, NO_FILTERS } from './listFilter'
import { compareSolutionItems, solutionItemKey, sortSolutions, type ListContext } from './listSort'
import { recentSolutionItems, type RecentSolution } from './recent'
import {
  coveredNeedCount, crossAlsoCovers, solutionItemCells, solutionListItems, solutionListView, solutionSpaceOptions,
  solutionsParams,
} from './solutionList'
import { solutionTabCounts } from './tabCounts'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile
const cross = crossJson as CrossIssueFile
const all = [smokefree, trees, trashcans]

const keys = (list: RecentSolution[]) => list.map(solutionItemKey)
const files = [trees, trashcans, smokefree, policy]
const ctx: ListContext = { issues: files, cross }
// Out of order on purpose: solutionListItems must use the fixed ID order.
const items = solutionListItems([policy, smokefree, trashcans, trees], cross)
const view = (search: string) => solutionListView(items, solutionsParams(new URLSearchParams(search), index, files, cross), ctx)
const codesS1 = ['1-S1', '2-S1', '8-S1', '9-S1', 'X-S1']

describe('solutionListItems', () => {
  it('gives every issue solution and every cross-issue solution in the fixed ID order', () => {
    expect(keys(items)).toEqual(keys([...items].sort(compareSolutionItems)))
    expect(keys(items).slice(0, 6)).toEqual(['X-S1', 'X-S2', 'X-S3', 'X-S4', 'X-S5', '1-S1'])
    expect(items).toHaveLength(25)
  })

  it('has no cross-issue item without cross-issue.json', () => {
    expect(solutionListItems(files, null).every((x) => x.kind === 'issue')).toBe(true)
    expect(solutionListItems(files, null)).toHaveLength(20)
  })
})

describe('solutionsParams', () => {
  it('reads the list params of #/solutions', () => {
    const p = solutionsParams(new URLSearchParams('sort=evidence&issue=X&issue=2'), index, files, cross)
    expect(p).toMatchObject({ crossChoice: true, issues: [2], sort: 'evidence', replace: false })
  })

  it('drops 「跨議題解法」 (issue=X) with replace when cross-issue.json does not exist', () => {
    const p = solutionsParams(new URLSearchParams('issue=X&issue=2'), index, files, null)
    expect(p).toMatchObject({ crossChoice: false, issues: [2], replace: true })
  })

  it('drops a space code that no solution uses', () => {
    const used = new Set(solutionSpaceOptions(index.spaceTypes, files, cross).map((s) => s.code))
    const unused = index.spaceTypes.find((s) => !used.has(s.code))
    if (unused) {
      expect(solutionsParams(new URLSearchParams(`space=${unused.code}`), index, files, cross)).toMatchObject({ spaces: [], replace: true })
    }
    expect(solutionsParams(new URLSearchParams('space=nothing'), index, files, cross)).toMatchObject({ spaces: [], replace: true })
  })

  it('keeps a space code that only a cross-issue solution uses', () => {
    const issueSpaces = new Set(solutionSpaceOptions(index.spaceTypes, files, null).map((s) => s.code))
    const crossOnly = solutionSpaceOptions(index.spaceTypes, files, cross).find((s) => !issueSpaces.has(s.code))
    if (crossOnly) {
      expect(solutionsParams(new URLSearchParams(`space=${crossOnly.code}`), index, files, cross)).toMatchObject({
        spaces: [crossOnly.code],
        replace: false,
      })
    }
  })
})

describe('solutionListView (filter, then search, then sort)', () => {
  it('shows all 25 items with no filter, in the order of the sort', () => {
    expect(keys(view(''))).toEqual(keys(sortSolutions(items, 'updated', ctx)))
    expect(keys(view('sort=evidence'))).toEqual(keys(sortSolutions(items, 'evidence', ctx)))
  })

  it('the default sort (最近更新) gives the same first 5 as the home block (decision 131)', () => {
    expect(keys(view('').slice(0, 5))).toEqual(keys(recentSolutionItems(files, cross, 5)))
  })

  it('?issue=1 includes X-S5, which covers a need of #1 but has no part in #1', () => {
    const shown = keys(view('issue=1'))
    expect(shown).toContain('X-S5')
    expect(shown).toContain('1-S1')
    expect(shown.filter((k) => /^\d/.test(k)).every((k) => k.startsWith('1-'))).toBe(true)
  })

  it('?issue=X shows only X-S1 to X-S5', () => {
    expect(keys(view('issue=X')).sort()).toEqual(['X-S1', 'X-S2', 'X-S3', 'X-S4', 'X-S5'])
  })

  it('?who=I06 shows only the solutions that cover a need of I06', () => {
    const shown = keys(view('who=I06'))
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.length).toBeLessThan(25)
    expect(shown).toEqual(keys(sortSolutions(filterSolutions(items, { ...NO_FILTERS, who: 'I06' }, ctx), 'updated', ctx)))
  })

  it('?q=S1 shows #1 S1, #2 S1, #8 S1, #9 S1 and X-S1 in the order of the sort', () => {
    expect(keys(view('q=S1')).sort()).toEqual(codesS1)
    for (const sort of ['updated', 'added', 'evidence'] as const) {
      const order = keys(sortSolutions(items, sort, ctx)).filter((k) => codesS1.includes(k))
      expect(keys(view(`q=S1&sort=${sort}`))).toEqual(order)
    }
  })

  it('?q=X-S1 shows only X-S1, and ?q=%232%20S1 shows only #2 S1', () => {
    expect(keys(view('q=X-S1'))).toEqual(['X-S1'])
    expect(keys(view('q=%232%20S1'))).toEqual(['2-S1'])
  })

  it('?q=S1&who=I06 shows only the solutions S1 that cover a need of I06', () => {
    const withWho = keys(view('who=I06'))
    expect(keys(view('q=S1&who=I06'))).toEqual(withWho.filter((k) => codesS1.includes(k)))
  })
})

describe('crossAlsoCovers (「也涵蓋 #1 的需求」)', () => {
  it('X-S5 also covers needs of #1, which is not in its parts', () => {
    expect(crossAlsoCovers(cross, findCrossSolution(cross, 'X-S5')!)).toEqual([1])
  })

  it('never lists an issue of the parts', () => {
    for (const sol of cross.solutions) {
      const parts = new Set(sol.parts.map((p) => p.issue))
      expect(crossAlsoCovers(cross, sol).some((n) => parts.has(n))).toBe(false)
    }
  })
})

describe('solutionItemCells', () => {
  it('uses the cells of the stories of the covered needs (design 3.23.4)', () => {
    const a = items.find((x) => solutionItemKey(x) === '2-S1')!
    expect(solutionItemCells(a, ctx)).toEqual(solutionCells(trashcans, trashcans.solutions[0]))
    const xa = items.find((x) => solutionItemKey(x) === 'X-S1')!
    expect(solutionItemCells(xa, ctx)).toEqual(crossSolutionCells(cross, findCrossSolution(cross, 'X-S1')!, files))
  })
})

describe('solutionSpaceOptions', () => {
  it('lists the space types that a solution uses, in the order of space-types.csv', () => {
    const codes = solutionSpaceOptions(index.spaceTypes, all).map((s) => s.code)
    const used = new Set(all.flatMap((i) => i.solutions.flatMap((s) => s.spaces)))
    expect(new Set(codes)).toEqual(used)
    const order = index.spaceTypes.map((s) => s.code).filter((c) => used.has(c))
    expect(codes).toEqual(order)
  })

  it('adds the space types of the cross-issue solutions, once each, in the same order', () => {
    const cross = { solutions: [{ spaces: ['utility', 'sidewalk-furniture'] }] } as unknown as CrossIssueFile
    const codes = solutionSpaceOptions(index.spaceTypes, [trashcans], cross).map((s) => s.code)
    const used = new Set([...trashcans.solutions.flatMap((s) => s.spaces), 'utility', 'sidewalk-furniture'])
    expect(codes).toEqual(index.spaceTypes.map((s) => s.code).filter((c) => used.has(c)))
    expect(solutionSpaceOptions(index.spaceTypes, [trashcans], null)).toEqual(solutionSpaceOptions(index.spaceTypes, [trashcans]))
  })
})

describe('coveredNeedCount', () => {
  it('#2 S1 covers 9 needs (6.2 of #2: Must and Should / Could)', () => {
    expect(coveredNeedCount(trashcans, trashcans.solutions[0])).toBe(9)
  })

  it('is the same number as the covered count of the solution page tab, for every solution', () => {
    for (const issue of [trees, trashcans, smokefree, policy]) {
      for (const sol of issue.solutions) {
        expect(coveredNeedCount(issue, sol)).toBe(solutionTabCounts(issue, sol).needs.covered)
      }
    }
  })

  it('is null for a solution with no need list (the old format)', () => {
    expect(coveredNeedCount(trashcans, { ...trashcans.solutions[0], needs: null })).toBeNull()
  })
})
