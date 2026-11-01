// The URL params of the list pages (design 3.23.5 and 3.23.13,
// decisions 85, 91, 97 and 122). Every sort, filter and search is in the URL.
// The names do not reuse stakeholder, evidence, cross, special, focus, pick
// or from, because those mean other things on other pages (3.19).
import type { IndexFile } from '@/types'
import { NO_FILTERS, TYPE_FILTER_FIELDS, type ListFilters } from './listFilter'
import type { ListSort } from './listSort'
import { availableIssues } from './issues'
import { isListed } from './stakeholders'
import { issueCodes, issueMayUseType, TYPE_KINDS, typeGroupNames, typesOf, type TypeKind, type TypeListPage } from './typeKinds'

export type ListPage = 'issues' | 'stakeholders' | 'solutions' | TypeListPage

/** The kind of type of each type list page (#/spaces, #/domains,
 * #/solution-types). The other list pages are not here. */
const PAGE_KIND: Record<TypeListPage, TypeKind> = { spaces: 'space', domains: 'domain', 'solution-types': 'solutionType' }

/** The kind of type of a type list page, or null for another page. */
function pageKind(page: ListPage): TypeKind | null {
  return page in PAGE_KIND ? PAGE_KIND[page as TypeListPage] : null
}

/** The param names, in the order listUrlSearch writes them. */
export const LIST_PARAMS = {
  q: 'q',
  sort: 'sort',
  issue: 'issue',
  space: 'space',
  domain: 'domain',
  solutionType: 'solutiontype',
  who: 'who',
  specialOnly: 'specialonly',
  view: 'view',
  group: 'group',
} as const

/** The param of each type filter (空間類型, 領域, 解法類型), in the order
 * listUrlSearch writes them. */
const TYPE_PARAMS: Record<TypeKind, string> = {
  space: LIST_PARAMS.space,
  domain: LIST_PARAMS.domain,
  solutionType: LIST_PARAMS.solutionType,
}

/** The codes each type filter of a page offers. A kind that is left out
 * offers the codes the analyzed issues have on the issue (index.json):
 * spaces and 領域 lines. A solution type is never on an issue, so a page
 * must give its codes. */
export type OfferedCodes = { [k in TypeKind]?: readonly string[] }

/** The value of issue= for 「跨議題」 (and 「跨議題解法」). */
export const CROSS_ISSUE_VALUE = 'X'

/** The longest search text in the URL, in characters. */
export const Q_MAX_LENGTH = 100

/** The sorts of each page (design 3.23.3). The first one is the default.
 * #/spaces has none: the spaces have no share of their own, so the page
 * keeps the data order and the bar has no sort (decision 122). #/domains
 * and #/solution-types are the same (Task U3). */
export const PAGE_SORTS: Record<ListPage, readonly ListSort[]> = {
  issues: ['updated', 'added', 'evidence'],
  stakeholders: ['updated', 'added', 'evidence', 'solutions'],
  solutions: ['updated', 'added', 'evidence'],
  spaces: [],
  domains: [],
  'solution-types': [],
}

/** The params each page reads. Any other list param is dropped. A solution
 * type has one level, so #/solution-types has no group. */
const PAGE_PARAMS: Record<ListPage, readonly string[]> = {
  issues: [LIST_PARAMS.q, LIST_PARAMS.sort, LIST_PARAMS.space, LIST_PARAMS.domain, LIST_PARAMS.who],
  stakeholders: [LIST_PARAMS.q, LIST_PARAMS.sort, LIST_PARAMS.issue, LIST_PARAMS.specialOnly, LIST_PARAMS.view],
  solutions: [
    LIST_PARAMS.q, LIST_PARAMS.sort, LIST_PARAMS.issue, LIST_PARAMS.space, LIST_PARAMS.domain, LIST_PARAMS.solutionType, LIST_PARAMS.who,
  ],
  spaces: [LIST_PARAMS.q, LIST_PARAMS.issue, LIST_PARAMS.group],
  domains: [LIST_PARAMS.q, LIST_PARAMS.issue, LIST_PARAMS.group],
  'solution-types': [LIST_PARAMS.q, LIST_PARAMS.issue],
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
export function listOnlySearch(params: URLSearchParams): string {
  const names: readonly string[] = Object.values(LIST_PARAMS)
  const out = new URLSearchParams()
  for (const [key, value] of params) if (names.includes(key)) out.append(key, value)
  const s = out.toString()
  return s ? `?${s}` : ''
}

/** The state of a list page from its URL params. Unknown values are dropped:
 * a sort the page does not have, an issue with no analysis, a type code
 * (space, 領域, 解法類型) that the page does not offer, an unknown or
 * unlisted stakeholder, and every param the page does not have. A moved ID
 * in who is dropped too: it is not listed (decision 113). offered: the
 * codes each type filter offers (OfferedCodes). The picked codes keep the
 * order of the type list (level 2 only, file order). */
export function listParamsOf(
  page: ListPage,
  params: URLSearchParams,
  index: IndexFile,
  offered: OfferedCodes = {},
): ListParams {
  const has = (name: string) => PAGE_PARAMS[page].includes(name)
  const kind = pageKind(page)
  const state: ListState = { ...DEFAULT_LIST_STATE, issues: [], spaces: [], domains: [], solutionTypes: [], groups: [] }

  const sort = params.get(LIST_PARAMS.sort)
  if (has(LIST_PARAMS.sort) && sort !== null && (PAGE_SORTS[page] as readonly string[]).includes(sort)) {
    state.sort = sort as ListSort
  }

  if (has(LIST_PARAMS.issue)) {
    const values = params.getAll(LIST_PARAMS.issue)
    // A type list page offers only the analyzed issues that can use a type
    // of its kind (for #/spaces: the issues with a space), and has no
    // 「跨議題」 (decision 122).
    const analyzed = availableIssues(index)
      .filter((i) => kind === null || issueMayUseType(kind, i))
      .map((i) => i.number)
    state.crossChoice = kind === null && values.includes(CROSS_ISSUE_VALUE)
    state.issues = analyzed.filter((n) => values.some((v) => /^\d+$/.test(v) && Number(v) === n))
  }

  for (const typeKind of TYPE_KINDS) {
    const name = TYPE_PARAMS[typeKind]
    if (!has(name)) continue
    const values = params.getAll(name)
    const codes = offered[typeKind] ?? availableIssues(index).flatMap((i) => issueCodes(typeKind, i, []))
    state[TYPE_FILTER_FIELDS[typeKind]] = typesOf(typeKind, index)
      .map((t) => t.code)
      .filter((c) => values.includes(c) && codes.includes(c))
  }

  const who = params.get(LIST_PARAMS.who)
  if (has(LIST_PARAMS.who) && who !== null) {
    const found = index.stakeholders.find((s) => s.id === who)
    state.who = found && isListed(found) ? found.id : null
  }

  if (has(LIST_PARAMS.group) && kind !== null) {
    const values = params.getAll(LIST_PARAMS.group)
    state.groups = typeGroupNames(kind, index).filter((g) => values.includes(g))
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
  for (const typeKind of TYPE_KINDS) {
    const name = TYPE_PARAMS[typeKind]
    if (has(name)) for (const c of state[TYPE_FILTER_FIELDS[typeKind]]) out.append(name, c)
  }
  if (has(LIST_PARAMS.who) && state.who !== null) out.set(LIST_PARAMS.who, state.who)
  if (has(LIST_PARAMS.specialOnly) && state.specialOnly) out.set(LIST_PARAMS.specialOnly, '1')
  if (has(LIST_PARAMS.view) && state.view === 'tree') out.set(LIST_PARAMS.view, 'tree')
  if (has(LIST_PARAMS.group)) for (const g of state.groups) out.append(LIST_PARAMS.group, g)
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
 * of the block. 最近更新 is the default sort. Since decision 131 all three
 * blocks use it, so no link has a param (before: ?sort=added for the
 * stakeholders and the solutions). */
export const HOME_ALL_PATHS: Record<Exclude<ListPage, TypeListPage>, string> = {
  issues: listPath('issues'),
  stakeholders: listPath('stakeholders'),
  solutions: listPath('solutions'),
}

/** The stakeholders in 2 or more issues: #/stakeholders?issue=X (decision 91). */
export const CROSS_STAKEHOLDERS_PATH = listPath('stakeholders', { crossChoice: true })

/** The search string of 「清除篩選」: every filter and q are removed. sort,
 * view and any other param are kept. "" when nothing is left. */
export function clearListFilters(params: URLSearchParams): string {
  const next = new URLSearchParams(params)
  for (const name of [LIST_PARAMS.q, LIST_PARAMS.issue, ...TYPE_KINDS.map((k) => TYPE_PARAMS[k]), LIST_PARAMS.who, LIST_PARAMS.specialOnly, LIST_PARAMS.group]) {
    next.delete(name)
  }
  const s = next.toString()
  return s ? `?${s}` : ''
}

/** The search string of a list state on a page that also has other params
 * (the space page tabs, decision 138): every list param of params is
 * replaced by the list params of state (listUrlSearch). The other params,
 * for example evidence, are kept first. "" when nothing is left. */
export function mergeListSearch(params: URLSearchParams, page: ListPage, state: ListState): string {
  const names: readonly string[] = Object.values(LIST_PARAMS)
  const next = new URLSearchParams()
  for (const [key, value] of params) if (!names.includes(key)) next.append(key, value)
  for (const [key, value] of new URLSearchParams(listUrlSearch(page, state))) next.append(key, value)
  const s = next.toString()
  return s ? `?${s}` : ''
}
