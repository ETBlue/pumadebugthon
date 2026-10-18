// Space type lookups (design 3.2 「使用相同空間的議題」 and 3.6).
import type { AvailableIssueSummary, IndexFile, IssueFile, Solution, SpaceType } from '@/types'
import { compareIds } from './ids'
import { availableIssues } from './issues'

export interface SpaceSolution {
  issueNumber: number
  solution: Solution
}

export interface SpaceStakeholders {
  issueNumber: number
  /** Stakeholder IDs, in ID order. */
  stakeholders: string[]
}

export interface SameSpace {
  code: string
  /** Numbers of the other issues that use this space type. */
  issues: number[]
}

/** The analyzed issues that use the space type, by issue number. */
export function issuesBySpace(index: IndexFile, code: string): AvailableIssueSummary[] {
  return availableIssues(index).filter((i) => i.spaces.includes(code))
}

/** Every solution that uses the space type, by issue number, then in the
 * order of the issue file (A, B, …). */
export function solutionsBySpace(issues: IssueFile[], code: string): SpaceSolution[] {
  return [...issues]
    .sort((a, b) => a.number - b.number)
    .flatMap((issue) =>
      issue.solutions.filter((s) => s.spaces.includes(code)).map((solution) => ({ issueNumber: issue.number, solution })),
    )
}

/** For each space type of the issue (in the issue's order), the other issues
 * that use it. Space types that no other issue uses are left out. */
export function sameSpaceIssues(index: IndexFile, issueNumber: number): SameSpace[] {
  const all = availableIssues(index)
  const issue = all.find((i) => i.number === issueNumber)
  if (!issue) return []
  return issue.spaces
    .map((code) => ({
      code,
      issues: all.filter((i) => i.number !== issueNumber && i.spaces.includes(code)).map((i) => i.number),
    }))
    .filter((s) => s.issues.length > 0)
}

/** Design 3.6: per issue (by number), the stakeholders of the stories of every
 * solution that uses the space type, in ID order. Issues with no such
 * solution are left out. */
export function stakeholdersBySpace(issues: IssueFile[], code: string): SpaceStakeholders[] {
  return [...issues]
    .sort((a, b) => a.number - b.number)
    .map((issue) => {
      const storyIds = new Set(issue.solutions.filter((s) => s.spaces.includes(code)).flatMap((s) => s.stories))
      const ids = new Set(issue.stories.filter((s) => storyIds.has(s.id)).map((s) => s.stakeholder))
      return { issueNumber: issue.number, stakeholders: [...ids].sort(compareIds) }
    })
    .filter((x) => x.stakeholders.length > 0)
}

/** The space type of the code, or null for an unknown code. */
export function findSpaceType(spaceTypes: SpaceType[], code: string): SpaceType | null {
  return spaceTypes.find((s) => s.code === code) ?? null
}

/** The space types of the solution other than code, in the solution's order. */
export function otherSpaces(solution: Solution, code: string): string[] {
  return solution.spaces.filter((c) => c !== code)
}

export interface SharedSpaceStakeholder {
  id: string
  /** The issues it appears in for this space, by number. */
  issues: number[]
}

/** Design 3.6: the stakeholders that appear for 2 or more issues in the
 * result of stakeholdersBySpace, in ID order. Never sorted by a count. */
export function stakeholdersInSeveralIssues(list: SpaceStakeholders[]): SharedSpaceStakeholder[] {
  const byId = new Map<string, Set<number>>()
  for (const entry of list) {
    for (const id of entry.stakeholders) {
      const set = byId.get(id) ?? new Set<number>()
      set.add(entry.issueNumber)
      byId.set(id, set)
    }
  }
  return [...byId]
    .filter(([, issues]) => issues.size >= 2)
    .map(([id, issues]) => ({ id, issues: [...issues].sort((a, b) => a - b) }))
    .sort((a, b) => compareIds(a.id, b.id))
}
