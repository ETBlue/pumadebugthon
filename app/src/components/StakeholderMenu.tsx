import { createContext, useContext, useId, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useLocation, useSearchParams, type To } from 'react-router'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { stakeholderTabPath, type StakeholderTab } from '@/lib/entityPaths'
import { groupKeysAbove, sideMenuTree, type SideMenuContext, type SideMenuGroup } from '@/lib/sideMenu'
import {
  allStakeholdersTarget, sideBarFiltersOf, sideMenuLinkSearch, stakeholderMenuSearch, withCrossIssueFilter, withSpecialFilter,
} from '@/lib/stakeholderFilter'
import { findStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { Stakeholder } from '@/types'
import { DataBasisToggle } from './DataBasisToggle'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const tm = t.sideMenu

/** The filters 只看跨議題 and 特別關注 of the side bar (decisions 67 and 75). */
export interface StakeholderFilterOptions {
  /** Show 只看跨議題. Design: only on the stakeholder pages, with 2 or more
   * analyzed issues. Always false on the issue page. */
  showCrossIssue: boolean
  /** The 特別關注 chips, in FOCUS_ORDER (specialOptions). Empty: no chips. */
  specialOptions: string[]
}

interface CommonProps {
  /** The stakeholder IDs in the menu. Pass the result of menuIdsFor, so the
   * menu follows 只看跨議題 and 特別關注. The
   * component puts them in the tree (sideMenuTree): tree order and ID order. */
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
}

/** The props of StakeholderMenu (design 3.21). Three modes:
 * - filter: the 訴求, 需求 and 解法 tabs of the issue page. A link sets
 *   ?stakeholder=<id> on the same tab. 「全部利害關係人」 removes it.
 *   current: the picked stakeholder (stakeholderFilterOf), or null.
 *   aria-current="true".
 * - switch: a stakeholder page. A link goes to the same tab of that
 *   stakeholder. 「全部利害關係人」 goes to #/stakeholders. current: the
 *   stakeholder of the page. aria-current="page".
 * - link: #/stakeholders. A link goes to the 總覽 tab of that stakeholder.
 *   「全部利害關係人」 is the current item (aria-current="page").
 * 「全部利害關係人」 is the first item in every mode, with no count
 * (decision 76). The filters are 只看有資料根據, then the ones in filters.
 * Every link keeps evidence, cross and special. */
export type StakeholderMenuProps =
  | (CommonProps & { mode: 'filter'; current: string | null })
  | (CommonProps & { mode: 'switch'; current: string; tab: StakeholderTab })
  | (CommonProps & { mode: 'link' })

/** The id of the main block next to the side bar, for the skip link. Set by
 * StakeholderMenuLayout. */
const MainIdContext = createContext<string | null>(null)

/** The side menu (design 3.21): the skip link, the filters group 「篩選」, the
 * count line and the tree in a <nav>. Each group of the tree is a
 * Collapsible, open when the page loads. The groups above the current item
 * open again when the current item changes. Put it in StakeholderMenuLayout.
 * From lg it is always shown. Below lg the whole side bar is one
 * Collapsible, closed by default, closed again after a pick. */
export function StakeholderMenu(props: StakeholderMenuProps) {
  const { ids, stakeholders, pathLabels, context, counts, mode, filters } = props
  const current = props.mode === 'link' ? null : props.current
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const mainId = useContext(MainIdContext)
  const filtersLabelId = useId()
  const specialLabelId = useId()

  const tree = useMemo(() => sideMenuTree(ids, stakeholders, pathLabels), [ids, stakeholders, pathLabels])

  // Below lg: the whole side bar. Closed by default on every page (Q17).
  const [open, setOpen] = useState(false)
  // The groups the reader closed. Every other group is open.
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  // When the current item changes, open the groups above it again. This
  // runs during render (not in an effect), so the item is never hidden.
  const [seenCurrent, setSeenCurrent] = useState(current)
  if (seenCurrent !== current) {
    setSeenCurrent(current)
    const above = groupKeysAbove(tree, current)
    if (above.some((k) => closed.has(k))) setClosed(new Set([...closed].filter((k) => !above.includes(k))))
  }
  const setGroupOpen = (key: string, on: boolean) => {
    const next = new Set(closed)
    if (on) next.delete(key)
    else next.add(key)
    setClosed(next)
  }

  const pageFilters = sideBarFiltersOf(params, mode === 'filter' ? 'issue' : 'stakeholders')
  const setUrl = (next: (prev: URLSearchParams) => URLSearchParams) =>
    setParams(next, { replace: true, preventScrollReset: true })

  const targetOf = (id: string | null): To => {
    if (props.mode === 'filter') return { pathname, search: stakeholderMenuSearch(params, id) }
    if (id === null) return allStakeholdersTarget(params)
    const tab = props.mode === 'switch' ? props.tab : 'overview'
    return { pathname: stakeholderTabPath(id, tab), search: sideMenuLinkSearch(params) }
  }
  const ariaCurrent = mode === 'filter' ? 'true' : 'page'
  const picked = current === null ? null : findStakeholder(stakeholders, current)

  const skip = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const main = mainId === null ? null : document.getElementById(mainId)
    main?.focus()
    main?.scrollIntoView()
  }

  const item = (key: string, id: string | null, label: ReactNode) => {
    const on = id === current
    const count = id === null || counts === null ? undefined : (counts.get(id) ?? 0)
    return (
      <li key={key}>
        <Link
          to={targetOf(id)}
          aria-current={on ? ariaCurrent : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            'flex min-h-6 items-start gap-2 rounded-sm border-l-4 py-1 pr-2 pl-2 text-sm hover:bg-muted',
            on ? 'border-foreground bg-muted font-semibold' : 'border-transparent',
          )}
        >
          <span className="min-w-0 flex-1 break-words">{label}</span>
          {count !== undefined && (
            <>
              <span className="sr-only">{tm.countUnit[context]}</span>
              <span className={cn('shrink-0 tabular-nums', count === 0 && 'text-muted-foreground')}>{count}</span>
            </>
          )}
        </Link>
      </li>
    )
  }

  const group = (g: SideMenuGroup): ReactNode => (
    <li key={g.key}>
      <Collapsible open={!closed.has(g.key)} onOpenChange={(on) => setGroupOpen(g.key, on)}>
        <CollapsibleTrigger className="group flex min-h-6 w-full items-start gap-1 rounded-sm py-1 pr-2 text-left text-sm font-medium hover:bg-muted">
          <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
          <span className="min-w-0 flex-1 break-words">{g.label ?? tm.roots[g.root]}</span>
          <span className="sr-only">{tm.groupUnit}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{g.stakeholderCount}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* 0.75rem per step, so a 5-level path fits at 360 px. */}
          <ul className="pl-3">
            {g.stakeholders.map((s) =>
              item(s.id, s.id, (
                <>
                  <span className="font-mono">{s.id}</span>{' '}
                  {s.name}
                </>
              )),
            )}
            {g.children.map(group)}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group flex min-h-6 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted lg:hidden">
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
        <span className="min-w-0 break-words">{tm.trigger(picked === null ? null : tm.item(picked.id, picked.name))}</span>
      </CollapsibleTrigger>
      {/* forceMount: from lg the side bar is always shown, also when closed. */}
      <CollapsibleContent forceMount className="mt-2 space-y-4 data-[state=closed]:hidden lg:mt-0 lg:data-[state=closed]:block">
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
          {filters.showCrossIssue && (
            <Toggle
              variant="outline"
              size="sm"
              pressed={pageFilters.crossIssueOnly}
              onPressedChange={(on) => setUrl((prev) => withCrossIssueFilter(prev, on))}
              className={cn(toggleOnClass, 'w-full justify-start')}
            >
              <ToggleCheck />
              {tm.crossIssueOnly}
            </Toggle>
          )}
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

        <nav aria-label={tm.navLabels[mode]}>
          <ul className="mb-1">{item('all', null, tm.all)}</ul>
          <ul>{tree.map(group)}</ul>
        </nav>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** The layout of a page with the side menu (design 3.21). From lg: the menu
 * in a left column (16rem, 18rem from xl), sticky at the top, with its own
 * scroll when it is taller than the window. The main block is on the right.
 * Below lg: the menu above the main block. The menu comes first in the
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
    <div className={cn('lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8', className)}>
      {/* The grid item itself is sticky. Its parent (the grid) is as tall as
          the content, so it can stay at the top while the page scrolls. */}
      <div className="mb-4 lg:sticky lg:top-4 lg:mb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:p-1">
        <MainIdContext.Provider value={mainId}>{menu}</MainIdContext.Provider>
      </div>
      <div id={mainId} tabIndex={-1} className="min-w-0 focus:outline-none">{children}</div>
    </div>
  )
}
