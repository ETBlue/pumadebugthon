// Space type lookups (design 3.2 「使用相同空間的議題」 and 3.6). These are thin
// wrappers over the generic type helpers in typeKinds.ts, with the kind
// 'space'. They keep the old names, so the space pages did not change.
import type { AvailableIssueSummary, IndexFile, IssueFile, Solution, SpaceType } from '@/types'
import {
  findCode, issuesByType, otherTypes, sameTypeIssues, solutionsByType, stakeholdersByType, typeGroups,
  typeStakeholderCount, type SameType, type SharedTypeStakeholder, type TypeSolution, type TypeStakeholders,
} from './typeKinds'

export { stakeholdersInSeveralIssues } from './typeKinds'

export type SpaceSolution = TypeSolution
export type SpaceStakeholders = TypeStakeholders
export type SameSpace = SameType
export type SharedSpaceStakeholder = SharedTypeStakeholder

/** The analyzed issues that use the space type, by issue number. */
export function issuesBySpace(index: IndexFile, code: string): AvailableIssueSummary[] {
  // A space type is on the issue summary, so no issue file is needed.
  return issuesByType('space', index, [], code)
}

/** Every solution that uses the space type, by issue number, then in the
 * order of the issue file (S1, S2, …). */
export function solutionsBySpace(issues: IssueFile[], code: string): SpaceSolution[] {
  return solutionsByType('space', issues, code)
}

/** For each space type of the issue (in the issue's order), the other issues
 * that use it. Space types that no other issue uses are left out. */
export function sameSpaceIssues(index: IndexFile, issueNumber: number): SameSpace[] {
  return sameTypeIssues('space', index, [], issueNumber)
}

/** Design 3.6: per issue (by number), the stakeholders of the stories of every
 * solution that uses the space type, in ID order. Issues with no such
 * solution are left out. */
export function stakeholdersBySpace(issues: IssueFile[], code: string): SpaceStakeholders[] {
  return stakeholdersByType('space', issues, code)
}

/** The space type of the code, or null for an unknown code. */
export function findSpaceType(spaceTypes: SpaceType[], code: string): SpaceType | null {
  return findCode(spaceTypes, code)
}

/** The space types of the solution other than code, in the solution's order. */
export function otherSpaces(solution: Solution, code: string): string[] {
  return otherTypes('space', solution, code)
}

export interface SpaceGroup {
  /** The group name, for example 道路. */
  group: string
  /** The space types of the group, in the order of index.spaceTypes. */
  spaces: SpaceType[]
}

/** #/spaces (decision 120): the space types by group. The groups are in the
 * order they first appear in spaceTypes, and each group keeps the order of
 * spaceTypes. A fixed order: never sorted by a count. */
export function spaceGroups(spaceTypes: SpaceType[]): SpaceGroup[] {
  return typeGroups(spaceTypes).map((g) => ({ group: g.group ?? '', spaces: g.types }))
}

/** The number of different stakeholders in the result of stakeholdersBySpace.
 * A stakeholder in two issues counts once. These are the people the space
 * page lists under 「相關的利害關係人」 (decision 120). */
export function spaceStakeholderCount(list: SpaceStakeholders[]): number {
  return typeStakeholderCount(list)
}
