import { useMemo, useState } from 'react'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { focusTargetProps } from '@/components/FocusTarget'
import { StakeholderList } from '@/components/StakeholderList'
import { focusTargetClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { groupsNotIncluded } from '@/lib/focusGroups'
import { issueStakeholders } from '@/lib/stakeholders'
import type { IssueTabProps } from './types'

const ts = t.issue.stakeholdersTab

/** 利害關係人 (design 3.2, decisions 115 and 116). It is the second tab,
 * right after 總覽. From top to bottom:
 * 1. One line with the 特別關注族群 that the issue has not included yet
 *    (「本議題尚未納入：…」, groupsNotIncluded, in the fixed order). When
 *    every group is included, the line says so. The filters do not change it.
 * 2. The stakeholder list (StakeholderList): the menu bar with every filter
 *    of the tab (also 只看有資料根據, decision 116), the count note and the
 *    priority legend, then the tree with detailed cards that list the
 *    stories, every level open.
 * The whole content has the element ID focus-stakeholders, so the links
 * from the stakeholder cards (?focus=stakeholders) scroll here.
 * Decision 115 removed the cards of the disadvantaged groups (decision 109).
 * Decision 116 brought 只看有資料根據 back, now for the stories. */
export function StakeholdersTab({ index, issue, available }: IssueTabProps) {
  const stakeholders = useMemo(() => issueStakeholders(index.stakeholders, issue), [index, issue])
  const issues = useMemo(() => [issue], [issue])
  const missing = useMemo(() => groupsNotIncluded(issue, index.stakeholders), [issue, index])
  const [crossIssueOnly, setCrossIssueOnly] = useState(false)
  const [dataBasedOnly] = useDataBasisFilter()

  return (
    <div {...focusTargetProps('stakeholders')} className={`space-y-4 ${focusTargetClass}`}>
      <p>{missing.length > 0 ? ts.notIncluded(missing) : ts.allIncluded}</p>
      <StakeholderList
        stakeholders={stakeholders}
        pathLabels={index.pathLabels}
        issues={issues}
        showCrossIssueFilter={available.length >= 2}
        crossIssueOnly={crossIssueOnly}
        onCrossIssueOnlyChange={setCrossIssueOnly}
        dataBasedOnly={dataBasedOnly}
      />
    </div>
  )
}
