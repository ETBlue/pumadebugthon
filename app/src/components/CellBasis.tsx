import { t } from '@/i18n/zh-TW'
import { basisBar, basisTextParts, basisTotal, evidencePercent, type BasisKey } from '@/lib/cellBasis'
import type { CellCounts } from '@/types'

const tb = t.basis

// The same tag colors as TagBadge (design 3.5). The tokens pass AA on the page
// backgrounds in both themes (index.css), so each segment is visible.
const barColor: Record<BasisKey, string> = {
  evidence: 'bg-tag-evidence',
  aiSummary: 'bg-tag-summary',
  aiSimulated: 'bg-tag-simulated',
  pending: 'bg-muted-foreground',
}
const textColor: Record<BasisKey, string> = {
  evidence: 'text-tag-evidence',
  aiSummary: 'text-tag-summary',
  aiSimulated: 'text-tag-simulated',
  pending: 'text-muted-foreground',
}

/** 資料根據 of one issue (design 3.2, 3.9): the counts as text, the 實證
 * share, and a small stacked bar. The text carries the meaning; the bar is
 * hidden from screen readers. */
export function CellBasis({ cells, stories }: { cells: CellCounts; stories: number }) {
  const percent = evidencePercent(cells)
  const bar = basisBar(cells)
  return (
    <div className="min-w-0">
      <p>
        {basisTextParts(cells).map((p, i) => (
          <span key={p.key}>
            {i > 0 && tb.separator}
            <span className={textColor[p.key]}>{tb.parts[p.key]}</span> {p.count}
          </span>
        ))}
        <span>{tb.totals(basisTotal(cells), stories)}</span>
        {percent !== null && <span className="ml-2 font-medium whitespace-nowrap">{tb.evidencePercent(percent)}</span>}
      </p>
      {bar.length > 0 && (
        // gap-px shows a thin line of the background between the segments.
        // Each segment grows by its share of the space left after the gaps,
        // so no segment is cut off. min-w keeps a 1-cell segment visible.
        <div aria-hidden="true" className="mt-1.5 flex h-2 w-full max-w-xs gap-px overflow-hidden rounded-sm">
          {bar.map((s) => (
            <div key={s.key} className={`min-w-0.5 ${barColor[s.key]}`} style={{ flex: `${s.width} 1 0` }} />
          ))}
        </div>
      )}
    </div>
  )
}
