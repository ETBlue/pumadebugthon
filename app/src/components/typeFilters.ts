// The type filters of #/needs, #/issues and #/solutions: 空間類型, 領域 and
// 解法類型 (design 3.23.5, Task U5). One helper builds the bar control and
// one the result line part, for every kind, so the filters work the same way.
// 空間類型 and 領域 show their options under the group headings, and a
// heading picks the whole group (decision 225). 解法類型 has no groups.
import { t } from '@/i18n/zh-TW'
import { TYPE_FILTER_FIELDS } from '@/lib/listFilter'
import type { ListState } from '@/lib/listParams'
import { findType, type TypeKind } from '@/lib/typeKinds'
import type { IndexFile } from '@/types'
import type { ListBarChoice, ListBarChoiceGroup, ListBarFilter } from './ListBar'

/** The groups of a kind, in file order: spaceGroups or domainGroups. An
 * empty list for 解法類型, which has one level. */
function groupsOf(kind: TypeKind, index: IndexFile): { code: string; name: string }[] {
  if (kind === 'space') return index.spaceGroups ?? []
  if (kind === 'domain') return index.domainGroups ?? []
  return []
}

/** The group code of a type (its 上層), or null when the type has no
 * known group. */
function groupOf(kind: TypeKind, index: IndexFile, code: string): string | null {
  if (kind === 'solutionType') return null
  const parent = findType(kind, index, code)?.parent
  if (!parent) return null
  return groupsOf(kind, index).some((g) => g.code === parent) ? parent : null
}

/** The bar control of a type filter: a choices filter with the options in
 * the order given (file order, level 2 only). For 空間類型 and 領域 each
 * option has its group, and the filter lists the groups that have a shown
 * option, in file order (decision 225). null when there is no option, so
 * the bar leaves the filter out. */
export function typeChoiceFilter(
  kind: TypeKind,
  label: string,
  options: { code: string; name: string }[],
  state: ListState,
  index: IndexFile,
): ListBarFilter | null {
  if (options.length === 0) return null
  const field = TYPE_FILTER_FIELDS[kind]
  const choices: ListBarChoice[] = options.map((o) => {
    const group = groupOf(kind, index, o.code)
    return group === null ? { value: o.code, label: o.name } : { value: o.code, label: o.name, group }
  })
  const used = new Set(choices.map((c) => c.group))
  const groups: ListBarChoiceGroup[] = groupsOf(kind, index)
    .filter((g) => used.has(g.code))
    .map((g) => ({ value: g.code, label: g.name }))
  return {
    kind: 'choices',
    key: field,
    label,
    options: choices,
    ...(groups.length > 0 ? { groups } : {}),
    value: state[field],
    next: (codes) => ({ ...state, [field]: codes }),
  }
}

/** The result line part of a type filter: 「領域：行政、環境保護」, in the
 * order of the state (file order). null when the filter is off.
 *
 * options: the options the filter shows (the same list as for
 * typeChoiceFilter). When every shown option of a group is picked, and the
 * group has two or more shown options, the part shows the group name in
 * place of its type names, at the place of its first type: 「空間類型：道路、
 * 公園綠地」 (decision 225). A group with one shown option keeps the type
 * name, because the type name says more. */
export function typeFilterPart(
  kind: TypeKind,
  label: string,
  index: IndexFile,
  state: ListState,
  options: { code: string }[] = [],
): string | null {
  const codes = state[TYPE_FILTER_FIELDS[kind]]
  if (codes.length === 0) return null
  const picked = new Set(codes)
  // The shown options of each group.
  const shown = new Map<string, string[]>()
  for (const o of options) {
    const g = groupOf(kind, index, o.code)
    if (g !== null) shown.set(g, [...(shown.get(g) ?? []), o.code])
  }
  const whole = new Set(
    [...shown].filter(([, list]) => list.length >= 2 && list.every((c) => picked.has(c))).map(([g]) => g),
  )
  const names = new Map(groupsOf(kind, index).map((g) => [g.code, g.name]))
  const values: string[] = []
  const done = new Set<string>()
  for (const c of codes) {
    const g = groupOf(kind, index, c)
    if (g !== null && whole.has(g)) {
      if (!done.has(g)) values.push(names.get(g) ?? g)
      done.add(g)
    } else {
      values.push(findType(kind, index, c)?.name ?? c)
    }
  }
  return t.listBar.filterPart(label, values)
}
