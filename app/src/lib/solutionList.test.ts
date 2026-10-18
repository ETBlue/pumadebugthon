import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { IndexFile, IssueFile } from '@/types'
import { solutionGroups, solutionSpaceOptions } from './solutionList'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const all = [smokefree, trees, trashcans]

const shape = (groups: ReturnType<typeof solutionGroups>) =>
  groups.map((g) => `${g.issueNumber}:${g.solutions.map((s) => s.id).join('')}`)

describe('solutionGroups', () => {
  it('groups every solution by issue, in issue number order, then file order', () => {
    const groups = solutionGroups(all, { spaces: [], issues: [] })
    expect(shape(groups)).toEqual(['1:ABCDE', '2:ABCDE', '8:ABCDE'])
    expect(groups[1].title).toBe('找回消失的垃圾桶')
  })

  it('keeps solutions that use ANY of the picked space types', () => {
    expect(shape(solutionGroups(all, { spaces: ['mrt-exit'], issues: [] }))).toEqual(['2:ABC', '8:ABCD'])
    expect(shape(solutionGroups(all, { spaces: ['mrt-exit', 'utility'], issues: [] }))).toEqual(['1:AD', '2:ABC', '8:ABCD'])
  })

  it('uses both filters together', () => {
    expect(shape(solutionGroups(all, { spaces: ['arcade'], issues: [2] }))).toEqual(['2:CD'])
  })

  it('keeps only the picked issues', () => {
    expect(shape(solutionGroups(all, { spaces: [], issues: [2, 8] }))).toEqual(['2:ABCDE', '8:ABCDE'])
  })

  it('leaves out an issue with no matching solution', () => {
    // #1 uses bike-lane; no solution of #2 or #8 does.
    expect(shape(solutionGroups(all, { spaces: ['bike-lane'], issues: [] }))).toEqual(['1:AD'])
  })

  it('is not changed by the number of stories', () => {
    // Story counts in no order: A 3, B 9, C 1, D 7, E 5.
    const sizes = [3, 9, 1, 7, 5]
    const many = { ...trashcans, solutions: trashcans.solutions.map((s, i) => ({ ...s, stories: Array(sizes[i]).fill('x') })) }
    expect(shape(solutionGroups([many], { spaces: [], issues: [] }))).toEqual(['2:ABCDE'])
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
})
