// The URL params of the three list pages (design 3.23.5 and 3.23.13,
// decisions 85, 91 and 97). Every sort, filter and search is in the URL.
// The names do not reuse stakeholder, evidence, cross, special, focus, pick
// or from, because those mean other things on other pages (3.19).
import type { IndexFile } from '@/types'
import { NO_FILTERS, type ListFilters } from './listFilter'
import type { ListSort } from './listSort'
import { isListed, resolveId } from './stakeholders'

export type ListPage = 'issues' | 'stakeholders' | 'solutions'

/** The param names, in the order listUrlSearch writes them. */
export const LIST_PARAMS = {
  q: 'q',
  sort: 'sort',
  issue: 'issue',
  space: 'space',
  who: 'who',
  specialOnly: 'specialonly',
  view: 'view',
} as const

/** The value of issue= for 「跨議題」 (and 「跨議題解法」). */
export const CROSS_ISSUE_VALUE = 'X'

/** The longest search text in the URL, in characters. */
export const Q_MAX_LENGTH = 100

/** The sorts of each page (design 3.23.3). The first one is the default. */
export const PAGE_SORTS: Record<ListPage, readonly ListSort[]> = {
  issues: ['updated', 'added', 'evidence'],
  stakeholders: ['updated', 'added', 'evidence', 'solutions'],
  solutions: ['updated', 'added', 'evidence'],
}

/** The params each page reads. Any other list param is dropped. */
const PAGE_PARAMS: Record<ListPage, readonly string[]> = {
  issues: [LIST_PARAMS.q, LIST_PARAMS.sort, LIST_PARAMS.space, LIST_PARAMS.who],
  stakeholders: [LIST_PARAMS.q, LIST_PARAMS.sort, LIST_PARAMS.issue, LIST_PARAMS.specialOnly, LIST_PARAMS.view],
  solutions: [LIST_PARAMS.q, LIST_PARAMS.sort, LIST_PARAMS.issue, LIST_PARAMS.space, LIST_PARAMS.who],
}

/** The whole state of a list page. */
export interface ListState extends ListFilters {
  sort: ListSort
  /** The view of #/stakeholders (view=tree). 'cards' on the other pages. */
  view: 'cards' | 'tree'
  /** The search text (q=), trimmed and at most 100 characters. null: no search. */
  q: string | null
}

export const DEFAULT_LIST_STATE: ListState = { ...NO_FILTERS, sort: 'updated', view: 'cards', q: null }

export interface ListParams extends ListState {
  /** true when the URL had a value that was dropped or changed. The page
   * then replaces the URL with listUrlSearch(page, state) (history
   * replace, so the back button does not loop). */
  replace: boolean
}

/** The search text from the URL: trimmed, cut at 100 characters (not in
 * the middle of a character), null when empty. */
function cleanQuery(value: string | null): string | null {
  if (value === null) return null
  const text = [...value.trim()].slice(0, Q_MAX_LENGTH).join('')
  return text === '' ? null : text
}

/** Only the list params of params, in their order. To compare with the
 * cleaned search. */
function listOnlySearch(params: URLSearchParams): string {
  const names: readonly string[] = Object.values(LIST_PARAMS)
  const out = new URLSearchParams()
  for (const [key, value] of params) if (names.includes(key)) out.append(key, value)
  const s = out.toString()
  return s ? `?${s}` : ''
}

/** The state of a list page from its URL params. Unknown values are dropped:
 * a sort the page does not have (also the old sort=id, Q24), an issue with
 * no analysis, a space code that is not used, an unknown or unlisted
 * stakeholder, and every param the page does not have. A moved ID in who
 * becomes the new ID. spaceCodes: the space codes the page offers; by
 * default the ones the analyzed issues use (index.json). */
export function listParamsOf(
  page: ListPage,
  params: URLSearchParams,
  index: IndexFile,
  spaceCodes: readonly string[] = index.issues.flatMap((i) => i.spaces),
): ListParams {
  const has = (name: string) => PAGE_PARAMS[page].includes(name)
  const state: ListState = { ...DEFAULT_LIST_STATE, issues: [], spaces: [] }

  const sort = params.get(LIST_PARAMS.sort)
  if (has(LIST_PARAMS.sort) && sort !== null && (PAGE_SORTS[page] as readonly string[]).includes(sort)) {
    state.sort = sort as ListSort
  }

  if (has(LIST_PARAMS.issue)) {
    const values = params.getAll(LIST_PARAMS.issue)
    const analyzed = index.issues.filter((i) => i.available).map((i) => i.number)
    state.crossChoice = values.includes(CROSS_ISSUE_VALUE)
    state.issues = analyzed.filter((n) => values.some((v) => /^\d+$/.test(v) && Number(v) === n))
  }

  if (has(LIST_PARAMS.space)) {
    const values = params.getAll(LIST_PARAMS.space)
    state.spaces = index.spaceTypes.map((s) => s.code).filter((c) => values.includes(c) && spaceCodes.includes(c))
  }

  const who = params.get(LIST_PARAMS.who)
  if (has(LIST_PARAMS.who) && who !== null) {
    const id = resolveId(index.stakeholders, who)
    const found = id === null ? undefined : index.stakeholders.find((s) => s.id === id)
    state.who = found && isListed(found) ? found.id : null
  }

  if (has(LIST_PARAMS.specialOnly)) state.specialOnly = params.get(LIST_PARAMS.specialOnly) === '1'
  if (has(LIST_PARAMS.view)) state.view = params.get(LIST_PARAMS.view) === 'tree' ? 'tree' : 'cards'
  state.q = cleanQuery(params.get(LIST_PARAMS.q))

  return { ...state, replace: listUrlSearch(page, state) !== listOnlySearch(params) }
}

/** The URL search string for a list page state ("?q=…&sort=…", or "" for
 * the default state). Only the params the page has, in a fixed order. No
 * sort param for 最近更新. 「跨議題」 comes before the issue numbers. */
export function listUrlSearch(page: ListPage, state: ListState): string {
  const has = (name: string) => PAGE_PARAMS[page].includes(name)
  const out = new URLSearchParams()
  if (state.q !== null && state.q !== '') out.set(LIST_PARAMS.q, state.q)
  if (state.sort !== 'updated' && (PAGE_SORTS[page] as readonly string[]).includes(state.sort)) {
    out.set(LIST_PARAMS.sort, state.sort)
  }
  if (has(LIST_PARAMS.issue)) {
    if (state.crossChoice) out.append(LIST_PARAMS.issue, CROSS_ISSUE_VALUE)
    for (const n of [...state.issues].sort((a, b) => a - b)) out.append(LIST_PARAMS.issue, String(n))
  }
  if (has(LIST_PARAMS.space)) for (const c of state.spaces) out.append(LIST_PARAMS.space, c)
  if (has(LIST_PARAMS.who) && state.who !== null) out.set(LIST_PARAMS.who, state.who)
  if (has(LIST_PARAMS.specialOnly) && state.specialOnly) out.set(LIST_PARAMS.specialOnly, '1')
  if (has(LIST_PARAMS.view) && state.view === 'tree') out.set(LIST_PARAMS.view, 'tree')
  const s = out.toString()
  return s ? `?${s}` : ''
}

/** The path of a list page with this state, for links
 * ("/stakeholders?sort=added"). The state parts not given are the default. */
export function listPath(page: ListPage, state: Partial<ListState> = {}): string {
  return `/${page}${listUrlSearch(page, { ...DEFAULT_LIST_STATE, ...state })}`
}

/** The 「看全部」 links of the home blocks (design 3.23.12, decision 91).
 * Each list has the sort of its block, so its first 5 cards are the 5 items
 * of the block. 最近更新 is the default sort, so #/issues has no param. */
export const HOME_ALL_PATHS: Record<ListPage, string> = {
  issues: listPath('issues'),
  stakeholders: listPath('stakeholders', { sort: 'added' }),
  solutions: listPath('solutions', { sort: 'added' }),
}

/** The stakeholders in 2 or more issues: #/stakeholders?issue=X (decision 91). */
export const CROSS_STAKEHOLDERS_PATH = listPath('stakeholders', { crossChoice: true })

/** The search string of 「清除篩選」: every filter and q are removed. sort,
 * view and any other param are kept. "" when nothing is left. */
export function clearListFilters(params: URLSearchParams): string {
  const next = new URLSearchParams(params)
  for (const name of [LIST_PARAMS.q, LIST_PARAMS.issue, LIST_PARAMS.space, LIST_PARAMS.who, LIST_PARAMS.specialOnly]) {
    next.delete(name)
  }
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** Old links to the list pages (decisions 91 and 100). On every list page
 * the old evidence param is dropped: the list pages have no data filter.
 * On #/stakeholders, cross=1 also becomes issue=X and special=<group>
 * becomes specialonly=1. Other params are kept. Returns the new search
 * string ("" when nothing is left), or null when there is nothing to
 * change. The page redirects with replace. */
export function legacyListRedirect(page: ListPage, search: string): string | null {
  const params = new URLSearchParams(search)
  if (page !== 'stakeholders') {
    if (!params.has('evidence')) return null
    const next = new URLSearchParams(params)
    next.delete('evidence')
    const s = next.toString()
    return s ? `?${s}` : ''
  }
  if (!params.has('cross') && !params.has('special') && !params.has('evidence')) return null
  const next = new URLSearchParams(params)
  const cross = params.get('cross') === '1'
  const special = params.getAll('special').some((v) => v !== '')
  next.delete('cross')
  next.delete('special')
  next.delete('evidence')
  if (cross && !next.getAll(LIST_PARAMS.issue).includes(CROSS_ISSUE_VALUE)) next.append(LIST_PARAMS.issue, CROSS_ISSUE_VALUE)
  if (special) next.set(LIST_PARAMS.specialOnly, '1')
  const s = next.toString()
  return s ? `?${s}` : ''
}
