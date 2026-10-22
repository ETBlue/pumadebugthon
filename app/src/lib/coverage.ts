// The shares for the reader-picked sorts of the three list pages (design
// 3.23.3 and 3.23.4, decisions 81, 83 and 84). A share is a plain part of a
// total. No scores, weights or formulas. Use these shares only for the
// sorts the reader picks on #/issues, #/stakeholders and #/solutions, and
// for the percent on their cards. Never sort anything else by them.
import type { CellCounts, CrossIssueFile, CrossSolution, IssueFile, Solution, Story } from '@/types'
import { basisTotal, roundedPercent, storyCells } from './cellBasis'
import { crossNeedCoverage, crossNeedGroupsOf } from './crossIssue'
import { dataBasedNeeds, needsOfStakeholder, type StakeholderNeedItem } from './needs'
import { stakeholderSolutionsView } from './stakeholderPage'

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

/** One cross-issue solution on the stakeholder page's 解法 tab (decision
 * 119), with the needs of the stakeholder that it covers. */
export interface StakeholderCrossSolution {
  solution: CrossSolution
  /** Its covered needs of the stakeholder, by issue order, then in the
   * order of step 5.2. */
  needs: { issueNumber: number; item: StakeholderNeedItem }[]
}

/** The cross-issue solutions that cover at least one need of a stakeholder
 * in the given issues, in the order of cross-issue.json. The coverage rule
 * is the rule of stakeholderSolutionCoverage (decision 84). dataBased: the
 * 「只看有資料根據」 filter. It keeps only the needs with a data-based
 * 以便… cell (dataBasedNeeds), and leaves out a solution with no need
 * left. Empty when cross is null (the file does not exist or fails to
 * load). */
export function stakeholderCrossSolutions(
  issues: IssueFile[],
  cross: CrossIssueFile | null,
  id: string,
  dataBased = false,
): StakeholderCrossSolution[] {
  if (cross === null) return []
  const needs = issues.flatMap((issue) => {
    const all = needsOfStakeholder(issue, id)
    return (dataBased ? dataBasedNeeds(all) : all).map((item) => ({ issueNumber: issue.number, item }))
  })
  return cross.solutions
    .map((solution) => {
      const keys = crossSolutionNeedKeys(cross, solution)
      return { solution, needs: needs.filter((n) => keys.has(`${n.issueNumber}:${n.item.need.id}`)) }
    })
    .filter((s) => s.needs.length > 0)
}

/** The number of solutions of a stakeholder (decisions 117 and 119). It is
 * the one source for the tree view of #/stakeholders and for the 解法 tab
 * label of the stakeholder page, so the two always show the same number.
 * It counts the solutions that the 解法 tab lists: the issue solutions of
 * each issue (stakeholderSolutionsView, summed over the issues), plus the
 * cross-issue solutions (stakeholderCrossSolutions). cross is null when
 * cross-issue.json does not exist or fails to load. A plain count, not a
 * share. */
export function stakeholderSolutionCount(issues: IssueFile[], cross: CrossIssueFile | null, id: string): number {
  let count = 0
  for (const issue of issues) count += stakeholderSolutionsView(issue, id).solutions.length
  return count + stakeholderCrossSolutions(issues, cross, id).length
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
