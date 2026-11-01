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

/** The list page of each kind. It is also the first URL segment of the
 * list page and of the type pages: #/domains, #/domains/<code>. */
export const TYPE_LIST_PAGES = { space: 'spaces', domain: 'domains', solutionType: 'solution-types' } as const

export type TypeListPage = (typeof TYPE_LIST_PAGES)[TypeKind]

/** True when every code of a solution is also on its issue. Then the issue
 * summaries in index.json are enough to find the issues of a type, and the
 * page does not need the issue files for that.
 * - space: true. method.md: 「每個解法的空間都必須在本題的清單中」.
 * - domain: false. A solution's own 領域 is never on its issue (method.md).
 * - solutionType: false. An issue has no solution types of its own. */
export function issueListsSolutionCodes(kind: TypeKind): boolean {
  return kind === 'space'
}

/** The row type of each kind. */
export interface TypeOfKind {
  space: SpaceType
  domain: DomainType
  solutionType: SolutionType
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

/** The issues of a type page and of a card on the list page (Task U3): the
 * analyzed issues that have the code on the issue, or that have a solution
 * with the code. By issue number. files are the loaded issue files.
 * - space: the same as issuesByType, because a solution space is always on
 *   its issue.
 * - domain: also an issue with a solution that has its own 領域.
 *   solution.domains is ownDomains when that is not empty, else the
 *   issue's 領域.
 * - solutionType: the same as issuesByType. */
export function typeIssues(kind: TypeKind, index: IndexFile, files: IssueFile[], code: string): AvailableIssueSummary[] {
  return availableIssues(index).filter(
    (i) =>
      issueCodes(kind, i, files).includes(code) ||
      (files.find((f) => f.number === i.number)?.solutions.some((s) => solutionCodes(kind, s).includes(code)) ?? false),
  )
}

/** True when the issue can use a type of the kind, from index.json alone:
 * an issue with no space types uses no space type (for example #9). Every
 * analyzed issue has 1 to 3 領域, and its solutions have solution types.
 * The 議題 filter of a type list page offers only these issues. */
export function issueMayUseType(kind: TypeKind, issue: AvailableIssueSummary): boolean {
  if (kind === 'space') return issue.spaces.length > 0
  if (kind === 'domain') return issue.domains.length > 0
  return true
}

/** The level 1 names of the kind, in file order: the headings of the list
 * page and the options of its 分類 filter. A solution type has one level,
 * so it has none. */
export function typeGroupNames(kind: TypeKind, index: IndexFile): string[] {
  if (kind === 'domain') return index.domainGroups.map((g) => g.name)
  if (kind === 'space') return [...new Set(index.spaceTypes.map((s) => s.group))]
  return []
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
