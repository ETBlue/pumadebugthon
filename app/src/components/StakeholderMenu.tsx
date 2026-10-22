import { createContext, useContext, useId, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useLocation, useSearchParams, type To } from 'react-router'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { sideMenuTree, type SideMenuContext } from '@/lib/sideMenu'
import { sideBarFiltersOf, stakeholderMenuSearch, withSpecialFilter } from '@/lib/stakeholderFilter'
import { findStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { Stakeholder } from '@/types'
import { DataBasisToggle } from './DataBasisToggle'
import { StakeholderTree } from './StakeholderTree'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const tm = t.sideMenu

/** The 特別關注 filter of the side bar (decision 75). */
export interface StakeholderFilterOptions {
  /** The 特別關注 chips, in FOCUS_ORDER (issueSpecialOptions). Empty: no chips. */
  specialOptions: string[]
}

/** The props of StakeholderMenu (design 3.21). The menu is only on the 訴求,
 * 需求 and 解法 tabs of the issue page (decisions 87 and 94). A link sets
 * ?stakeholder=<id> on the same tab. 「全部利害關係人」 is the first item,
 * with no count (decision 76), and removes it. The current item has
 * aria-current="true". The filters are 只看有資料根據, then 特別關注. Every
 * link keeps evidence and special. */
export interface StakeholderMenuProps {
  /** The stakeholder IDs in the menu. Pass the result of menuIdsFor, so the
   * menu follows 特別關注. The component puts them in the tree
   * (sideMenuTree): tree order and ID order. */
  ids: string[]
  /** All stakeholders from index.json, for the names and the paths. */
  stakeholders: Stakeholder[]
  /** index.json pathLabels, for the level names. */
  pathLabels: Record<string, string>
  /** The page, so the meaning of the counts (the count line and the hidden unit). */
  context: SideMenuContext
  /** The count next to each stakeholder (sideMenuCounts, with the same
   * 只看有資料根據 filter as the main block). null while the data loads: no
   * counts and no count line. */
  counts: Map<string, number> | null
  /** The filters after 只看有資料根據. */
  filters: StakeholderFilterOptions
  /** The picked stakeholder (stakeholderFilterOf), or null. */
  current: string | null
}

/** The id of the main block next to the side bar, for the skip link. Set by
 * StakeholderMenuLayout. */
const MainIdContext = createContext<string | null>(null)

/** The side menu (design 3.21): the skip link, the filters group 「篩選」, the
 * count line and the tree (StakeholderTree) in a <nav>. Put it in
 * StakeholderMenuLayout.
 * From xl it is always shown. Below xl the whole side bar is one
 * Collapsible, closed by default, closed again after a pick. From md the
 * tab side menu of PageTabs is a column on the left, so the stakeholder
 * menu has room for its own column only from xl (decision 111). */
export function StakeholderMenu(props: StakeholderMenuProps) {
  const { ids, stakeholders, pathLabels, context, counts, filters, current } = props
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const mainId = useContext(MainIdContext)
  const filtersLabelId = useId()
  const specialLabelId = useId()

  const tree = useMemo(() => sideMenuTree(ids, stakeholders, pathLabels), [ids, stakeholders, pathLabels])

  // Below xl: the whole side bar. Closed by default on every page (Q17).
  const [open, setOpen] = useState(false)

  const pageFilters = sideBarFiltersOf(params)
  const setUrl = (next: (prev: URLSearchParams) => URLSearchParams) =>
    setParams(next, { replace: true, preventScrollReset: true })

  const targetOf = (id: string | null): To => ({ pathname, search: stakeholderMenuSearch(params, id) })
  const picked = current === null ? null : findStakeholder(stakeholders, current)

  const skip = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const main = mainId === null ? null : document.getElementById(mainId)
    main?.focus()
    main?.scrollIntoView()
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group flex min-h-6 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted xl:hidden">
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
        <span className="min-w-0 break-words">{tm.trigger(picked === null ? null : tm.item(picked.id, picked.name))}</span>
      </CollapsibleTrigger>
      {/* forceMount: from xl the side bar is always shown, also when closed. */}
      <CollapsibleContent forceMount className="mt-2 space-y-4 data-[state=closed]:hidden xl:mt-0 xl:data-[state=closed]:block">
        {mainId !== null && (
          // With hash URLs, href="#id" would change the route. Move focus instead.
          <a
            href={`#${mainId}`}
            onClick={skip}
            className="sr-only rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:block focus:border"
          >
            {tm.skip}
          </a>
        )}

        <div role="group" aria-labelledby={filtersLabelId} className="space-y-3">
          <p id={filtersLabelId} className="text-sm font-medium text-muted-foreground">{tm.filters}</p>
          <DataBasisToggle variant="sideBar" />
          {filters.specialOptions.length > 0 && (
            <div className="space-y-1">
              <p id={specialLabelId} className="text-sm text-muted-foreground">{tm.special}</p>
              <ToggleGroup
                type="multiple"
                variant="outline"
                size="sm"
                value={pageFilters.special}
                onValueChange={(groups) => setUrl((prev) => withSpecialFilter(prev, groups))}
                aria-labelledby={specialLabelId}
                className="w-full flex-wrap"
              >
                {filters.specialOptions.map((f) => (
                  <ToggleGroupItem key={f} value={f} className={toggleOnClass}>
                    <ToggleCheck />
                    {f}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
        </div>

        {counts !== null && <p className="text-xs text-muted-foreground">{tm.countLine[context]}</p>}

        <nav aria-label={tm.navLabel}>
          <StakeholderTree
            tree={tree}
            targetOf={targetOf}
            current={current}
            ariaCurrent="true"
            counts={counts}
            countUnit={tm.countUnit[context]}
            onPick={() => setOpen(false)}
          />
        </nav>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** The layout of a page with the side menu (design 3.21, decision 111).
 * From xl: the menu in a column (16rem) between the tab side menu of
 * PageTabs and the main block, sticky at the top, with its own scroll when
 * it is taller than the window. The main block is on the right. Below xl:
 * the menu above the main block (at md and lg the tab side menu already
 * takes a column, so a second column would leave too little room). The menu comes first in the
 * keyboard order. The main block gets an id and tabIndex={-1}, so the skip
 * link of the menu can move focus to it. menu null: the main block only,
 * full width (for example the 總覽 tab of the issue page). */
export function StakeholderMenuLayout({ menu, className, children }: {
  menu: ReactNode | null
  className?: string
  children: ReactNode
}) {
  const mainId = useId()
  if (menu === null) return <div className={className}>{children}</div>
  return (
    <div className={cn('xl:grid xl:grid-cols-[16rem_minmax(0,1fr)] xl:items-start xl:gap-8', className)}>
      {/* The grid item itself is sticky. Its parent (the grid) is as tall as
          the content, so it can stay at the top while the page scrolls. */}
      <div className="mb-4 xl:sticky xl:top-4 xl:mb-0 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:p-1">
        <MainIdContext.Provider value={mainId}>{menu}</MainIdContext.Provider>
      </div>
      <div id={mainId} tabIndex={-1} className="min-w-0 focus:outline-none">{children}</div>
    </div>
  )
}
