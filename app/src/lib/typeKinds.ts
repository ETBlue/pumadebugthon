// Lookups for the three kinds of type: space (空間類型), domain (領域) and
// solution type (解法類型). One set of helpers serves all three kinds. The
// kinds differ only in where the codes are:
//
// | Kind         | On an issue                                   | On a solution   |
// |--------------|-----------------------------------------------|-----------------|
// | space        | spaces                                        | spaces          |
// | domain       | domains                                       | domains         |
// | solutionType | none: an issue uses a solution type when one  | solutionTypes   |
// |              | of its solutions has it                       |                 |
//
// Only level 2 codes are on issues and solutions, and only level 2 rows are in
// the type lists. So a level 1 code finds nothing in every helper.
// Orders are fixed: issue number, then the order of the file. Never a count.
import type { AvailableIssueSummary, DomainType, IndexFile, IssueFile, Solution, SolutionType, SpaceType } from '@/types'
import { compareIds } from './ids'
import { availableIssues } from './issues'

export type TypeKind = 'space' | 'domain' | 'solutionType'

/** All kinds, in menu order. */
export const TYPE_KINDS: TypeKind[] = ['space', 'domain', 'solutionType']

/** The row type of each kind. */
export interface TypeOfKind {
  space: SpaceType
  domain: DomainType
  solutionType: SolutionType
}

/** The fields every kind has. group is the level 1 name; a solution type has
 * no level 1, so it has no group. */
export interface TypeEntry {
  code: string
  name: string
  description: string
  group?: string
  added?: string | null
  updated?: string | null
}

export interface TypeSolution {
  issueNumber: number
  solution: Solution
}

export interface TypeStakeholders {
  issueNumber: number
  /** Stakeholder IDs, in ID order. */
  stakeholders: string[]
}

export interface SameType {
  code: string
  /** Numbers of the other issues that use this type. */
  issues: number[]
}

/** The level 2 rows of the kind, in file order. */
export function typesOf<K extends TypeKind>(kind: K, index: IndexFile): TypeOfKind[K][] {
  const lists: { [k in TypeKind]: TypeOfKind[k][] } = {
    space: index.spaceTypes,
    domain: index.domainTypes,
    solutionType: index.solutionTypes,
  }
  return lists[kind]
}

/** The row of the code, or null for a level 1 or unknown code. */
export function findType<K extends TypeKind>(kind: K, index: IndexFile, code: string): TypeOfKind[K] | null {
  return findCode(typesOf(kind, index), code)
}

/** The row of the code in a type list, or null when it is not there. */
export function findCode<T extends { code: string }>(types: T[], code: string): T | null {
  return types.find((t) => t.code === code) ?? null
}

/** The codes of the kind on a solution, in the solution's order. */
export function solutionCodes(kind: TypeKind, solution: Solution): string[] {
  if (kind === 'space') return solution.spaces
  if (kind === 'domain') return solution.domains
  return solution.solutionTypes
}

/** The codes of the kind on an issue, in the issue's order. For a solution
 * type: the codes of its solutions, in solution order, each code once. It
 * needs the issue file; an issue whose file is not in files has none. */
export function issueCodes(kind: TypeKind, issue: AvailableIssueSummary, files: IssueFile[]): string[] {
  if (kind === 'space') return issue.spaces
  if (kind === 'domain') return issue.domains
  const file = files.find((f) => f.number === issue.number)
  if (!file) return []
  const codes: string[] = []
  for (const s of file.solutions) for (const c of s.solutionTypes) if (!codes.includes(c)) codes.push(c)
  return codes
}

/** The analyzed issues that use the type, by issue number. files is used
 * only for a solution type. */
export function issuesByType(kind: TypeKind, index: IndexFile, files: IssueFile[], code: string): AvailableIssueSummary[] {
  return availableIssues(index).filter((i) => issueCodes(kind, i, files).includes(code))
}

/** Every solution that has the type, by issue number, then in the order of
 * the issue file (S1, S2, …). */
export function solutionsByType(kind: TypeKind, files: IssueFile[], code: string): TypeSolution[] {
  return [...files]
    .sort((a, b) => a.number - b.number)
    .flatMap((issue) =>
      issue.solutions
        .filter((s) => solutionCodes(kind, s).includes(code))
        .map((solution) => ({ issueNumber: issue.number, solution })),
    )
}

/** Per issue (by number), the stakeholders of the stories of every solution
 * that has the type, in ID order. Issues with no such solution are left out. */
export function stakeholdersByType(kind: TypeKind, files: IssueFile[], code: string): TypeStakeholders[] {
  return [...files]
    .sort((a, b) => a.number - b.number)
    .map((issue) => {
      const storyIds = new Set(
        issue.solutions.filter((s) => solutionCodes(kind, s).includes(code)).flatMap((s) => s.stories),
      )
      const ids = new Set(issue.stories.filter((s) => storyIds.has(s.id)).map((s) => s.stakeholder))
      return { issueNumber: issue.number, stakeholders: [...ids].sort(compareIds) }
    })
    .filter((x) => x.stakeholders.length > 0)
}

/** For each code of the issue (in the issue's order), the other issues that
 * use it. Codes that no other issue uses are left out. */
export function sameTypeIssues(kind: TypeKind, index: IndexFile, files: IssueFile[], issueNumber: number): SameType[] {
  const all = availableIssues(index)
  const issue = all.find((i) => i.number === issueNumber)
  if (!issue) return []
  return issueCodes(kind, issue, files)
    .map((code) => ({
      code,
      issues: all.filter((i) => i.number !== issueNumber && issueCodes(kind, i, files).includes(code)).map((i) => i.number),
    }))
    .filter((s) => s.issues.length > 0)
}

/** The codes of the kind on the solution other than code, in its order. */
export function otherTypes(kind: TypeKind, solution: Solution, code: string): string[] {
  return solutionCodes(kind, solution).filter((c) => c !== code)
}

export interface SharedTypeStakeholder {
  id: string
  /** The issues it appears in for this type, by number. */
  issues: number[]
}

/** The stakeholders that appear for 2 or more issues in the result of
 * stakeholdersByType, in ID order. Never sorted by a count. */
export function stakeholdersInSeveralIssues(list: TypeStakeholders[]): SharedTypeStakeholder[] {
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

/** The number of different stakeholders in the result of
 * stakeholdersByType. A stakeholder in two issues counts once. */
export function typeStakeholderCount(list: TypeStakeholders[]): number {
  return new Set(list.flatMap((entry) => entry.stakeholders)).size
}

export interface TypeGroup<T> {
  /** The level 1 name, for example 道路. null for a kind with one level
   * (solution types): the list page shows no heading. */
  group: string | null
  /** The types of the group, in the order of the list. */
  types: T[]
}

/** The list page headings: the types by group. The groups are in the order
 * they first appear in the list (the file order of level 1), and each group
 * keeps the order of the list. A fixed order: never sorted by a count. */
export function typeGroups<T extends { code: string; group?: string }>(types: T[]): TypeGroup<T>[] {
  const groups: TypeGroup<T>[] = []
  for (const type of types) {
    const group = type.group ?? null
    const found = groups.find((g) => g.group === group)
    if (found) found.types.push(type)
    else groups.push({ group, types: [type] })
  }
  return groups
}
