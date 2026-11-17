// The need list (plan-needs.md, Task N2): one record per need of every issue,
// for the 需求 list #/needs and the need page #/needs/<key>.
// A need is a row of step 5.2 (`needs` in the issue JSON): an N group, or one
// story in no N group. Two issues can have the same need ID (1-N01, 2-N01),
// so the key has the issue number.
// This file only builds the records. It reuses the coverage rule of
// coverage.ts (crossSolutionsByNeed, decisions 60 and 84) and the need items
// and the 只看有資料根據 rule of needs.ts (issueNeeds, needIsDataBased).
// It is a separate file so needs.ts does not import coverage.ts
// (coverage.ts imports needs.ts).
// Order is always the fixed ID order. Nothing here sorts by a count.
import type { CellCounts, CrossIssueFile, CrossNeedGroup, IssueFile, Need, Story } from '@/types'
import { storyCells } from './cellBasis'
import { crossSolutionsByNeed, evidenceShare, type Share } from './coverage'
import { compareCodes, compareIds } from './ids'
import { issueNeeds, needIsDataBased, type NeedItem } from './needs'

/** One need of one issue. */
export interface NeedRecord {
  /** `<issue>-<need id>`, for example "1-N01" or "2-O04-US02". */
  key: string
  /** The issue number. */
  issue: number
  need: Need
  /** The stories of the need, in the order of the 5.2 row. */
  stories: Story[]
  /** The stakeholders of its stories, each once, in ID order (compareIds). */
  stakeholders: string[]
  /** 空間: the issue's space codes, then the codes of its covering solutions
   * (in the order of `solutions`), each code once. A need with no covering
   * solution has the issue's codes. */
  spaces: string[]
  /** 領域: the same rule as spaces, with the 領域 codes. */
  domains: string[]
  /** The covering solutions as keys: the issue solutions ("2-S1") and the
   * cross-issue solutions ("X-S4"), in code order (compareCodes), so the
   * issue solutions come first. A cross-issue solution covers the need when
   * it lists it in needs.must or needs.shouldCould, or lists its X-N group
   * in needs.crossIssue (decision 60). */
  solutions: string[]
  /** The IDs of the X-N groups that have this need, in code order. Usually
   * zero or one. */
  crossGroups: string[]
  /** 解法涵蓋 有: at least one covering solution, and the need is not W
   * (這次不做). A W need is always 尚無 (decision 50). */
  covered: boolean
  /** The 我想要… and 以便… cells of its stories by tag, each story once (the
   * unit of design 3.23.4). For the 資料根據比例 sort. */
  cells: CellCounts
}

/** The key of a need: `<issue>-<need id>`. */
export function needRecordKey(issue: number, id: string): string {
  return `${issue}-${id}`
}

const KEY = /^([1-9]\d*)-(N\d+|[OI]\d+-US\d+)$/

/** The issue number and need ID of a key: "2-O04-US02" gives issue 2 and
 * ID "O04-US02". null for any other text. */
export function parseNeedKey(text: string): { issue: number; id: string } | null {
  const m = KEY.exec(text)
  return m ? { issue: Number(m[1]), id: m[2] } : null
}

/** The X-N groups of cross-issue.json that list the need of the issue, in
 * code order. */
export function crossGroupsOfNeed(cross: CrossIssueFile | null, issue: number, id: string): CrossNeedGroup[] {
  if (cross === null) return []
  return cross.needGroups
    .filter((g) => g.needs.some((n) => n.issue === issue && n.id === id))
    .sort((a, b) => compareCodes(a.id, b.id))
}

/** Codes of each list, in list order, each once. */
function uniqueInOrder(lists: readonly (readonly string[])[]): string[] {
  return [...new Set(lists.flat())]
}

function needRecord(
  issue: IssueFile,
  cross: CrossIssueFile | null,
  item: NeedItem,
  crossByNeed: ReturnType<typeof crossSolutionsByNeed>,
): NeedRecord {
  const id = item.need.id
  const crossSolutions = [...(crossByNeed.get(id) ?? [])].sort((a, b) => compareCodes(a.code, b.code))
  // item.solutions is in code order already (needs.ts).
  const issueSolutions = item.solutions.map((s) => s.solution)
  const covering = [...issueSolutions, ...crossSolutions]
  return {
    key: needRecordKey(issue.number, id),
    issue: issue.number,
    need: item.need,
    stories: item.stories,
    stakeholders: item.stakeholders,
    spaces: uniqueInOrder([issue.spaces, ...covering.map((s) => s.spaces)]),
    domains: uniqueInOrder([issue.domains, ...covering.map((s) => s.domains)]),
    solutions: [
      ...issueSolutions.map((s) => `${issue.number}-${s.id}`),
      ...crossSolutions.map((s) => s.code),
    ].sort(compareCodes),
    crossGroups: crossGroupsOfNeed(cross, issue.number, id).map((g) => g.id),
    covered: item.need.priority !== 'W' && covering.length > 0,
    cells: storyCells(item.stories),
  }
}

function issueRecords(issue: IssueFile, cross: CrossIssueFile | null): NeedRecord[] {
  const crossByNeed = crossSolutionsByNeed(cross, issue.number)
  return issueNeeds(issue).map((item) => needRecord(issue, cross, item, crossByNeed))
}

function compareRecords(a: NeedRecord, b: NeedRecord): number {
  return a.issue - b.issue || compareIds(a.need.id, b.need.id)
}

/** One record per need of the given issue files, in the fixed order: by
 * issue number, then need ID (compareIds). cross is null when
 * cross-issue.json does not exist or is not loaded; then no X- solution
 * covers a need and no need has an X-N group. */
export function needRecords(issues: IssueFile[], cross: CrossIssueFile | null): NeedRecord[] {
  return issues.flatMap((issue) => issueRecords(issue, cross)).sort(compareRecords)
}

/** The record of one key, or null when the key is not a need key, or its
 * issue or need is not in the files. */
export function needByKey(issues: IssueFile[], cross: CrossIssueFile | null, key: string): NeedRecord | null {
  const parsed = parseNeedKey(key)
  if (parsed === null) return null
  const issue = issues.find((i) => i.number === parsed.issue)
  if (!issue) return null
  return issueRecords(issue, cross).find((r) => r.need.id === parsed.id) ?? null
}

/** 只看有資料根據 on the need list: the same rule as the issue's 需求 tab
 * (needIsDataBased in needs.ts). True when at least one of its stories has
 * a 以便… cell tagged 實證 or AI整理. The 我想要… cell is not checked. The
 * need summary is not checked either: it is always AI模擬. */
export function needHasDataBasis(record: Pick<NeedRecord, 'stories'>): boolean {
  return needIsDataBased(record)
}

/** 資料根據比例 of a need: its cells tagged 實證 or AI整理, of all its cells
 * (evidenceShare, the unit of design 3.23.4). Only for the sort the reader
 * picks. null when the need has no story. */
export function needShare(record: Pick<NeedRecord, 'cells'>): Share | null {
  return evidenceShare(record.cells)
}
