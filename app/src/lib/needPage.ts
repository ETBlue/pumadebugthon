// Lookups for the need page #/needs/<key> (plan-needs.md, Task N4).
// The page reuses the need records (needRecords.ts) and the conflict views
// of the issue page (wantList.ts) and of the cross-issue solution page
// (crossIssue.ts).
// Order is always the fixed ID order or the file order. Nothing here sorts
// by a count.
import type { CrossConflict, CrossIssueFile, CrossNeedGroup, CrossSolution, IssueFile, Solution } from '@/types'
import { crossConflictView, type CrossConflictView } from './crossIssue'
import { NEED_TABS, type NeedTab } from './entityPaths'
import { compareCodes, compareIds } from './ids'
import { needListItems, type NeedListItem } from './needList'
import { crossGroupsOfNeed, needRecordKey, parseNeedKey } from './needRecords'
import { conflictView, type ConflictView } from './wantList'

/** The part of a solution that covers the need: 涵蓋的 Must, 涵蓋的 Should /
 * Could (step 6.2 and needs.must / needs.shouldCould of a cross-issue
 * solution), or crossIssue: a cross-issue solution that covers the need only
 * through its X-N group (needs.crossIssue, decision 60). */
export type NeedSolutionPart = 'must' | 'shouldCould' | 'crossIssue'

export interface NeedSolutionGroup {
  part: NeedSolutionPart
  /** The issue solutions, in code order (S2 before S10). */
  issue: Solution[]
  /** The cross-issue solutions, in code order. They come after the issue
   * solutions. */
  cross: CrossSolution[]
}

/** One X-N group of the need, with the needs of the other issues in it. */
export interface SameNeedGroup {
  group: CrossNeedGroup
  /** The other needs of the group, in the fixed order: issue number, then
   * need ID. A need whose issue file is not loaded is left out. */
  needs: NeedListItem[]
}

export interface NeedPageView {
  /** The need, with its summary (needListItems). */
  item: NeedListItem
  /** The issue file of the need. */
  issue: IssueFile
  /** The covering solutions, by part, in the order must, shouldCould,
   * crossIssue. An empty part is left out. */
  solutionGroups: NeedSolutionGroup[]
  /** The issue conflicts that list the need in needsA or needsB, in file order. */
  issueConflicts: ConflictView[]
  /** The cross-issue conflicts that list the need, or one of its X-N
   * groups, in needsA or needsB, in file order. */
  crossConflicts: CrossConflictView[]
  /** Its X-N groups (usually zero or one), in code order. */
  sameNeeds: SameNeedGroup[]
}

/** The part that covers the need, for one cross-issue solution. must and
 * shouldCould come first; crossIssue is only for a need in neither. */
function crossPart(solution: CrossSolution, issue: number, id: string): NeedSolutionPart {
  const has = (refs: CrossSolution['needs']['must']) => refs.some((r) => r.issue === issue && r.id === id)
  if (has(solution.needs.must)) return 'must'
  if (has(solution.needs.shouldCould)) return 'shouldCould'
  return 'crossIssue'
}

const PARTS: readonly NeedSolutionPart[] = ['must', 'shouldCould', 'crossIssue']

function solutionGroups(item: NeedListItem, issue: IssueFile, cross: CrossIssueFile | null): NeedSolutionGroup[] {
  const id = item.need.id
  // item.solutions holds the keys of the covering solutions ("2-S1", "X-S4").
  const issueSolutions = issue.solutions
    .filter((s) => item.solutions.includes(needRecordKey(issue.number, s.id)))
    .sort((a, b) => compareIds(a.id, b.id))
  const crossSolutions = (cross?.solutions ?? [])
    .filter((s) => item.solutions.includes(s.code))
    .sort((a, b) => compareCodes(a.code, b.code))
  const issuePart = (s: Solution): NeedSolutionPart => (s.needs?.must.includes(id) ? 'must' : 'shouldCould')
  return PARTS.map((part) => ({
    part,
    issue: issueSolutions.filter((s) => issuePart(s) === part),
    cross: crossSolutions.filter((s) => crossPart(s, issue.number, id) === part),
  })).filter((g) => g.issue.length > 0 || g.cross.length > 0)
}

/** True when the cross-issue conflict lists the need, or one of the given
 * X-N groups, on a side. */
function crossConflictHasNeed(c: CrossConflict, issue: number, id: string, groups: readonly string[]): boolean {
  return [...c.needsA, ...c.needsB].some((r) =>
    r.issue === null ? groups.includes(r.id) : r.issue === issue && r.id === id,
  )
}

/** The need page of a key, or null when the key is not a need key, or its
 * issue or need is not in the files. issues: the loaded issue files (the
 * issue of the need, plus the other issues for the cross-issue parts). cross
 * is null when cross-issue.json does not exist, or does not load: then the
 * cross-issue parts are empty. */
export function needPageView(issues: IssueFile[], cross: CrossIssueFile | null, key: string): NeedPageView | null {
  const parsed = parseNeedKey(key)
  if (parsed === null) return null
  const issue = issues.find((i) => i.number === parsed.issue)
  if (!issue) return null
  const items = needListItems(issues, cross)
  const item = items.find((r) => r.key === key)
  if (!item) return null
  const id = item.need.id
  const groups = crossGroupsOfNeed(cross, issue.number, id)
  const groupIds = groups.map((g) => g.id)
  const byKey = new Map(items.map((r) => [r.key, r]))
  return {
    item,
    issue,
    solutionGroups: solutionGroups(item, issue, cross),
    issueConflicts: issue.conflicts
      .filter((c) => c.needsA.includes(id) || c.needsB.includes(id))
      .map((c) => conflictView(issue, c)),
    crossConflicts: (cross?.conflicts ?? [])
      .filter((c) => crossConflictHasNeed(c, issue.number, id, groupIds))
      .map((c) => crossConflictView(cross!, c, issues)),
    sameNeeds: groups.map((group) => ({
      group,
      needs: group.needs
        .filter((n) => !(n.issue === issue.number && n.id === id))
        .flatMap((n) => byKey.get(needRecordKey(n.issue, n.id)) ?? [])
        .sort((a, b) => a.issue - b.issue || compareIds(a.need.id, b.need.id)),
    })),
  }
}

/** The count of each tab, for the tab labels. 總覽 has no count. The counts
 * do not change with 只看有資料根據 (decision 49). */
export type NeedTabCounts = Record<Exclude<NeedTab, 'overview'>, number>

export function needTabCounts(view: NeedPageView): NeedTabCounts {
  return {
    stories: view.item.stories.length,
    stakeholders: view.item.stakeholders.length,
    solutions: view.solutionGroups.reduce((n, g) => n + g.issue.length + g.cross.length, 0),
    conflicts: view.issueConflicts.length + view.crossConflicts.length,
    'same-needs': view.sameNeeds.reduce((n, g) => n + g.needs.length, 0),
  }
}

/** The tabs of the page, in the order of NEED_TABS. A tab with no content
 * (count 0) is left out. 總覽 is always there. */
export function needPageTabs(counts: NeedTabCounts): NeedTab[] {
  return NEED_TABS.filter((tab) => tab === 'overview' || counts[tab] > 0)
}
