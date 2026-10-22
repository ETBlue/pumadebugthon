import type { Cell } from '@/types'
import { CellText } from './CellText'

/** A cell of a step 7 table (design decision 101): its parts in file order.
 * Each part shows its own tag badge and text, the same way CellText shows a
 * cell with one tag. A cell with one part looks the same as CellText.
 * The 「只看有資料根據」 filter does not change the step 7 tables, so every
 * part is shown, also the [AI模擬] parts. */
export function CellParts({ parts }: { parts: Cell[] }) {
  return (
    <span>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <CellText cell={part} />
        </span>
      ))}
    </span>
  )
}
