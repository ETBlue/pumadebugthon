import { stripMarkdown } from '@/lib/markdown'
import type { PickItem } from '@/lib/opinion'
import { TagBadge } from './TagBadge'

/** The label of a pick item (a 訴求) with its tag. A 【待補】 label has no tag.
 * The 需求 list passes the 以便… cell of a story in the same shape. */
export function PickLabel({ item }: { item: Pick<PickItem, 'label' | 'tag' | 'pending'> }) {
  if (item.pending) return <span className="text-muted-foreground">{stripMarkdown(item.label)}</span>
  return (
    <>
      {item.tag && <TagBadge kind={item.tag} className="mr-1.5" />}
      {stripMarkdown(item.label)}
    </>
  )
}
