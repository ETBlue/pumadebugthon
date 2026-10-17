// Space type lookups (design 3.2 「使用相同空間的議題」 and 3.6).
import type { AvailableIssueSummary, IndexFile, IssueFile, Solution } from '@/types'

export interface SpaceSolution {
  issueNumber: number
  solution: Solution
}

export interface SameSpace {
  code: string
  /** Numbers of the other issues that use this space type. */
  issues: number[]
}

function available(index: IndexFile): AvailableIssueSummary[] {
  return index.issues
    .filter((i): i is AvailableIssueSummary => i.available)
    .sort((a, b) => a.number - b.number)
}

/** The analyzed issues that use the space type, by issue number. */
export function issuesBySpace(index: IndexFile, code: string): AvailableIssueSummary[] {
  return available(index).filter((i) => i.spaces.includes(code))
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
  const all = available(index)
  const issue = all.find((i) => i.number === issueNumber)
  if (!issue) return []
  return issue.spaces
    .map((code) => ({
      code,
      issues: all.filter((i) => i.number !== issueNumber && i.spaces.includes(code)).map((i) => i.number),
    }))
    .filter((s) => s.issues.length > 0)
}
