import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { FilterStatus } from '@/components/FilterStatus'
import { StakeholderMenu, StakeholderMenuLayout } from '@/components/StakeholderMenu'
import { sideMenuCounts, type SideMenuContext } from '@/lib/sideMenu'
import { issueSpecialOptions, menuIdsFor, sideBarFiltersOf } from '@/lib/stakeholderFilter'
import { findStakeholder } from '@/lib/stakeholders'
import type { IndexFile, IssueFile } from '@/types'
import { useIssueSpecial } from './useIssueStakeholder'

/** A tab of the issue page with the side menu in filter mode (design 3.21,
 * decision 75: the 特別關注 chips limit the menu and filter the content):
 * the menu first (a column next to the tab side menu from xl, a
 * Collapsible above the content below xl; decision 111), then the tab content with the filter status line at the top.
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
  const filters = sideBarFiltersOf(params)
  const allIds = useMemo(() => issue.stakeholders.map((s) => s.id), [issue])
  // 特別關注 limits which stakeholders the menu lists, and it filters the
  // tab content and the counts (decision 75). The picked stakeholder always
  // stays in the menu.
  const ids = useMemo(
    () => menuIdsFor(allIds, index.stakeholders, filters, current),
    // filters is a new object on each render; special is the real input.
    [allIds, index.stakeholders, filters.special.join(','), current],
  )
  const menuFilters = useMemo(
    () => ({ specialOptions: issueSpecialOptions(allIds, index.stakeholders) }),
    [allIds, index.stakeholders],
  )
  const special = useIssueSpecial(index, issue)
  const counts = useMemo(
    () => sideMenuCounts(context, [issue], ids, filters.dataBasedOnly, special),
    [context, issue, ids, filters.dataBasedOnly, special],
  )
  return (
    <StakeholderMenuLayout
      menu={
        <StakeholderMenu
          ids={ids}
          stakeholders={index.stakeholders}
          pathLabels={index.pathLabels}
          context={context}
          counts={counts}
          filters={menuFilters}
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
