import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { FilterStatus } from '@/components/FilterStatus'
import { StakeholderMenu, StakeholderMenuLayout } from '@/components/StakeholderMenu'
import { sideMenuCounts, type SideMenuContext } from '@/lib/sideMenu'
import { sideBarFiltersOf } from '@/lib/stakeholderFilter'
import { findStakeholder } from '@/lib/stakeholders'
import type { IndexFile, IssueFile } from '@/types'

/** A tab of the issue page with the side menu in filter mode (design 3.21):
 * the menu first (left column from lg, a Collapsible above the content
 * below lg), then the tab content with the filter status line at the top.
 * current is the result of stakeholderFilterOf (useIssueStakeholder), never
 * the raw URL value. context gives the counts of the menu (issue-wants,
 * issue-needs or issue-solutions). shown is the end of the status line, for
 * example t.sideMenu.shownNeeds(4). */
export function IssueFilterLayout({ index, issue, current, context, shown, children }: {
  index: IndexFile
  issue: IssueFile
  current: string | null
  context: SideMenuContext
  shown?: string
  children: ReactNode
}) {
  const [params] = useSearchParams()
  const filters = sideBarFiltersOf(params, 'issue')
  const ids = useMemo(() => issue.stakeholders.map((s) => s.id), [issue])
  const counts = useMemo(
    () => sideMenuCounts(context, [issue], ids, filters.dataBasedOnly),
    [context, issue, ids, filters.dataBasedOnly],
  )
  return (
    <StakeholderMenuLayout
      menu={
        <StakeholderMenu
          mode="filter"
          ids={ids}
          stakeholders={index.stakeholders}
          pathLabels={index.pathLabels}
          context={context}
          counts={counts}
          current={current}
        />
      }
    >
      <FilterStatus
        filters={filters}
        stakeholder={current === null ? null : findStakeholder(index.stakeholders, current)}
        shown={shown}
      />
      {children}
    </StakeholderMenuLayout>
  )
}
