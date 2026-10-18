// 資料根據 (design 3.2, 3.9): what the story cells of an issue are based on.
// build_json.py counts the cells (counts.cells in index.json). This file only
// orders the parts and makes the numbers for the text and the bar.
// Never sort, rank or filter issues by these numbers (design 13).
import type { CellCounts, Story, Tag } from '@/types'

export type BasisKey = keyof CellCounts

/** The fixed order of the parts: 實證, AI整理, AI模擬, 待補. */
export const BASIS_ORDER: readonly BasisKey[] = ['evidence', 'aiSummary', 'aiSimulated', 'pending']

export interface BasisPart {
  key: BasisKey
  count: number
}

/** All cells: 2 x the number of stories. */
export function basisTotal(cells: CellCounts): number {
  return BASIS_ORDER.reduce((sum, key) => sum + cells[key], 0)
}

/** The parts for the text, in the fixed order. 實證, AI整理 and AI模擬 are
 * always listed, also when 0. 待補 is listed only when there is one or more. */
export function basisTextParts(cells: CellCounts): BasisPart[] {
  return BASIS_ORDER.filter((key) => key !== 'pending' || cells.pending > 0).map((key) => ({ key, count: cells[key] }))
}

/** The bar segments, in the fixed order. A part with 0 cells has no segment.
 * width is the exact share of all cells, in percent (not rounded). */
export function basisBar(cells: CellCounts): (BasisPart & { width: number })[] {
  const total = basisTotal(cells)
  if (total === 0) return []
  return BASIS_ORDER.filter((key) => cells[key] > 0).map((key) => ({
    key,
    count: cells[key],
    width: (cells[key] / total) * 100,
  }))
}

/** The 實證 share of all cells, as a whole percent. null when there are no cells.
 * Rounding: to the nearest whole number, a half rounds up (12.5 -> 13).
 * Two limits, so the number never hides a cell: at least 1 when there is a
 * 實證 cell, and at most 99 when not every cell is 實證. */
export function evidencePercent(cells: CellCounts): number | null {
  const total = basisTotal(cells)
  if (total === 0) return null
  const e = cells.evidence
  // Integer math for round half up of 100 * e / total, so there is no float error.
  const rounded = Math.floor((200 * e + total) / (2 * total))
  if (e > 0 && rounded < 1) return 1
  if (e < total && rounded > 99) return 99
  return rounded
}

const TAG_KEY: Record<Exclude<Tag, null>, BasisKey> = { 實證: 'evidence', AI整理: 'aiSummary', AI模擬: 'aiSimulated' }

/** 資料根據 of some stories: the 我想要… and 以便… cells by tag, the same rule
 * as build_json.py (cell_basis). A cell with no tag counts as 待補. */
export function storyCells(stories: Story[]): CellCounts {
  const out: CellCounts = { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 }
  for (const s of stories) {
    for (const c of [s.want, s.soThat]) out[c.tag === null ? 'pending' : TAG_KEY[c.tag]] += 1
  }
  return out
}
