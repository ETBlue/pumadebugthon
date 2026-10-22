import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The menu bar of an issue tab with filters (design 3.2, decisions 115 and
 * 116). Every tab of the issue page with a filter has one, at the top of
 * the tab content: 利害關係人, 訴求, 需求, 解法 and the four 分析摘要 tabs.
 * 總覽 has no filter, so it has no bar. The bar is a box in the content
 * column (not a full-width band): `bg-muted`, a border and round corners.
 * Its controls look like the list bar controls (`ListBar`): outline buttons
 * and toggles with `bg-background`. The bar wraps, so a 360 px screen has
 * no sideways scroll. label is the name of the group (aria-label). */
export function IssueMenuBar({ label, className, children }: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="issue-menu-bar"
      className={cn('flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-muted p-3', className)}
    >
      {children}
    </div>
  )
}

/** One group of controls in the menu bar (decision 116), with a visible
 * label before the controls. The controls wrap inside the group. The gap
 * between groups is larger than the gap inside a group, so the groups are
 * easy to see. label null: no label (a group of one control that names
 * itself, for example 「只看有資料根據」). */
export function MenuBarGroup({ label, className, children }: {
  label: string | null
  className?: string
  children: ReactNode
}) {
  const labelId = useId()
  return (
    <div
      role={label === null ? undefined : 'group'}
      aria-labelledby={label === null ? undefined : labelId}
      className={cn('flex min-w-0 max-w-full flex-wrap items-center gap-2', className)}
    >
      {label !== null && <span id={labelId} className="text-sm font-medium">{label}</span>}
      {children}
    </div>
  )
}

/** A box around a joined toggle group (decision 125), for example the
 * 特別關注 toggles. The joined group stays on one row. When the row is wider
 * than the box (4 to 6 toggles on a 360 px phone), the box scrolls sideways
 * inside itself, so the page has no sideways scroll. One row keeps the shared
 * borders and the round outer corners right. A joined group that wraps would
 * have a second row with no left border on its first button. Below md the
 * scrollbar is hidden, like the phone tab list (PHONE_SCROLL_CLASS, decision
 * 102). The padding of 4 px (with the same negative margin) leaves room for
 * the focus ring, so the ring is not cut off. scroll-px-2 makes the box
 * scroll a focused toggle fully into view, with its ring. The group inside
 * is as wide as its toggles (w-max), not as wide as the box (w-fit), so the
 * box can scroll to the end of the last toggle. */
export function JoinedScroll({ children }: { children: ReactNode }) {
  // A toggle that turns on gets its check mark, so it gets wider. When it is
  // the last one, its end can go past the edge of the box. So remember the
  // clicked toggle (a click is also Space or Enter), and scroll it back into
  // view after the next render. The URL update renders later than the click
  // (the router uses a transition), so a scroll in the click handler is too
  // early.
  const clicked = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    const target = clicked.current
    if (target === null) return
    clicked.current = null
    target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  })
  const keepInView = (e: MouseEvent<HTMLDivElement>) => {
    clicked.current = (e.target as HTMLElement).closest('button')
  }
  return (
    <div
      data-slot="joined-scroll"
      onClick={keepInView}
      className="-m-1 min-w-0 max-w-[calc(100%+0.5rem)] overflow-x-auto overflow-y-hidden p-1 scroll-px-2 *:w-max max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  )
}

/** Plain buttons joined into one block (decision 125), with the look of a
 * ToggleGroup with spacing={0} (the view switch of ListBar): the buttons
 * touch, they share one border, and only the outer corners are round. The
 * name is the visible label of the MenuBarGroup around it, so this box has
 * no role of its own. */
export function JoinedButtons({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="joined-buttons"
      className="flex w-fit shrink-0 items-center rounded-md shadow-xs *:rounded-none *:shadow-none *:first:rounded-l-md *:last:rounded-r-md *:not-first:border-l-0 *:focus-visible:z-10"
    >
      {children}
    </div>
  )
}
