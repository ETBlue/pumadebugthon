// Lookups for the solution page #/issues/:number/solutions/:code.
// Order is always the order of the issue file, or ID order. Nothing here sorts by a count.
import type { Conflict, Group, IssueFile, Solution } from '@/types'
import { dataBasedOnly } from './dataBasis'
import { compareIds } from './ids'
import { storiesByPriority, type PriorityGroup } from './issuePage'
import { stripMarkdown } from './markdown'

/** The URL path of a solution page, for example "/issues/2/solutions/A".
 * A solution code is never reused in an issue, so the path keeps working. */
export function solutionPath(issueNumber: number, code: string): string {
  return `/issues/${issueNumber}/solutions/${code}`
}

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
