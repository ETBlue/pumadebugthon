// The solution list page #/solutions (design 3.9).
// Order: issue number, then the order of the issue file (A, B, …).
// Never sorted by a count.
import type { IssueFile, Solution, SpaceType } from '@/types'

export interface SolutionGroup {
  issueNumber: number
  title: string
  solutions: Solution[]
}

export interface SolutionFilter {
  /** Space type codes. A solution matches when it uses ANY of them. Empty: all. */
  spaces: string[]
  /** Issue numbers. Empty: all. */
  issues: number[]
}

/** The solutions of the given issue files, grouped by issue. Issues with no
 * matching solution are left out. */
export function solutionGroups(issues: IssueFile[], filter: SolutionFilter): SolutionGroup[] {
  return [...issues]
    .sort((a, b) => a.number - b.number)
    .filter((issue) => filter.issues.length === 0 || filter.issues.includes(issue.number))
    .map((issue) => ({
      issueNumber: issue.number,
      title: issue.title,
      solutions: issue.solutions.filter(
        (s) => filter.spaces.length === 0 || s.spaces.some((c) => filter.spaces.includes(c)),
      ),
    }))
    .filter((g) => g.solutions.length > 0)
}

/** The space types that at least one solution uses, in the order of
 * space-types.csv. For the space type filter. */
export function solutionSpaceOptions(spaceTypes: SpaceType[], issues: IssueFile[]): SpaceType[] {
  const used = new Set(issues.flatMap((i) => i.solutions.flatMap((s) => s.spaces)))
  return spaceTypes.filter((s) => used.has(s.code))
}

/** The number of needs the solution covers, for 「涵蓋 9 個需求」 on
 * #/solutions (decision 54): the rows of step 5.2 that it lists in
 * needs.must or needs.shouldCould. The same number as the covered count of
 * the solution page's 需求 tab. null in the old format (needs is null). */
export function coveredNeedCount(issue: IssueFile, solution: Solution): number | null {
  const needs = solution.needs
  if (needs === null) return null
  return issue.needs.filter((n) => needs.must.includes(n.id) || needs.shouldCould.includes(n.id)).length
}
