import { useMemo, useState } from 'react'
import { StakeholderList } from '@/components/StakeholderList'
import { issueStakeholders } from '@/lib/stakeholders'
import type { IssueTabProps } from './types'

/** 利害關係人 (design 3.2): the home page list, limited to this issue and its
 * story counts. */
export function StakeholdersTab({ index, issue, available }: IssueTabProps) {
  const stakeholders = useMemo(() => issueStakeholders(index.stakeholders, issue), [index, issue])
  const issues = useMemo(() => [issue], [issue])
  const [crossIssueOnly, setCrossIssueOnly] = useState(false)
  return (
    <StakeholderList
      stakeholders={stakeholders}
      pathLabels={index.pathLabels}
      issues={issues}
      showCrossIssueFilter={available.length >= 2}
      crossIssueOnly={crossIssueOnly}
      onCrossIssueOnlyChange={setCrossIssueOnly}
    />
  )
}
