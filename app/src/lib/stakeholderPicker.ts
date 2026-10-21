// The stakeholder picker of the list pages (design 3.23.7, decision 86): a
// search box with a list (the ARIA 1.2 combobox pattern). The options are
// in two groups, 組織 and 個人, each in ID order. Never sorted by a count.
import type { Stakeholder } from '@/types'
import { compareIds } from './ids'
import { LIST_PARAMS } from './listParams'
import { parseListQuery } from './listSearch'
import { isListed } from './stakeholders'

/** One group of options: 組織 (O) or 個人 (I). */
export interface PickerGroup {
  root: 'O' | 'I'
  /** The matching stakeholders, in ID order. */
  options: Stakeholder[]
}

/** The options for the typed text. A stakeholder matches when the text is
 * in its ID (any case; spaces, 「#」 and 「-」 are ignored) or in its name.
 * Full-width letters and digits count as half-width ones (NFKC, as the list
 * search). An empty text gives every listed stakeholder (isListed). The
 * groups are 組織 then 個人. A group with no option is left out. */
export function pickerOptions(stakeholders: Stakeholder[], query: string): PickerGroup[] {
  const q = parseListQuery(query)
  const matches = (s: Stakeholder) =>
    q === null || s.id.toLowerCase().includes(q.key) || s.name.normalize('NFKC').toLowerCase().includes(q.text)
  const listed = stakeholders.filter((s) => isListed(s) && matches(s)).sort((a, b) => compareIds(a.id, b.id))
  const groups: PickerGroup[] = []
  for (const root of ['O', 'I'] as const) {
    const options = listed.filter((s) => (s.id.startsWith('O') ? root === 'O' : root === 'I'))
    if (options.length > 0) groups.push({ root, options })
  }
  return groups
}

/** The option IDs in the order of the list (組織 first). */
export function pickerOptionIds(groups: PickerGroup[]): string[] {
  return groups.flatMap((g) => g.options.map((s) => s.id))
}

/** The state of the box. */
export interface PickerState {
  /** The list is shown. */
  open: boolean
  /** The ID of the active option (aria-activedescendant), or null. */
  active: string | null
  /** The typed text. */
  text: string
}

export const CLOSED_PICKER: PickerState = { open: false, active: null, text: '' }

export type PickerKey = 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Escape' | 'Tab'

/** The keys pickerKey handles. Other keys go to the input as usual. */
export const PICKER_KEYS: readonly string[] = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab']

/** The result of one key: the next state, and the ID picked by this key
 * (Enter on an active option), or null. */
export interface PickerStep {
  state: PickerState
  pick: string | null
}

/** The next state after a key (design 3.23.7). options: the option IDs that
 * are shown now (pickerOptionIds).
 * - Down: opens the list on the first option, or moves to the next one.
 * - Up: opens the list on the last option, or moves to the one before.
 *   Both wrap at the ends.
 * - Enter: picks the active option and closes the list.
 * - Escape: closes the list. On a closed list it clears the text.
 * - Tab: closes the list with no pick. */
export function pickerKey(state: PickerState, key: PickerKey, options: string[]): PickerStep {
  const closed = { ...state, open: false, active: null }
  const at = state.active === null ? -1 : options.indexOf(state.active)
  const n = options.length
  switch (key) {
    case 'ArrowDown': {
      const next = !state.open || at === -1 ? 0 : (at + 1) % Math.max(n, 1)
      return { state: { ...state, open: true, active: options[next] ?? null }, pick: null }
    }
    case 'ArrowUp': {
      const next = !state.open || at === -1 ? n - 1 : (at - 1 + n) % Math.max(n, 1)
      return { state: { ...state, open: true, active: options[next] ?? null }, pick: null }
    }
    case 'Enter':
      if (!state.open || at === -1) return { state, pick: null }
      return { state: closed, pick: options[at] }
    case 'Escape':
      return { state: state.open ? closed : { ...closed, text: '' }, pick: null }
    case 'Tab':
      return { state: closed, pick: null }
  }
}

/** The search string with who=<id> (null removes who). Every other param is
 * kept, as the side menu links do (decision 47). */
export function whoSearch(params: URLSearchParams, id: string | null): string {
  const next = new URLSearchParams(params)
  if (id === null) next.delete(LIST_PARAMS.who)
  else next.set(LIST_PARAMS.who, id)
  const s = next.toString()
  return s ? `?${s}` : ''
}
