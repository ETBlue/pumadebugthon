import { t } from '@/i18n/zh-TW'
import type { CellCounts } from '@/types'
import { CellBasis } from './CellBasis'
import { Field } from './Field'

/** 資料根據 on a compact card, inside a <dl> (decisions 107 and 112): the
 * counts and the bar, as on the compact IssueCard. No share: a compact card
 * never ranks by a count (decision 81). cells is null while the issue files
 * load (or when they fail): then an invisible row of the same height keeps
 * the place, so the card does not grow when the data comes. label: the
 * field name, 「資料根據」 by default. */
export function BasisField({ cells, label = t.basis.label }: { cells: CellCounts | null; label?: string }) {
  if (cells === null) {
    return (
      <div aria-hidden="true" className="invisible flex flex-wrap gap-x-2">
        <dt>{label}</dt>
        <dd><p>&nbsp;</p><div className="mt-1.5 h-2" /></dd>
      </div>
    )
  }
  return (
    <Field label={label}>
      <CellBasis cells={cells} stories={0} compact inlineLabel={false} />
    </Field>
  )
}
