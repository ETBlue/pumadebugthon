import { t } from '@/i18n/zh-TW'
import { priorityLabel, type TagPriorityCounts } from '@/lib/priority'
import { TagBadge } from './TagBadge'

/** The MoSCoW legend (design 3.4). Show it once per page, next to the first counts. */
export function PriorityLegend() {
  return <p className="text-sm text-muted-foreground">{t.priorityCounts.legend}</p>
}

/** Priority counts of one stakeholder in one issue, one part per tag, for
 * example 「[AI模擬] 必須有 1 · 應該有 1」. counts comes from priorityCounts(),
 * so the order is M, S, C, W and zero values are already left out. */
export function PriorityCounts({ counts, showLegend = false }: { counts: TagPriorityCounts[]; showLegend?: boolean }) {
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
        {counts.length === 0 && <span className="text-muted-foreground">{t.priorityCounts.noStories}</span>}
        {counts.map(({ tag, counts: list }) => (
          <span key={tag} className="inline-flex flex-wrap items-center gap-1.5">
            <TagBadge kind={tag} />
            <span>{list.map((c) => `${priorityLabel(c.priority)} ${c.n}`).join(t.priorityCounts.separator)}</span>
          </span>
        ))}
      </span>
      {showLegend && <PriorityLegend />}
    </span>
  )
}
