import { useId, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useLocation, useSearchParams, type To } from 'react-router'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { stakeholderTabPath, type StakeholderTab } from '@/lib/entityPaths'
import { menuGroups, stakeholderMenuSearch } from '@/lib/stakeholderFilter'
import { findStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { Stakeholder } from '@/types'
import { linkClass } from './styles'

const tm = t.stakeholderMenu

interface CommonProps {
  /** The stakeholder IDs in the menu. The menu puts them in two groups (O,
   * I), each in ID order (menuGroups). It shows no counts. */
  ids: string[]
  /** All stakeholders from index.json, for the names. */
  stakeholders: Stakeholder[]
  /** The picked stakeholder. null: 「全部利害關係人」 (filter mode only). */
  current: string | null
}

/** The props of StakeholderMenu (design 3.14).
 * - filter: the issue page. A link sets ?stakeholder=<id> on the same tab.
 *   shown is the text after 「篩選：…。」 in the status line, for example
 *   tm.shownWants(2, 1).
 * - switch: the stakeholder page. A link goes to the same tab of that
 *   stakeholder's page. */
export type StakeholderMenuProps =
  | (CommonProps & { mode: 'filter'; shown?: string })
  | (CommonProps & { mode: 'switch'; tab: StakeholderTab })

/** The stakeholder menu (design 3.14): a list of links, in a <nav>. The
 * current item has aria-current and is bold with a bar on the left. From lg
 * it is always open (put it in the left column of StakeholderMenuLayout).
 * Below lg it is a Collapsible, closed by default. Every link keeps
 * ?evidence=1. */
export function StakeholderMenu(props: StakeholderMenuProps) {
  const { ids, stakeholders, current, mode } = props
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const labelId = useId()
  const groups = menuGroups(ids, stakeholders)
  const picked = current === null ? null : findStakeholder(stakeholders, current)
  const pickedText = picked === null ? null : tm.item(picked.id, picked.name)
  const ariaCurrent = mode === 'filter' ? 'true' : 'page'

  // filter: the same tab with ?stakeholder= (null removes it).
  // switch: the same tab of the other stakeholder's page.
  const targetOf = (id: string | null): To =>
    props.mode === 'switch' && id !== null
      ? { pathname: stakeholderTabPath(id, props.tab), search: dataBasisFilterSearch(params) }
      : { pathname, search: stakeholderMenuSearch(params, id) }

  const item = (key: string, id: string | null, label: ReactNode) => {
    const on = id === current
    return (
      <li key={key}>
        <Link
          to={targetOf(id)}
          aria-current={on ? ariaCurrent : undefined}
          className={cn(
            'block rounded-sm border-l-4 py-1 pr-2 pl-2 text-sm hover:bg-muted',
            on ? 'border-foreground bg-muted font-semibold' : 'border-transparent',
          )}
        >
          {label}
        </Link>
      </li>
    )
  }

  return (
    <div>
      {/* The status region is always there in filter mode, so a screen
          reader reads the new text when the filter changes. */}
      {mode === 'filter' && (
        <p role="status" className={cn('text-sm', picked !== null && 'mb-3')}>
          {picked !== null && (
            <>
              {tm.status(picked.id, picked.name)}
              {props.shown}
              {' '}
              <Link to={targetOf(null)} className={linkClass}>{tm.clear}</Link>
            </>
          )}
        </p>
      )}
      <nav aria-label={mode === 'filter' ? tm.filterLabel : tm.switchLabel}>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted lg:hidden">
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
            <span className="min-w-0 break-words">{tm.trigger(pickedText)}</span>
          </CollapsibleTrigger>
          {/* forceMount: from lg the list is always shown, also when closed. */}
          <CollapsibleContent forceMount className="mt-2 data-[state=closed]:hidden lg:mt-0 lg:data-[state=closed]:block">
            {mode === 'filter' && <ul className="mb-3">{item('all', null, tm.all)}</ul>}
            {groups.map((g) => (
              <div key={g.group} className="mb-3">
                {/* A visible label, not a heading, so the heading order of
                    the page stays the same. */}
                <p id={`${labelId}-${g.group}`} className="mb-1 text-sm font-medium text-muted-foreground">
                  {tm.groups[g.group]}
                </p>
                <ul aria-labelledby={`${labelId}-${g.group}`}>
                  {g.items.map((s) =>
                    item(s.id, s.id, (
                      <>
                        <span className="font-mono">{s.id}</span>{' '}
                        {s.name}
                      </>
                    )),
                  )}
                </ul>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </nav>
    </div>
  )
}

/** The layout of a page with the stakeholder menu (design 3.14). From lg: the
 * menu in a 16rem left column, sticky at the top, with its own scroll when it
 * is taller than the window. The content is on the right. Below lg: the menu
 * above the content. The menu comes first in the keyboard order. menu null:
 * the content only, full width (for example the 總覽 tab of the issue page). */
export function StakeholderMenuLayout({ menu, className, children }: {
  menu: ReactNode | null
  className?: string
  children: ReactNode
}) {
  if (menu === null) return <div className={className}>{children}</div>
  return (
    <div className={cn('lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8', className)}>
      {/* The grid item itself is sticky. Its parent (the grid) is as tall as
          the content, so it can stay at the top while the page scrolls. */}
      <div className="mb-4 lg:sticky lg:top-4 lg:mb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:p-1">{menu}</div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
