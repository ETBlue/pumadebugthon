// Issue list lookups for the home page (design 3.1).
// Order is always by issue number or by file order. Nothing here sorts by a count.
import type { AvailableIssueSummary, IndexFile, IssueSummary, SpaceType, Stakeholder } from '@/types'
import { isListed, listedStakeholders } from './stakeholders'

/** True for an issue that a participant added, not the hackathon host
 * (來源 參加者補充 in issues.csv). The home card shows a note for it. */
export function isParticipantIssue(issue: IssueSummary): boolean {
  return issue.source === '參加者補充'
}

/** The analyzed issues, by issue number. */
export function availableIssues(index: IndexFile): AvailableIssueSummary[] {
  return index.issues
    .filter((i): i is AvailableIssueSummary => i.available)
    .sort((a, b) => a.number - b.number)
}

export interface Shared {
  /** Number of the issue's stakeholders that also appear in another issue. */
  count: number
  /** The other issues they appear in, by number. */
  issues: number[]
}

/** The stakeholders of an issue that also appear in another issue. Moved
 * IDs are left out. */
export function sharedStakeholders(stakeholders: Stakeholder[], issueNumber: number): Shared {
  const shared = stakeholders.filter(
    (s) => isListed(s) && s.issues.includes(issueNumber) && s.issues.length >= 2,
  )
  const others = new Set(shared.flatMap((s) => s.issues).filter((n) => n !== issueNumber))
  return { count: shared.length, issues: [...others].sort((a, b) => a - b) }
}

/** The 跨議題共用的利害關係人 of one issue card (design 3.9, decision 72).
 * Null when the issue is 製作中 or fewer than 2 issues are analyzed; then
 * the card leaves the field out. */
export function sharedForCard(index: IndexFile, issue: IssueSummary): Shared | null {
  if (!issue.available || availableIssues(index).length < 2) return null
  return sharedStakeholders(index.stakeholders, issue.number)
}

/** The space types that at least one analyzed issue uses, in the order of
 * space-types.csv. */
export function usedSpaceTypes(index: IndexFile): SpaceType[] {
  const used = new Set(availableIssues(index).flatMap((i) => i.spaces))
  return index.spaceTypes.filter((s) => used.has(s.code))
}

/** The name of each code, in the order given. An unknown code keeps the code
 * as its name. */
export function spaceTypeNames(spaceTypes: SpaceType[], codes: string[]): { code: string; name: string }[] {
  return codes.map((code) => ({ code, name: spaceTypes.find((s) => s.code === code)?.name ?? code }))
}

/** The issues that use ANY of the codes. An empty list returns every issue,
 * including the ones without an analysis. */
export function filterIssuesBySpace(issues: IssueSummary[], codes: string[]): IssueSummary[] {
  if (codes.length === 0) return issues
  return issues.filter((i) => i.spaces.some((c) => codes.includes(c)))
}

/** 特別關注 values in the order of design 5.1. */
export const FOCUS_ORDER = ['高齡', '身心障礙', '呼吸道疾病', '兒童與照顧者', '外籍', '經濟弱勢'] as const

/** The 特別關注 values that listed stakeholders (decision 78) use: first in FOCUS_ORDER,
 * then unknown values in string order. */
export function focusOptions(stakeholders: Stakeholder[]): string[] {
  const used = new Set(listedStakeholders(stakeholders).flatMap((s) => s.focus))
  const known: string[] = FOCUS_ORDER.filter((f) => used.has(f))
  const unknown = [...used].filter((f) => !known.includes(f)).sort()
  return [...known, ...unknown]
}
