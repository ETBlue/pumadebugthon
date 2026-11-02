// Space type lookups for the issue page (design 3.2 「使用相同空間的議題」).
// A thin wrapper over the generic type helper in typeKinds.ts, with the kind
// 'space'. The space pages use typeKinds.ts directly (Task U3).
import type { IndexFile } from '@/types'
import { sameTypeIssues, type SameType } from './typeKinds'

/** For each space type of the issue (in the issue's order), the other issues
 * that use it. Space types that no other issue uses are left out. */
export function sameSpaceIssues(index: IndexFile, issueNumber: number): SameType[] {
  return sameTypeIssues('space', index, [], issueNumber)
}
