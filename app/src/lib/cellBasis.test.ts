import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { CellCounts, IndexFile, IssueFile } from '@/types'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import { BASIS_ORDER, basisBar, basisTextParts, basisTotal, evidencePercent, storyCells } from './cellBasis'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const cellsOf = (n: number): CellCounts => {
  const i = index.issues.find((x) => x.number === n)
  if (!i?.available) throw new Error(`#${n} is not available`)
  return i.counts.cells
}
const cells = (evidence: number, aiSummary: number, aiSimulated: number, pending = 0): CellCounts =>
  ({ evidence, aiSummary, aiSimulated, pending })

describe('BASIS_ORDER', () => {
  it('is the fixed order 實證, AI整理, AI模擬, 待補', () => {
    expect(BASIS_ORDER).toEqual(['evidence', 'aiSummary', 'aiSimulated', 'pending'])
  })
})

describe('basisTotal', () => {
  it('adds all four parts', () => {
    expect(basisTotal(cells(8, 21, 72, 1))).toBe(102)
  })
})

describe('basisTextParts', () => {
  it('always lists 實證, AI整理 and AI模擬, in the fixed order, also when 0', () => {
    expect(basisTextParts(cells(0, 27, 95))).toEqual([
      { key: 'evidence', count: 0 },
      { key: 'aiSummary', count: 27 },
      { key: 'aiSimulated', count: 95 },
    ])
  })

  it('lists 待補 last, only when there is at least one 待補 cell', () => {
    expect(basisTextParts(cells(8, 21, 72, 1)).map((p) => p.key)).toEqual(BASIS_ORDER)
  })
})

describe('basisBar', () => {
  it('gives each part with cells a width in percent, in the fixed order', () => {
    expect(basisBar(cells(1, 0, 2, 1))).toEqual([
      { key: 'evidence', count: 1, width: 25 },
      { key: 'aiSimulated', count: 2, width: 50 },
      { key: 'pending', count: 1, width: 25 },
    ])
  })

  it('is empty when there are no cells', () => {
    expect(basisBar(cells(0, 0, 0))).toEqual([])
  })
})

describe('evidencePercent', () => {
  it('rounds to the nearest whole percent', () => {
    expect(evidencePercent(cells(8, 27, 95))).toBe(6) // 6.15
    expect(evidencePercent(cells(8, 21, 72, 1))).toBe(8) // 7.84
    expect(evidencePercent(cells(3, 39, 48))).toBe(3) // 3.33
  })

  it('rounds a half up', () => {
    expect(evidencePercent(cells(1, 7, 0))).toBe(13) // 12.5
    expect(evidencePercent(cells(1, 199, 0))).toBe(1) // 0.5
  })

  it('shows at least 1 when there is a 實證 cell, and at most 99 when not every cell is 實證', () => {
    expect(evidencePercent(cells(1, 300, 0))).toBe(1) // 0.33
    expect(evidencePercent(cells(300, 1, 0))).toBe(99) // 99.67
  })

  it('is 0 with no 實證 cell and 100 when every cell is 實證', () => {
    expect(evidencePercent(cells(0, 5, 5))).toBe(0)
    expect(evidencePercent(cells(4, 0, 0))).toBe(100)
  })

  it('is null when there are no cells', () => {
    expect(evidencePercent(cells(0, 0, 0))).toBeNull()
  })
})

describe('the fixture issues', () => {
  it('match the counts in index.json (want + soThat)', () => {
    expect(cellsOf(1)).toEqual(cells(10, 27, 95, 0))
    expect(cellsOf(2)).toEqual(cells(10, 21, 72, 1))
    expect(cellsOf(8)).toEqual(cells(3, 39, 48, 0))
    expect([1, 2, 8].map((n) => evidencePercent(cellsOf(n)))).toEqual([8, 10, 3])
  })
})

describe('storyCells', () => {
  it('counts the 我想要… and 以便… cells by tag, the same as build_json.py', () => {
    for (const f of [trees, trashcans, smokefree]) expect(storyCells(f.stories)).toEqual(cellsOf(f.number))
    expect(storyCells([])).toEqual(cells(0, 0, 0, 0))
  })
})
