import { cn } from '@/lib/utils'
import type { Cell } from '@/types'
import { Markdown } from './Markdown'
import { TagBadge } from './TagBadge'

/** A table cell: the tag badge, then the text. A 【待補】 cell has no tag; its
 * text (which starts with 【待補) is shown in a dashed gray box. */
export function CellText({ cell, className }: { cell: Cell; className?: string }) {
  if (cell.pending) {
    return (
      <span className={cn('rounded-sm border border-dashed border-muted-foreground px-1 text-muted-foreground', className)}>
        <Markdown text={cell.text} />
      </span>
    )
  }
  return (
    <span className={className}>
      {cell.tag && <TagBadge kind={cell.tag} className="mr-1.5" />}
      <Markdown text={cell.text} />
    </span>
  )
}
