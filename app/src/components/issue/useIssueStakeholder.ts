import { useSearchParams } from 'react-router'
import { stakeholderFilterOf } from '@/lib/stakeholderFilter'
import type { IndexFile, IssueFile } from '@/types'

/** The stakeholder picked with ?stakeholder= on the issue page (design 3.14).
 * A moved ID becomes the new ID. An ID that is not in the issue gives null,
 * so the filter is off. */
export function useIssueStakeholder(index: IndexFile, issue: IssueFile): string | null {
  const [params] = useSearchParams()
  return stakeholderFilterOf(params, issue.stakeholders.map((s) => s.id), index.stakeholders)
}
