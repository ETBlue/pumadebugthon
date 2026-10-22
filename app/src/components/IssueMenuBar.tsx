import { useId, type ReactNode } from 'react'
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
