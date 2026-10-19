// Cross-issue solutions (design 3.18): lookups for the page #/solutions/X-A
// and for the other places that show them. The data is cross-issue.json.
// Every function takes null for a missing file and then returns nothing.
// Order is always code order (X-A, X-B, …), file order, issue number order or
// ID order. Nothing here sorts by a count.
import type {
  CrossConflict, CrossIssueFile, CrossNeedGroup, CrossSolution, CrossSolutionFocus, IssueFile, Story,
} from '@/types'
import { compareIds } from './ids'
import { issueNeeds, needsOfStakeholder, type NeedItem } from './needs'
import type { SolutionFilter } from './solutionList'
import type { CoveredNeed, NeedCoverage, StakeholderEntry } from './solutionPage'
import type { SolutionTabCounts } from './tabCounts'

/** The cross-issue solution for the code in the URL, for example "X-A".
 * null for an unknown code, or when the file does not exist. */
export function findCrossSolution(data: CrossIssueFile | null, code: string | undefined): CrossSolution | null {
  if (data === null || code === undefined) return null
  return data.solutions.find((s) => s.code === code) ?? null
}

/** 「X-A 名稱」 as plain text, for the page title. */
export function crossSolutionTitle(solution: CrossSolution): string {
  return `${solution.code} ${solution.name}`
}

/** The issues of the solution's parts, each once, in number order. */
export function crossIssueNumbers(solution: CrossSolution): number[] {
  return [...new Set(solution.parts.map((p) => p.issue))].sort((a, b) => a - b)
}

/** The files of the solution's issues, in number order. An issue with no
 * file in the list is left out. */
export function issuesOfCross(solution: CrossSolution, issues: IssueFile[]): IssueFile[] {
  return crossIssueNumbers(solution).flatMap((n) => issues.find((i) => i.number === n) ?? [])
}

/** The cross-issue solutions with the issue in parts, in code order. For the
 * box on the issue's 解法 tab. */
export function crossSolutionsOfIssue(data: CrossIssueFile | null, issueNumber: number): CrossSolution[] {
  if (data === null) return []
  return data.solutions.filter((s) => s.parts.some((p) => p.issue === issueNumber))
}

/** The cross-issue solutions that combine one issue solution (it is in
 * parts), in code order. For 「跨議題解法」 on the solution page. */
export function crossSolutionsOfSolution(data: CrossIssueFile | null, issueNumber: number, code: string): CrossSolution[] {
  if (data === null) return []
  return data.solutions.filter((s) => s.parts.some((p) => p.issue === issueNumber && p.code === code))
}

/** The X-N groups listed in needs.crossIssue, in file order (ID order). */
export function crossNeedGroupsOf(data: CrossIssueFile, solution: CrossSolution): CrossNeedGroup[] {
  return data.needGroups.filter((g) => solution.needs.crossIssue.includes(g.id))
}

// ---------- Coverage (design 3.18, decision 60) ----------
// An issue need is covered when it is in needs.must or needs.shouldCould, or
// in an X-N group listed in needs.crossIssue. Not covered: every other need
// of the issues in parts.

/** Need ID -> the part that covers it, for one issue. must and shouldCould
 * come first; crossIssue is only for a need that is not in them. */
function coveredParts(data: CrossIssueFile, solution: CrossSolution, issueNumber: number): Map<string, CoveredNeed['part']> {
  const out = new Map<string, CoveredNeed['part']>()
  for (const r of solution.needs.must) if (r.issue === issueNumber) out.set(r.id, 'must')
  for (const r of solution.needs.shouldCould) if (r.issue === issueNumber && !out.has(r.id)) out.set(r.id, 'shouldCould')
  for (const g of crossNeedGroupsOf(data, solution)) {
    for (const m of g.needs) if (m.issue === issueNumber && !out.has(m.id)) out.set(m.id, 'crossIssue')
  }
  return out
}

/** Splits the given needs of one issue. Keeps their order. A not covered
 * need lists every issue solution that covers it. */
function splitNeeds<T extends NeedItem>(items: T[], parts: Map<string, CoveredNeed['part']>) {
  const covered: (T & CoveredNeed)[] = []
  const notCovered: (T & { otherSolutions: NeedItem['solutions'][number]['solution'][] })[] = []
  for (const item of items) {
    const part = parts.get(item.need.id)
    if (part) covered.push({ ...item, part })
    else notCovered.push({ ...item, otherSolutions: item.solutions.map((s) => s.solution) })
  }
  return { covered, notCovered }
}

export interface IssueCoverage {
  issueNumber: number
  coverage: NeedCoverage
}

/** The covered and not covered needs, per issue of parts (number order).
 * Inside an issue, the order of step 5.2. Pass the issue files; an issue
 * with no file is left out. */
export function crossNeedCoverage(data: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]): IssueCoverage[] {
  return issuesOfCross(solution, issues).map((issue) => ({
    issueNumber: issue.number,
    coverage: splitNeeds(issueNeeds(issue), coveredParts(data, solution, issue.number)),
  }))
}

/** The 利害關係人 tab (design 3.18): each stakeholder of the issues (step 1)
 * once, in ID order, with its needs split by issue (number order). An issue
 * where the stakeholder has no need is left out of its entry. A stakeholder
 * is covered when at least one of its needs, in any of the issues, is covered. */
export function crossStakeholderCoverage(
  data: CrossIssueFile,
  solution: CrossSolution,
  issues: IssueFile[],
): { covered: StakeholderEntry[]; notCovered: StakeholderEntry[] } {
  const files = issuesOfCross(solution, issues)
  const parts = new Map(files.map((issue) => [issue.number, coveredParts(data, solution, issue.number)]))
  const ids = [...new Set(files.flatMap((issue) => issue.stakeholders.map((s) => s.id)))].sort(compareIds)
  const out = { covered: [] as StakeholderEntry[], notCovered: [] as StakeholderEntry[] }
  for (const id of ids) {
    const entry: StakeholderEntry = {
      id,
      issues: files.flatMap((issue) => {
        const needs = needsOfStakeholder(issue, id)
        return needs.length === 0 ? [] : [{ issueNumber: issue.number, ...splitNeeds(needs, parts.get(issue.number)!) }]
      }),
    }
    if (entry.issues.some((i) => i.covered.length > 0)) out.covered.push(entry)
    else out.notCovered.push(entry)
  }
  return out
}

/** The counts of the 需求 and 利害關係人 tab labels: the needs summed over
 * the issues, and the stakeholders (each once). Plain numbers (decision 48). */
export function crossSolutionTabCounts(data: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]): SolutionTabCounts {
  const needs = crossNeedCoverage(data, solution, issues)
  const stakeholders = crossStakeholderCoverage(data, solution, issues)
  return {
    needs: {
      covered: needs.reduce((n, i) => n + i.coverage.covered.length, 0),
      notCovered: needs.reduce((n, i) => n + i.coverage.notCovered.length, 0),
    },
    stakeholders: { covered: stakeholders.covered.length, notCovered: stakeholders.notCovered.length },
  }
}

// ---------- 總覽 ----------

/** 解開的衝突: the cross-issue conflicts whose wayOutSolutions lists the
 * code, in file order. */
export function crossWayOutConflicts(data: CrossIssueFile, code: string): CrossConflict[] {
  return data.conflicts.filter((c) => c.wayOutSolutions.includes(code))
}

export interface CrossStory {
  issueNumber: number
  story: Story
}

/** A need of a side: a need of one issue, or an X-N group. */
export type CrossSideNeed =
  | { kind: 'issue'; issueNumber: number; need: NeedItem }
  | { kind: 'group'; group: CrossNeedGroup }

export interface CrossConflictView {
  conflict: CrossConflict
  sideA: CrossStory[]
  sideB: CrossStory[]
  needsA: CrossSideNeed[]
  needsB: CrossSideNeed[]
}

/** A cross-issue conflict with its stories and needs found in the issue
 * files. A reference that is not found is left out. Keeps the file order. */
export function crossConflictView(data: CrossIssueFile, conflict: CrossConflict, issues: IssueFile[]): CrossConflictView {
  const fileOf = (n: number | null) => (n === null ? undefined : issues.find((i) => i.number === n))
  const stories = (refs: CrossConflict['sideA']): CrossStory[] =>
    refs.flatMap((r) => {
      const story = fileOf(r.issue)?.stories.find((s) => s.id === r.id)
      return story && r.issue !== null ? [{ issueNumber: r.issue, story }] : []
    })
  const needs = (refs: CrossConflict['needsA']): CrossSideNeed[] =>
    refs.flatMap((r): CrossSideNeed[] => {
      if (r.issue === null) {
        const group = data.needGroups.find((g) => g.id === r.id)
        return group ? [{ kind: 'group', group }] : []
      }
      const file = fileOf(r.issue)
      const need = file && issueNeeds(file).find((i) => i.need.id === r.id)
      return need ? [{ kind: 'issue', issueNumber: r.issue, need }] : []
    })
  return {
    conflict,
    sideA: stories(conflict.sideA),
    sideB: stories(conflict.sideB),
    needsA: needs(conflict.needsA),
    needsB: needs(conflict.needsB),
  }
}

/** 特別關注族群: the solutionFocus items that list the code, in file order. */
export function crossSolutionFocus(data: CrossIssueFile, code: string): CrossSolutionFocus[] {
  return data.solutionFocus.filter((f) => f.solutions.includes(code))
}

// ---------- #/solutions ----------

/** The first group of #/solutions (design 3.9, 3.18, decision 51): the
 * cross-issue solutions in code order. The issue filter keeps a solution
 * when one of its issues is picked. The space filter keeps a solution that
 * uses any picked space type. Empty without the file. */
export function crossSolutionGroup(data: CrossIssueFile | null, filter: SolutionFilter): CrossSolution[] {
  if (data === null) return []
  return data.solutions.filter(
    (s) =>
      (filter.issues.length === 0 || s.parts.some((p) => filter.issues.includes(p.issue))) &&
      (filter.spaces.length === 0 || s.spaces.some((c) => filter.spaces.includes(c))),
  )
}
