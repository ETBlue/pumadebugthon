// The type filters of #/issues and #/solutions: 空間類型, 領域 and 解法類型
// (design 3.23.5, Task U5). One helper builds the bar control and one the
// result line part, for every kind, so the three filters work the same way.
import { t } from '@/i18n/zh-TW'
import { TYPE_FILTER_FIELDS } from '@/lib/listFilter'
import type { ListState } from '@/lib/listParams'
import { findType, type TypeKind } from '@/lib/typeKinds'
import type { IndexFile } from '@/types'
import type { ListBarFilter } from './ListBar'

/** The bar control of a type filter: a choices filter with the options in
 * the order given (file order, level 2 only). null when there is no option,
 * so the bar leaves the filter out. */
export function typeChoiceFilter(
  kind: TypeKind,
  label: string,
  options: { code: string; name: string }[],
  state: ListState,
): ListBarFilter | null {
  if (options.length === 0) return null
  const field = TYPE_FILTER_FIELDS[kind]
  return {
    kind: 'choices',
    key: field,
    label,
    options: options.map((o) => ({ value: o.code, label: o.name })),
    value: state[field],
    next: (codes) => ({ ...state, [field]: codes }),
  }
}

/** The result line part of a type filter: 「領域：行政、環境保護」, in the
 * order of the state (file order). null when the filter is off. */
export function typeFilterPart(kind: TypeKind, label: string, index: IndexFile, state: ListState): string | null {
  const codes = state[TYPE_FILTER_FIELDS[kind]]
  if (codes.length === 0) return null
  return t.listBar.filterPart(label, codes.map((c) => findType(kind, index, c)?.name ?? c))
}
