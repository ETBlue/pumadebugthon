import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, type To } from 'react-router'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { t } from '@/i18n/zh-TW'
import { groupKeysAbove, type SideMenuGroup } from '@/lib/sideMenu'
import { cn } from '@/lib/utils'
import type { Stakeholder } from '@/types'

const tm = t.sideMenu

export interface StakeholderTreeProps {
  /** The tree from sideMenuTree. */
  tree: SideMenuGroup[]
  /** The link target of a stakeholder. null is 「全部利害關係人」. */
  targetOf: (id: string | null) => To
  /** Show 「全部利害關係人」 as the first item, with no count. Default true. */
  showAll?: boolean
  /** The current stakeholder, or null when 「全部利害關係人」 is current. The
   * current item is bold, has a bar on the left, and has aria-current. */
  current: string | null
  /** The aria-current value of the current item: 'true' for a filter,
   * 'page' for a link to the page the reader is on. */
  ariaCurrent: 'true' | 'page'
  /** The count next to each stakeholder (decision 66), or null for no counts. */
  counts?: Map<string, number> | null
  /** Hidden text before a count, for screen readers (「，訴求 」). */
  countUnit?: string
  /** Called after a click on any item, for example to close a dialog. */
  onPick?: () => void
  /** Open every group (for the search in the tree view, design 3.23.13 S6).
   * While it is true, every group opens again each time the tree changes,
   * so every match is shown. The group buttons still work. */
  forceOpen?: boolean
  /** Extra content after the ID and the name of a stakeholder, for example
   * the 特別關注 badges in the tree view of #/stakeholders (design 3.23.11). */
  extraOf?: (stakeholder: Stakeholder) => ReactNode
  /** Show each root (組織, 個人) as an h2 with its button inside, and the
   * roots side by side from md (the tree view of #/stakeholders, design
   * 3.23.11). Default false: the roots are items of one list, as in the side
   * menu. */
  rootHeadings?: boolean
}

/** The stakeholder tree of the side menu (design 3.21) as nested lists: a
 * button per group (Collapsible, aria-expanded) and a link per stakeholder.
 * It does not use the ARIA tree role. Every group is open at the start. The
 * groups above the current item open again when the current item changes.
 * It renders the lists only. Put it in a <nav> with a name. Used by the side
 * menu and by the 「瀏覽」 dialog of the stakeholder picker (3.23.7). */
export function StakeholderTree({
  tree, targetOf, showAll = true, current, ariaCurrent, counts = null, countUnit = '', onPick, forceOpen = false, extraOf,
  rootHeadings = false,
}: StakeholderTreeProps) {
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
  // With forceOpen, open every group when forceOpen turns on and when the
  // tree changes (a new search result).
  const [seenForced, setSeenForced] = useState<SideMenuGroup[] | null>(forceOpen ? tree : null)
  const forcedKey = forceOpen ? tree : null
  if (seenForced !== forcedKey) {
    setSeenForced(forcedKey)
    if (forceOpen && closed.size > 0) setClosed(new Set())
  }
  const setGroupOpen = (key: string, on: boolean) => {
    const next = new Set(closed)
    if (on) next.delete(key)
    else next.add(key)
    setClosed(next)
  }

  const item = (key: string, id: string | null, label: ReactNode) => {
    const on = id === current
    const count = id === null || counts === null ? undefined : (counts.get(id) ?? 0)
    return (
      <li key={key}>
        <Link
          to={targetOf(id)}
          aria-current={on ? ariaCurrent : undefined}
          onClick={onPick}
          className={cn(
            'flex min-h-6 items-start gap-2 rounded-sm border-l-4 py-1 pr-2 pl-2 text-sm hover:bg-muted',
            on ? 'border-foreground bg-muted font-semibold' : 'border-transparent',
          )}
        >
          <span className="min-w-0 flex-1 break-words">{label}</span>
          {count !== undefined && (
            <>
              <span className="sr-only">{countUnit}</span>
              <span className={cn('shrink-0 tabular-nums', count === 0 && 'text-muted-foreground')}>{count}</span>
            </>
          )}
        </Link>
      </li>
    )
  }

  // The button of a group: the name and the number of stakeholders under it.
  const trigger = (g: SideMenuGroup, className: string) => (
    <CollapsibleTrigger className={cn('group flex min-h-6 w-full items-start gap-1 rounded-sm py-1 pr-2 text-left hover:bg-muted', className)}>
      <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
      <span className="min-w-0 flex-1 break-words">{g.label ?? tm.roots[g.root]}</span>
      <span className="sr-only">{tm.groupUnit}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">{g.stakeholderCount}</span>
    </CollapsibleTrigger>
  )

  // What is inside a group: its stakeholders, then its child levels.
  const content = (g: SideMenuGroup) => (
    <CollapsibleContent>
      {/* 0.75rem per step, so a 5-level path fits at 360 px. */}
      <ul className="pl-3">
        {g.stakeholders.map((s) =>
          item(s.id, s.id, (
            <>
              <span className="font-mono">{s.id}</span>{' '}
              {s.name}
              {extraOf?.(s)}
            </>
          )),
        )}
        {g.children.map(group)}
      </ul>
    </CollapsibleContent>
  )

  const group = (g: SideMenuGroup): ReactNode => (
    <li key={g.key}>
      <Collapsible open={!closed.has(g.key)} onOpenChange={(on) => setGroupOpen(g.key, on)}>
        {trigger(g, 'text-sm font-medium')}
        {content(g)}
      </Collapsible>
    </li>
  )

  if (rootHeadings) {
    return (
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {tree.map((g) => (
          <Collapsible key={g.key} open={!closed.has(g.key)} onOpenChange={(on) => setGroupOpen(g.key, on)} className="min-w-0">
            <h2 className="text-lg font-bold">{trigger(g, 'font-bold')}</h2>
            {content(g)}
          </Collapsible>
        ))}
      </div>
    )
  }

  return (
    <>
      {showAll && <ul className="mb-1">{item('all', null, tm.all)}</ul>}
      <ul>{tree.map(group)}</ul>
    </>
  )
}
