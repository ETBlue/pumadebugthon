import { useMemo } from 'react'
import { Outlet, useOutletContext, useParams, useSearchParams } from 'react-router'
import { LoadState } from '@/components/LoadState'
import { StakeholderMenu, StakeholderMenuLayout } from '@/components/StakeholderMenu'
import { useIndex, useIssues, type DataState } from '@/data'
import { availableIssues } from '@/lib/issues'
import { sideMenuCounts } from '@/lib/sideMenu'
import { menuIdsFor, sideBarFiltersOf, specialOptions } from '@/lib/stakeholderFilter'
import { stakeholderMenuIds, stakeholderSideMenuState } from '@/lib/stakeholderPage'
import type { IndexFile, IssueFile } from '@/types'

/** What the layout gives to the page in its <Outlet>. */
export interface StakeholdersOutlet {
  /** Every analyzed issue. The menu counts and the statistics use them. */
  allIssues: DataState<IssueFile[]>
  /** The IDs the side menu lists (menuIdsFor), in ID order. */
  menuIds: string[]
}

/** The data of the shared layout, for #/stakeholders and the stakeholder page. */
export function useStakeholdersOutlet(): StakeholdersOutlet {
  return useOutletContext<StakeholdersOutlet>()
}

/** The layout route of #/stakeholders and #/stakeholders/:id/:tab?
 * (decision 64). It shows the side bar and the page in an <Outlet> as the
 * main block. The menu stays mounted when the reader picks another
 * stakeholder, so its open and closed groups stay. The story page is not in
 * this layout. */
export default function StakeholdersLayout() {
  const index = useIndex()
  if (index.status !== 'ready') return <LoadState state={index} />
  return <LayoutContent index={index.data} />
}

function LayoutContent({ index }: { index: IndexFile }) {
  const { id, tab } = useParams()
  const [params] = useSearchParams()
  const state = stakeholderSideMenuState(index.stakeholders, id, tab)
  const current = state?.mode === 'switch' ? state.current : null

  const allIds = useMemo(() => stakeholderMenuIds(index), [index])
  const filters = sideBarFiltersOf(params)
  const menuIds = useMemo(
    () => menuIdsFor(allIds, index.stakeholders, filters, current),
    // filters is a new object on each render; its parts are the real inputs.
    [allIds, index.stakeholders, filters.crossIssueOnly, filters.special.join(','), current],
  )
  const menuFilters = useMemo(() => {
    const listed = index.stakeholders.filter((x) => allIds.includes(x.id))
    return { showCrossIssue: availableIssues(index).length >= 2, specialOptions: specialOptions(listed) }
  }, [index, allIds])

  // The counts are summed over every analyzed issue (decision 66).
  const allFolders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const allIssues = useIssues(allFolders)
  const context = state?.context ?? 'stakeholders'
  const counts = useMemo(
    () => (allIssues.status === 'ready' ? sideMenuCounts(context, allIssues.data, menuIds, filters.dataBasedOnly) : null),
    [allIssues, context, menuIds, filters.dataBasedOnly],
  )

  const outlet: StakeholdersOutlet = { allIssues, menuIds }
  // A moved ID redirects and an unknown ID shows "not found": no side bar.
  if (state === null) return <Outlet context={outlet} />

  const common = { ids: menuIds, stakeholders: index.stakeholders, pathLabels: index.pathLabels, context, counts, filters: menuFilters }
  return (
    <StakeholderMenuLayout
      menu={
        // One element in the same place in both modes, so React keeps its state.
        state.mode === 'switch'
          ? <StakeholderMenu mode="switch" {...common} current={state.current} tab={state.tab} />
          : <StakeholderMenu mode="link" {...common} />
      }
    >
      <Outlet context={outlet} />
    </StakeholderMenuLayout>
  )
}
