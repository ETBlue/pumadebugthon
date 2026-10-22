// The shares for the reader-picked sorts of the three list pages (design
// 3.23.3 and 3.23.4, decisions 81, 83 and 84). A share is a plain part of a
// total. No scores, weights or formulas. Use these shares only for the
// sorts the reader picks on #/issues, #/stakeholders and #/solutions, and
// for the percent on their cards. Never sort anything else by them.
import type { CellCounts, CrossIssueFile, CrossSolution, IssueFile, Solution, Story } from '@/types'
import { basisTotal, roundedPercent, storyCells } from './cellBasis'
import { crossNeedCoverage, crossNeedGroupsOf } from './crossIssue'
import { needsOfStakeholder } from './needs'

/** A plain share: part of total. total is always more than 0. */
export interface Share {
  part: number
  total: number
}

/** 資料根據比例: the cells tagged 實證 or AI整理, of all cells. null when
 * there are no cells. A share of 0 is a real value, not null. */
export function evidenceShare(cells: CellCounts): Share | null {
  const total = basisTotal(cells)
  if (total === 0) return null
  return { part: cells.evidence + cells.aiSummary, total }
}

/** The cells of all the stakeholder's stories, in every given issue. */
export function stakeholderCells(issues: IssueFile[], id: string): CellCounts {
  return storyCells(issues.flatMap((issue) => issue.stories.filter((s) => s.stakeholder === id)))
}

/** The story IDs of the needs the solution covers (needs.must and
 * needs.shouldCould), each once. In the old format (needs is null), the
 * stories of its 6.2 row. */
function coveredStoryIds(issue: IssueFile, solution: Solution): Set<string> {
  const needs = solution.needs
  if (needs === null) return new Set(solution.stories)
  const ids = new Set([...needs.must, ...needs.shouldCould])
  return new Set(issue.needs.filter((n) => ids.has(n.id)).flatMap((n) => n.stories))
}

function storiesOf(issue: IssueFile, ids: Set<string>): Story[] {
  return issue.stories.filter((s) => ids.has(s.id))
}

/** The cells of the stories of the needs the solution covers. Each story is
 * counted once, also when two covered needs share it (Q23 (a)). The
 * solution's own text is not counted. */
export function solutionCells(issue: IssueFile, solution: Solution): CellCounts {
  return storyCells(storiesOf(issue, coveredStoryIds(issue, solution)))
}

/** The cells of the stories of the needs a cross-issue solution covers: in
 * needs.must, needs.shouldCould, or an X-N group of needs.crossIssue
 * (decision 60), in every given issue. Each story is counted once per issue.
 * The same story ID in two issues is two stories. */
export function crossSolutionCells(cross: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]): CellCounts {
  const stories: Story[] = []
  for (const { issueNumber, coverage } of crossNeedCoverage(cross, solution, issues)) {
    const issue = issues.find((i) => i.number === issueNumber)
    if (!issue) continue
    stories.push(...storiesOf(issue, new Set(coverage.covered.flatMap((n) => n.stories.map((s) => s.id)))))
  }
  return storyCells(stories)
}

/** The issue needs that some cross-issue solution covers, as
 * "<issue>:<need ID>". Empty when the file does not exist. */
function crossCoveredNeeds(cross: CrossIssueFile | null): Set<string> {
  const out = new Set<string>()
  if (cross === null) return out
  for (const solution of cross.solutions) {
    for (const key of crossSolutionNeedKeys(cross, solution)) out.add(key)
  }
  return out
}

/** The issue needs that one cross-issue solution covers, as
 * "<issue>:<need ID>": in needs.must, needs.shouldCould, or an X-N group of
 * needs.crossIssue (decision 60). */
function crossSolutionNeedKeys(cross: CrossIssueFile, solution: CrossSolution): Set<string> {
  const out = new Set<string>()
  for (const r of [...solution.needs.must, ...solution.needs.shouldCould]) {
    if (r.issue !== null) out.add(`${r.issue}:${r.id}`)
  }
  for (const g of crossNeedGroupsOf(cross, solution)) {
    for (const m of g.needs) out.add(`${m.issue}:${m.id}`)
  }
  return out
}

/** 解法涵蓋比例 of a stakeholder (decision 84). total: its different needs
 * per issue, summed over the issues (the 需求 count of its tab label).
 * covered: the needs that an issue solution lists in needs.must or
 * needs.shouldCould, or that a cross-issue solution covers. 這次不做 needs
 * are in the total (Q23 (b)). cross is null when cross-issue.json does not
 * exist. */
export function stakeholderSolutionCoverage(
  issues: IssueFile[],
  cross: CrossIssueFile | null,
  id: string,
): { covered: number; total: number } {
  const crossCovered = crossCoveredNeeds(cross)
  let covered = 0
  let total = 0
  for (const issue of issues) {
    for (const item of needsOfStakeholder(issue, id)) {
      total += 1
      if (item.solutions.length > 0 || crossCovered.has(`${issue.number}:${item.need.id}`)) covered += 1
    }
  }
  return { covered, total }
}

/** The number of solutions of a stakeholder (the tree view of
 * #/stakeholders, decision 117): the solutions that cover at least one of
 * its needs. Issue solutions are counted as in the 解法 tab label of the
 * stakeholder page (stakeholderTabCounts): the different solutions per
 * issue, summed over the issues. Then each cross-issue solution that covers
 * at least one of its needs in the given issues adds 1, with the coverage
 * rule of stakeholderSolutionCoverage. cross is null when cross-issue.json
 * does not exist. A plain count, not a share. */
export function stakeholderSolutionCount(issues: IssueFile[], cross: CrossIssueFile | null, id: string): number {
  let count = 0
  const needKeys = new Set<string>()
  for (const issue of issues) {
    const needs = needsOfStakeholder(issue, id)
    count += new Set(needs.flatMap((n) => n.solutions.map((s) => s.solution.id))).size
    for (const n of needs) needKeys.add(`${issue.number}:${n.need.id}`)
  }
  if (cross === null) return count
  for (const solution of cross.solutions) {
    if ([...crossSolutionNeedKeys(cross, solution)].some((key) => needKeys.has(key))) count += 1
  }
  return count
}

/** The share as a whole percent, with the rounding of evidencePercent. */
export function sharePercent(share: Share): number {
  return roundedPercent(share.part, share.total)
}

/** For a sort: the higher share first. Exact, by cross-multiplying, so 1 of
 * 3 and 33 of 100 are not equal. null (no share) goes after every share,
 * also after a share of 0. 0 means the same share. */
export function compareShares(a: Share | null, b: Share | null): number {
  if (a === null || b === null) return (a === null ? 1 : 0) - (b === null ? 1 : 0)
  return b.part * a.total - a.part * b.total
}
