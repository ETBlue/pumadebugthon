// The back button of the detail pages (design 3.2, decision 111). It goes
// to the list page of the same kind. When the reader saw that list page in
// this session, it goes back with the same sort, filters and search.
import type { ListPage } from './listParams'

const STORAGE_KEY = 'backLink.listSearch.'

/** The last search string of each list page in this session. The map is the
 * main store. sessionStorage keeps it after a reload of the page. */
const memory = new Map<ListPage, string>()

/** Only "" or "?…" is a search string. Anything else is treated as "". */
function cleanSearch(value: string | null | undefined): string {
  return typeof value === 'string' && value.startsWith('?') ? value : ''
}

/** Remember the current search string of a list page ("" or "?…"). The list
 * pages call it with their clean URL, after unknown values are dropped. */
export function rememberListSearch(page: ListPage, search: string): void {
  const clean = cleanSearch(search)
  memory.set(page, clean)
  try {
    sessionStorage.setItem(STORAGE_KEY + page, clean)
  } catch {
    // No storage (private window, blocked storage, tests): the map is enough.
  }
}

/** The search string the list page had when the reader last saw it in this
 * session, or "" when the reader has not seen it. */
export function rememberedListSearch(page: ListPage): string {
  const kept = memory.get(page)
  if (kept !== undefined) return kept
  try {
    return cleanSearch(sessionStorage.getItem(STORAGE_KEY + page))
  } catch {
    return ''
  }
}

/** The path of the back button to a list page, for example
 * "/issues?space=park" or "/solutions". */
export function backListPath(page: ListPage): string {
  return `/${page}${rememberedListSearch(page)}`
}

/** For tests: forget every remembered search. */
export function forgetListSearches(): void {
  memory.clear()
  try {
    for (const page of ['issues', 'stakeholders', 'solutions'] as const) sessionStorage.removeItem(STORAGE_KEY + page)
  } catch {
    // Nothing to clear.
  }
}
