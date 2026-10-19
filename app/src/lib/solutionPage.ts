// Lookups for the solution page #/solutions/<n>-<code> (design 3.12).
// The paths are in entityPaths.ts (solutionPath).
// Order is always the order of the issue file, or ID order. Nothing here sorts by a count.
import type { Conflict, Group, IssueFile, Solution } from '@/types'
import { dataBasedOnly } from './dataBasis'
import { compareIds } from './ids'
import { storiesByPriority, type PriorityGroup } from './issuePage'
import { stripMarkdown } from './markdown'
import { issueNeeds, needsOfStakeholder, type NeedItem, type NeedSolution } from './needs'
import { conflictView, type ConflictView } from './wantList'

/** The solution for the code in the URL: one capital letter, for example "A".
 * null for an unknown or badly written code. */
export function findSolution(issue: IssueFile, code: string | undefined): Solution | null {
  if (code === undefined || !/^[A-Z]$/.test(code)) return null
  return issue.solutions.find((s) => s.id === code) ?? null
}

/** 「#2 A 名稱」 as plain text, for the page title and link names. */
export function solutionTitle(issueNumber: number, solution: Solution): string {
  return `#${issueNumber} ${solution.id} ${stripMarkdown(solution.name.text)}`
}

/** The covered stories grouped by priority (M, S, C, W). With dataBased, only
 * the stories whose 我想要… or 以便… has the 實證 or AI整理 tag. */
export function solutionStoryGroups(issue: IssueFile, solution: Solution, dataBased: boolean): PriorityGroup[] {
  const ids = dataBased
    ? (() => {
        const keep = new Set(dataBasedOnly(issue.stories).map((s) => s.id))
        return solution.stories.filter((id) => keep.has(id))
      })()
    : solution.stories
  return storiesByPriority(issue, ids)
}

export interface GroupCoverage {
  group: Group
  /** true: every story of the group is covered (全部). false: some (部分). */
  full: boolean
  /** The covered stories of the group, in the group's order. */
  covered: string[]
  /** The stakeholders of every story of the group, each once, in ID order. */
  stakeholders: string[]
}

/** The W groups with at least one covered story, in file order. This is the
 * 涵蓋的相同訴求群組 column of 6.2; check_analysis.py checks that the column
 * matches the stories, so the app can work it out from the stories. */
export function solutionGroupCoverage(issue: IssueFile, solution: Solution): GroupCoverage[] {
  const covered = new Set(solution.stories)
  return issue.groups.flatMap((group) => {
    const inGroup = group.stories.filter((id) => covered.has(id))
    if (inGroup.length === 0) return []
    return [{
      group,
      full: inGroup.length === group.stories.length,
      covered: inGroup,
      stakeholders: [...new Set(group.stories.map((id) => id.split('-')[0]))].sort(compareIds),
    }]
  })
}

/** The stakeholders of the covered stories, each once, in ID order. */
export function solutionStakeholders(issue: IssueFile, solution: Solution): string[] {
  const byId = new Map(issue.stories.map((s) => [s.id, s.stakeholder]))
  return [...new Set(solution.stories.map((id) => byId.get(id) ?? id.split('-')[0]))].sort(compareIds)
}

export interface SolutionConflict {
  conflict: Conflict
  /** The covered stories in the conflict: side A first, then side B. */
  covered: string[]
}

/** The conflicts with a covered story on either side, in file order. */
export function solutionConflicts(issue: IssueFile, solution: Solution): SolutionConflict[] {
  const covered = new Set(solution.stories)
  return issue.conflicts.flatMap((conflict) => {
    const ids = [...conflict.sideA, ...conflict.sideB].filter((id) => covered.has(id))
    return ids.length === 0 ? [] : [{ conflict, covered: [...new Set(ids)] }]
  })
}

// ---------- Coverage (design 3.12, decision 50) ----------
// A need is covered when the solution lists its ID in needs.must or
// needs.shouldCould (step 6.2). Every other need of the issue is not covered,
// also a 這次不做 need. A stakeholder is covered when at least one of its
// needs is covered. The lists keep the order of step 5.2 or ID order.

export interface CoveredNeed extends NeedItem {
  /** The part of step 6.2 that lists the need for this solution. */
  part: NeedSolution['part']
}

export interface NotCoveredNeed extends NeedItem {
  /** The other solutions that cover the need, in letter order. Empty when no
   * solution covers it (「沒有任何解法涵蓋」). */
  otherSolutions: Solution[]
}

export interface NeedCoverage {
  covered: CoveredNeed[]
  notCovered: NotCoveredNeed[]
}

/** The part of step 6.2 that lists the need in the solution, or null. */
function coveredPart(solution: Solution, needId: string): NeedSolution['part'] | null {
  if (!solution.needs) return null
  if (solution.needs.must.includes(needId)) return 'must'
  if (solution.needs.shouldCould.includes(needId)) return 'shouldCould'
  return null
}

/** Splits the given needs into covered and not covered. Keeps their order. */
function splitNeeds(items: NeedItem[], solution: Solution): NeedCoverage {
  const out: NeedCoverage = { covered: [], notCovered: [] }
  for (const item of items) {
    const part = coveredPart(solution, item.need.id)
    if (part) out.covered.push({ ...item, part })
    else {
      const otherSolutions = item.solutions.map((s) => s.solution).filter((s) => s.id !== solution.id)
      out.notCovered.push({ ...item, otherSolutions })
    }
  }
  return out
}

/** The needs of the issue that the solution covers and does not cover, in
 * the order of step 5.2. In the old format (needs is null), nothing is covered. */
export function solutionNeedCoverage(issue: IssueFile, solution: Solution): NeedCoverage {
  return splitNeeds(issueNeeds(issue), solution)
}

export interface StakeholderCoverage extends NeedCoverage {
  /** The stakeholder ID. */
  id: string
}

export interface SolutionStakeholderCoverage {
  covered: StakeholderCoverage[]
  notCovered: StakeholderCoverage[]
}

/** The stakeholders of the issue (step 1) that the solution covers and does
 * not cover, in ID order. Each one comes with its own needs, split into
 * covered and not covered. A need with several stories of the stakeholder
 * shows once. */
export function solutionStakeholderCoverage(issue: IssueFile, solution: Solution): SolutionStakeholderCoverage {
  const out: SolutionStakeholderCoverage = { covered: [], notCovered: [] }
  const ids = issue.stakeholders.map((s) => s.id).sort(compareIds)
  for (const id of ids) {
    const coverage = { id, ...splitNeeds(needsOfStakeholder(issue, id), solution) }
    if (coverage.covered.length > 0) out.covered.push(coverage)
    else out.notCovered.push(coverage)
  }
  return out
}

/** 解開的衝突: the conflicts whose 以需求為本的解方 lists the solution, in
 * file order, with their sides, needs and way out. */
export function solutionWayOutConflicts(issue: IssueFile, solution: Solution): ConflictView[] {
  return issue.conflicts
    .filter((c) => c.wayOutSolutions.includes(solution.id))
    .map((c) => conflictView(issue, c))
}
