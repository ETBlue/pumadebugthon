import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { sideBarFiltersOf, specialStakeholderIds, stakeholderFilterOf } from '@/lib/stakeholderFilter'
import type { IndexFile, IssueFile } from '@/types'

/** The stakeholder picked with ?stakeholder= on the issue page (design 3.14).
 * A moved ID becomes the new ID. An ID that is not in the issue gives null,
 * so the filter is off. */
export function useIssueStakeholder(index: IndexFile, issue: IssueFile): string | null {
  const [params] = useSearchParams()
  return stakeholderFilterOf(params, issue.stakeholders.map((s) => s.id), index.stakeholders)
}

/** The 特別關注 filter of the issue page's tab content (decision 75): the
 * stakeholders of the issue with one of the groups in ?special=, or null
 * when no group is picked. The tabs and the menu counts use the same set. */
export function useIssueSpecial(index: IndexFile, issue: IssueFile): ReadonlySet<string> | null {
  const [params] = useSearchParams()
  const groups = sideBarFiltersOf(params, 'issue').special.join(',')
  return useMemo(
    () => specialStakeholderIds(issue.stakeholders.map((s) => s.id), index.stakeholders, groups === '' ? [] : groups.split(',')),
    [issue, index.stakeholders, groups],
  )
}
