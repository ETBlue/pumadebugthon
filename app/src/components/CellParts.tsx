import { t } from '@/i18n/zh-TW'
import { dataBasedParts } from '@/lib/dataBasis'
import type { Cell } from '@/types'
import { CellText } from './CellText'

/** A cell of a step 7 table (design decision 101): its parts in file order.
 * Each part shows its own tag badge and text, the same way CellText shows a
 * cell with one tag. A cell with one part looks the same as CellText.
 * With dataBasedOnly (the 「只看有資料根據」 filter, decision 105), the
 * [AI模擬] parts are hidden and the [實證], [AI整理] and 【待補】 parts stay.
 * When every part is hidden, a short gray note says so. */
export function CellParts({ parts, dataBasedOnly = false }: { parts: Cell[]; dataBasedOnly?: boolean }) {
  const shown = dataBasedParts(parts, dataBasedOnly)
  if (shown.length === 0) {
    return <span className="text-muted-foreground">{t.solutionPage.detailFilteredNone}</span>
  }
  return (
    <span>
      {shown.map((part, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <CellText cell={part} />
        </span>
      ))}
    </span>
  )
}
