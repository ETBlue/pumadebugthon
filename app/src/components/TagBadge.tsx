import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n/zh-TW'
import type { PriorityTag } from '@/types'

export type TagKind = PriorityTag | 'pending'

// Each tag has its own style, and the text is always shown (design 3.5).
// The colors are tokens in index.css (design 3.10), AA in both themes.
const styles: Record<TagKind, string> = {
  實證: 'border-tag-evidence text-tag-evidence',
  AI整理: 'border-tag-summary text-tag-summary',
  AI模擬: 'border-tag-simulated text-tag-simulated',
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
