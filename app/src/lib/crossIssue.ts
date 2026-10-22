// Cross-issue solutions (design 3.18): lookups for the page #/solutions/X-A
// and for the other places that show them. The data is cross-issue.json.
// Every function takes null for a missing file and then returns nothing.
// Order is always code order (X-A, X-B, …), file order, issue number order or
// ID order. Nothing here sorts by a count.
import type {
  CrossConflict, CrossIssueFile, CrossNeedGroup, CrossRef, CrossSolution, CrossSolutionFocus, IssueFile, Story,
} from '@/types'
import { compareIds } from './ids'
import { issueNeeds, needsOfStakeholder, type NeedItem } from './needs'
import { wantsOfCoverage, type CoveredNeed, type NeedCoverage, type StakeholderEntry, type WantCoverage } from './solutionPage'
import { practiceCounts, type SolutionTabCounts } from './tabCounts'

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

/** The files of the solution's issues (the issues in parts), in number
 * order. An issue with no file in the list is left out. */
export function issuesOfCross(solution: CrossSolution, issues: IssueFile[]): IssueFile[] {
  return crossIssueNumbers(solution).flatMap((n) => issues.find((i) => i.number === n) ?? [])
}

/** The issues that the solution page needs (design 3.18, decision 60): the
 * issues in parts, plus the issues of every need the solution covers
 * (needs.must, needs.shouldCould and the X-N groups in needs.crossIssue).
 * Each once, in number order. For example X-E has parts in #2 and #8, but
 * its group X-N03 has #1 N15, so this gives [1, 2, 8]. */
export function crossCoverageIssueNumbers(data: CrossIssueFile, solution: CrossSolution): number[] {
  const numbers = [
    ...crossIssueNumbers(solution),
    ...solution.needs.must.map((r) => r.issue),
    ...solution.needs.shouldCould.map((r) => r.issue),
    ...crossNeedGroupsOf(data, solution).flatMap((g) => g.needs.map((m) => m.issue)),
  ]
  return [...new Set(numbers.filter((n): n is number => n !== null))].sort((a, b) => a - b)
}

/** The files of crossCoverageIssueNumbers, in number order, each with
 * inParts: true when the issue is in parts. An issue with no file in the
 * list is left out. */
function coverageFiles(data: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]) {
  const inParts = new Set(crossIssueNumbers(solution))
  return crossCoverageIssueNumbers(data, solution).flatMap((n) => {
    const issue = issues.find((i) => i.number === n)
    return issue ? [{ issue, inParts: inParts.has(n) }] : []
  })
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
// in an X-N group listed in needs.crossIssue. This can be a need of an issue
// that is not in parts. Not covered: every other need of the issues in parts.
// An issue that is not in parts has no not covered need.

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
  /** true when the issue is in parts. false: the issue is here only because
   * the solution covers some of its needs, and notCovered is empty. */
  inParts: boolean
  coverage: NeedCoverage
}

/** The needs of one issue to split: all of them for an issue in parts, only
 * the covered ones for another issue. Keeps the order. */
function needsToSplit<T extends NeedItem>(items: T[], parts: Map<string, CoveredNeed['part']>, inParts: boolean): T[] {
  return inParts ? items : items.filter((i) => parts.has(i.need.id))
}

/** The covered and not covered needs, per issue of crossCoverageIssueNumbers
 * (number order). Inside an issue, the order of step 5.2. Pass the issue
 * files; an issue with no file is left out. */
export function crossNeedCoverage(data: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]): IssueCoverage[] {
  return coverageFiles(data, solution, issues).map(({ issue, inParts }) => {
    const parts = coveredParts(data, solution, issue.number)
    return {
      issueNumber: issue.number,
      inParts,
      coverage: splitNeeds(needsToSplit(issueNeeds(issue), parts, inParts), parts),
    }
  })
}

/** The 利害關係人 tab (design 3.18): each stakeholder of the issues in parts
 * (step 1), and each stakeholder of a covered need of another issue, once,
 * in ID order, with its needs split by issue (number order). For an issue
 * that is not in parts, only the covered needs show. An issue where the
 * stakeholder has no need to show is left out of its entry. A stakeholder
 * is covered when at least one of its needs, in any of the issues, is covered. */
export function crossStakeholderCoverage(
  data: CrossIssueFile,
  solution: CrossSolution,
  issues: IssueFile[],
): { covered: StakeholderEntry[]; notCovered: StakeholderEntry[] } {
  const files = coverageFiles(data, solution, issues).map((f) => ({
    ...f,
    parts: coveredParts(data, solution, f.issue.number),
  }))
  const ids = [
    ...new Set(
      files.flatMap(({ issue, inParts, parts }) =>
        inParts
          ? issue.stakeholders.map((s) => s.id)
          : needsToSplit(issueNeeds(issue), parts, false).flatMap((i) => i.stakeholders),
      ),
    ),
  ].sort(compareIds)
  const out = { covered: [] as StakeholderEntry[], notCovered: [] as StakeholderEntry[] }
  for (const id of ids) {
    const entry: StakeholderEntry = {
      id,
      issues: files.flatMap(({ issue, inParts, parts }) => {
        const needs = needsToSplit(needsOfStakeholder(issue, id), parts, inParts)
        return needs.length === 0 ? [] : [{ issueNumber: issue.number, ...splitNeeds(needs, parts) }]
      }),
    }
    if (entry.issues.some((i) => i.covered.length > 0)) out.covered.push(entry)
    else out.notCovered.push(entry)
  }
  return out
}

export interface IssueWantCoverage {
  issueNumber: number
  /** As in IssueCoverage: false means the issue is not in parts, and
   * wants.notCovered is empty. */
  inParts: boolean
  wants: WantCoverage
}

/** The 訴求 tab (decision 103): the stories of the covered and the not
 * covered needs, per issue of crossNeedCoverage (number order). One want is
 * one story. An issue that is not in parts has only covered wants. */
export function crossWantCoverage(data: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]): IssueWantCoverage[] {
  return crossNeedCoverage(data, solution, issues).flatMap(({ issueNumber, inParts, coverage }) => {
    const issue = issues.find((i) => i.number === issueNumber)
    return issue ? [{ issueNumber, inParts, wants: wantsOfCoverage(issue, coverage) }] : []
  })
}

export interface CrossRelatedConflict {
  conflict: CrossConflict
  /** The covered stories in the conflict: side A first, then side B. */
  covered: CrossRef[]
}

/** 相關的衝突 of a cross-issue solution (decision 103): the cross-issue
 * conflicts with a covered story (crossWantCoverage) on either side, but not
 * the ones whose way out lists the code. File order. */
export function crossRelatedConflicts(data: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]): CrossRelatedConflict[] {
  const key = (issue: number | null, id: string) => `${issue}-${id}`
  const covered = new Set(
    crossWantCoverage(data, solution, issues).flatMap((i) => i.wants.covered.map((s) => key(i.issueNumber, s.id))),
  )
  return data.conflicts.flatMap((conflict) => {
    if (conflict.wayOutSolutions.includes(solution.code)) return []
    const refs = [...conflict.sideA, ...conflict.sideB].filter((r) => covered.has(key(r.issue, r.id)))
    const unique = refs.filter((r, i) => refs.findIndex((o) => o.issue === r.issue && o.id === r.id) === i)
    return unique.length === 0 ? [] : [{ conflict, covered: unique }]
  })
}

/** The counts of the tab labels: the needs and the wants summed over the
 * issues, the stakeholders (each once), the cross-issue conflicts, the
 * measures and the practices. Plain numbers (decision 48). */
export function crossSolutionTabCounts(data: CrossIssueFile, solution: CrossSolution, issues: IssueFile[]): SolutionTabCounts {
  const needs = crossNeedCoverage(data, solution, issues)
  const wants = crossWantCoverage(data, solution, issues)
  const stakeholders = crossStakeholderCoverage(data, solution, issues)
  return {
    needs: {
      covered: needs.reduce((n, i) => n + i.coverage.covered.length, 0),
      notCovered: needs.reduce((n, i) => n + i.coverage.notCovered.length, 0),
    },
    wants: {
      covered: wants.reduce((n, i) => n + i.wants.covered.length, 0),
      notCovered: wants.reduce((n, i) => n + i.wants.notCovered.length, 0),
    },
    stakeholders: { covered: stakeholders.covered.length, notCovered: stakeholders.notCovered.length },
    conflicts: {
      wayOut: crossWayOutConflicts(data, solution.code).length,
      related: crossRelatedConflicts(data, solution, issues).length,
    },
    measures: solution.measures.length,
    policies: practiceCounts(solution.practices),
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
