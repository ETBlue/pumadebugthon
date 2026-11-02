// The candidate pairs of the cross-issue file (rule R3), for the 可能合併 tab
// of an issue solution page (Task U6 of app/docs/plan-types-ui.md,
// decision 4). The app never runs rule R3 itself. It only shows the rows of
// candidates.csv. A pair is only a suggestion: a person decides.
// There is no score and no rank. Nothing here counts the shared things, and
// nothing sorts by a count.
import type { Candidate, CrossIssueFile, CrossNeedGroup } from '@/types'
import { compareCodes } from './ids'
import { parseSolutionSlug } from './entityPaths'

/** The other solution of one pair, seen from one solution. */
export interface SolutionCandidate {
  issueNumber: number
  /** The solution code, for example "S2". */
  code: string
  /** The row of candidates.csv. */
  candidate: Candidate
}

/** The pairs of the solution issueNumber-code: the other side of each row
 * where the solution is a or b. Each other solution once (the first row in
 * file order wins). Order: issue number, then solution ID, both as numbers,
 * so #4 S2 comes before #4 S10 and before #12 S1. [] when the file is
 * missing or the solution has no pair. */
export function solutionCandidates(data: CrossIssueFile | null, issueNumber: number, code: string): SolutionCandidate[] {
  if (data === null) return []
  const self = `${issueNumber}-${code}`
  const out = new Map<string, SolutionCandidate>()
  for (const candidate of data.candidates) {
    const other = candidate.a === self ? candidate.b : candidate.b === self ? candidate.a : null
    if (other === null || out.has(other)) continue
    const slug = parseSolutionSlug(other)
    if (slug?.kind !== 'issue') continue
    out.set(other, { issueNumber: slug.issueNumber, code: slug.code, candidate })
  }
  return [...out.entries()].sort(([a], [b]) => compareCodes(a, b)).map(([, c]) => c)
}

/** One item of 共同需求: an X-N group (group is null when the file does not
 * have it), or a 1.2 row such as 「1.2 O12」, kept as written. */
export type CandidateNeed =
  | { kind: 'group'; id: string; group: CrossNeedGroup | null }
  | { kind: 'text'; text: string }

/** The items of 共同需求, in the order of the cell. */
export function candidateNeeds(data: CrossIssueFile, needs: string[]): CandidateNeed[] {
  return needs.map((need): CandidateNeed =>
    /^X-N[1-9]\d*$/.test(need)
      ? { kind: 'group', id: need, group: data.needGroups.find((g) => g.id === need) ?? null }
      : { kind: 'text', text: need })
}
