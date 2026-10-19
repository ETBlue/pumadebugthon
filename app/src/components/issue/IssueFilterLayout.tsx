import type { ReactNode } from 'react'
import { StakeholderMenu, StakeholderMenuLayout } from '@/components/StakeholderMenu'
import type { IndexFile, IssueFile } from '@/types'

/** A tab of the issue page with the stakeholder menu in filter mode (design
 * 3.14): the menu first (left column from lg, a Collapsible above the
 * content below lg), then the tab content. current is the result of
 * stakeholderFilterOf (useIssueStakeholder), never the raw URL value.
 * shown is the text of the status line, for example tm.shownNeeds(4). */
export function IssueFilterLayout({ index, issue, current, shown, children }: {
  index: IndexFile
  issue: IssueFile
  current: string | null
  shown?: string
  children: ReactNode
}) {
  return (
    <StakeholderMenuLayout
      menu={
        <StakeholderMenu
          mode="filter"
          ids={issue.stakeholders.map((s) => s.id)}
          stakeholders={index.stakeholders}
          current={current}
          shown={shown}
        />
      }
    >
      {children}
    </StakeholderMenuLayout>
  )
}
