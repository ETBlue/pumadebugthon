// The text search of the three list pages (design 3.23.13, decisions 95
// and 96). An item matches when its number matches or its title contains
// the search text. Each function returns true or false only. There is no
// score, and the search never changes the order of a list.
import type { Cell } from '@/types'

/** A parsed search. `text` is for the title, `key` is for the number. */
export interface ListQuery {
  /** NFKC, lower case and trimmed. Spaces inside are kept. */
  text: string
  /** `text` without spaces, 「#」 and 「-」. */
  key: string
}

/** One item of the solution list: an issue solution or a cross-issue
 * solution. `RecentSolution` of recent.ts has this shape. */
export type SearchSolutionItem =
  | { kind: 'issue'; issueNumber: number; solution: { id: string; name: Cell } }
  | { kind: 'cross'; solution: { code: string; name: string } }

function normalize(s: string): string {
  return s.normalize('NFKC').toLowerCase()
}

/** Reads the search box text. Returns null when the text is empty or has
 * only spaces and 「#」. A null query finds every item. */
export function parseListQuery(q: string): ListQuery | null {
  const text = normalize(q).trim()
  if (text.replace(/[\s#]/g, '') === '') return null
  return { text, key: text.replace(/[\s#-]/g, '') }
}

function titleHas(title: string, query: ListQuery): boolean {
  return normalize(title).includes(query.text)
}

/** The number in a key of digits only, with leading zeros ignored, or
 * null when the key is not only digits. */
function numberOf(key: string): number | null {
  return /^\d+$/.test(key) ? Number(key) : null
}

/** The issue number (the whole number) or a part of the title. */
export function issueMatches(issue: { number: number; title: string }, query: ListQuery | null): boolean {
  if (!query) return true
  return numberOf(query.key) === issue.number || titleHas(issue.title, query)
}

/** The ID (the same letter and the same number, leading zeros ignored) or
 * a part of the name. */
export function stakeholderMatches(stakeholder: { id: string; name: string }, query: ListQuery | null): boolean {
  if (!query) return true
  const m = /^([a-z])(\d+)$/.exec(query.key)
  const id = /^([A-Za-z])(\d+)$/.exec(stakeholder.id)
  if (m && id && m[1] === id[1].toLowerCase() && Number(m[2]) === Number(id[2])) return true
  return titleHas(stakeholder.name, query)
}

/** The letter alone (an issue solution or a cross-issue solution), the
 * code (`2a` for #2 A, `xa` for X-A), or a part of the name. A number
 * alone does not match: the 議題 filter does that. */
export function solutionMatches(item: SearchSolutionItem, query: ListQuery | null): boolean {
  if (!query) return true
  const key = query.key
  if (item.kind === 'issue') {
    const letter = item.solution.id.toLowerCase()
    if (key === letter) return true
    const m = /^(\d+)([a-z])$/.exec(key)
    if (m && Number(m[1]) === item.issueNumber && m[2] === letter) return true
    return titleHas(item.solution.name.text, query)
  }
  const codeKey = item.solution.code.toLowerCase().replace(/-/g, '')
  if (key === codeKey || key === codeKey.slice(1)) return true
  return titleHas(item.solution.name, query)
}
