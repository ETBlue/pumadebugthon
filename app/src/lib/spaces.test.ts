// sameSpaceIssues (design 3.2 「使用相同空間的議題」). The other space cases
// moved to typeKinds.test.ts in Task U7, with the kind 'space'.
import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { sameSpaceIssues } from './spaces'

const index = indexJson as IndexFile

describe('sameSpaceIssues', () => {
  it('#2 shares spaces with #1 and #8, in the order of the #2 space list', () => {
    expect(sameSpaceIssues(index, 2)).toEqual([
      { code: 'sidewalk-furniture', issues: [1, 8] },
      { code: 'arcade', issues: [8] },
      { code: 'park', issues: [1, 8] },
      { code: 'mrt-exit', issues: [8] },
    ])
  })

  it('#1 shares sidewalk-furniture and park with #2 and #8', () => {
    expect(sameSpaceIssues(index, 1)).toEqual([
      { code: 'sidewalk-furniture', issues: [2, 8] },
      { code: 'park', issues: [2, 8] },
    ])
  })

  it('is empty when no other issue uses the same space, or for an unknown issue', () => {
    const only2: IndexFile = { ...index, issues: index.issues.filter((i) => i.number === 2) }
    expect(sameSpaceIssues(only2, 2)).toEqual([])
    expect(sameSpaceIssues(index, 3)).toEqual([])
    expect(sameSpaceIssues(index, 99)).toEqual([])
  })
})

describe('an issue with no space type (#9, 空間類型：無)', () => {
  it('has no other issues with the same space', () => {
    expect(sameSpaceIssues(index, 9)).toEqual([])
  })
})
