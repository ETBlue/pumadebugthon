import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { DataBasisToggle } from '@/components/DataBasisToggle'
import { FilterStatus } from '@/components/FilterStatus'
import { IssueMenuBar, JoinedScroll, MenuBarGroup } from '@/components/IssueMenuBar'
import { StakeholderPicker } from '@/components/StakeholderPicker'
import { toggleOnClass } from '@/components/styles'
import { ToggleCheck } from '@/components/ToggleCheck'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { priorityLabel } from '@/lib/priority'
import { sideMenuCounts, type SideMenuContext } from '@/lib/sideMenu'
import {
  clearFiltersSearch, clearNeedsTabSearch, issueSpecialOptions, menuIdsFor, sideBarFiltersOf, stakeholderMenuSearch,
  withConflictFilter, withPriorityFilter, withSpecialFilter, type NeedsTabFilters,
} from '@/lib/stakeholderFilter'
import { findStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { IndexFile, IssueFile, Priority } from '@/types'
import { useIssueSpecial } from './useIssueStakeholder'

const tm = t.sideMenu

/** The two extra filters of the 需求 tab (decision 127). */
export interface NeedsBarFilters {
  /** The 優先順序 toggles: the priorities that the needs of the issue use,
   * in the fixed order M, S, C, W. No group when empty. */
  priorityOptions: Priority[]
  /** Show 只看有衝突的需求: the issue has at least one conflict. */
  showConflict: boolean
  /** The values from the URL (priorityFilterOf, conflictFilterOf). */
  value: NeedsTabFilters
}

/** A tab of the issue page with the stakeholder filter (the 訴求, 需求 and
 * 解法 tabs; design 3.2, decision 116). From top to bottom:
 * 1. The menu bar (IssueMenuBar) with every filter of the tab: the
 *    stakeholder picker (StakeholderPicker, the same one as #/issues and
 *    #/solutions, with ?stakeholder=<id> and the counts of the tab), the
 *    特別關注 toggles (?special=, decision 75) and 只看有資料根據.
 * 2. The filter status line with 「清除篩選」 (decision 68).
 * 3. The tab content.
 * Decision 116 removed the stakeholder side menu (StakeholderMenu) of these
 * tabs. current is the result of stakeholderFilterOf (useIssueStakeholder),
 * never the raw URL value. context gives the counts of the picker
 * (issue-wants, issue-needs or issue-solutions). shown is the end of the
 * status line, for example t.sideMenu.shownNeeds(4).
 * needs: only on the 需求 tab (decision 127). The bar then also has the
 * 優先順序 toggles (?priority=, a joined group like 特別關注) and a 篩選
 * group with 只看有衝突的需求 (?conflict=1) and 只看有資料根據, like the 篩選
 * group of the 利害關係人 tab. The status line names them, and
 * 「清除篩選」 removes them too (clearNeedsTabSearch). */
export function IssueFilterLayout({ index, issue, current, context, shown, needs, children }: {
  index: IndexFile
  issue: IssueFile
  current: string | null
  context: SideMenuContext
  shown?: string
  needs?: NeedsBarFilters
  children: ReactNode
}) {
  const [params, setParams] = useSearchParams()
  const filters = sideBarFiltersOf(params)
  const allIds = useMemo(() => issue.stakeholders.map((s) => s.id), [issue])
  // 特別關注 limits which stakeholders the picker lists, and it filters the
  // tab content and the counts (decision 75). The picked stakeholder always
  // stays in the picker.
  const ids = useMemo(
    () => menuIdsFor(allIds, index.stakeholders, filters, current),
    // filters is a new object on each render; special is the real input.
    [allIds, index.stakeholders, filters.special.join(','), current],
  )
  const specialOptions = useMemo(() => issueSpecialOptions(allIds, index.stakeholders), [allIds, index.stakeholders])
  const special = useIssueSpecial(index, issue)
  const counts = useMemo(
    () => sideMenuCounts(context, [issue], ids, filters.dataBasedOnly, special),
    [context, issue, ids, filters.dataBasedOnly, special],
  )
  const setSpecial = (groups: string[]) =>
    setParams((prev) => withSpecialFilter(prev, groups), { replace: true, preventScrollReset: true })
  const setPriorities = (priorities: string[]) =>
    setParams((prev) => withPriorityFilter(prev, priorities), { replace: true, preventScrollReset: true })
  const setConflictOnly = (on: boolean) =>
    setParams((prev) => withConflictFilter(prev, on), { replace: true, preventScrollReset: true })

  return (
    <div>
      <IssueMenuBar label={tm.filters}>
        <StakeholderPicker
          stakeholders={index.stakeholders}
          pathLabels={index.pathLabels}
          value={current}
          ids={ids}
          searchOf={stakeholderMenuSearch}
          counts={counts}
          countUnit={tm.countUnit[context]}
          countNote={tm.countLine[context]}
          className="max-w-full"
        />
        {specialOptions.length > 0 && (
          <MenuBarGroup label={tm.special}>
            <JoinedScroll>
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={0}
                value={filters.special}
                onValueChange={setSpecial}
                aria-label={tm.special}
              >
                {specialOptions.map((f) => (
                  <ToggleGroupItem key={f} value={f} className={cn(toggleOnClass, 'bg-background')}>
                    <ToggleCheck />
                    {f}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </JoinedScroll>
          </MenuBarGroup>
        )}
        {needs && needs.priorityOptions.length > 0 && (
          <MenuBarGroup label={tm.priorityGroup}>
            <JoinedScroll>
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={0}
                value={needs.value.priorities}
                onValueChange={setPriorities}
                aria-label={tm.priorityGroup}
              >
                {needs.priorityOptions.map((p) => (
                  <ToggleGroupItem key={p} value={p} className={cn(toggleOnClass, 'bg-background')}>
                    <ToggleCheck />
                    {priorityLabel(p)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </JoinedScroll>
          </MenuBarGroup>
        )}
        {needs ? (
          <MenuBarGroup label={tm.needsFilterGroup}>
            {needs.showConflict && (
              <Toggle
                variant="outline"
                pressed={needs.value.conflictOnly}
                onPressedChange={setConflictOnly}
                className={cn(toggleOnClass, 'shrink-0 bg-background')}
              >
                <ToggleCheck />
                {tm.conflictOnly}
              </Toggle>
            )}
            <DataBasisToggle variant="bar" />
          </MenuBarGroup>
        ) : (
          <DataBasisToggle variant="bar" />
        )}
      </IssueMenuBar>
      <FilterStatus
        filters={filters}
        stakeholder={current === null ? null : findStakeholder(index.stakeholders, current)}
        needs={needs?.value ?? null}
        clearSearch={needs ? clearNeedsTabSearch : clearFiltersSearch}
        shown={shown}
        className="mt-3"
      />
      <div className="mt-4">{children}</div>
    </div>
  )
}
