import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n/zh-TW'
import type { PriorityTag } from '@/types'

export type TagKind = PriorityTag | 'pending'

// Each tag has its own style, and the text is always shown (design 3.5).
const styles: Record<TagKind, string> = {
  實證: 'border-green-700 text-green-800 dark:border-green-400 dark:text-green-300',
  AI整理: 'border-blue-700 text-blue-800 dark:border-blue-400 dark:text-blue-300',
  AI模擬: 'border-amber-700 text-amber-900 dark:border-amber-400 dark:text-amber-200',
  pending: 'border-dashed border-muted-foreground text-muted-foreground',
}

/** A text badge for [實證], [AI整理], [AI模擬] or 【待補】. */
export function TagBadge({ kind, className }: { kind: TagKind; className?: string }) {
  return (
    <Badge variant="outline" className={cn('rounded-sm bg-transparent align-middle', styles[kind], className)}>
      {t.tags[kind]}
    </Badge>
  )
}
