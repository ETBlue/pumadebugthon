// The filters of the list pages (design 3.23.5, decisions 85 and 122). Inside
// one filter an item matches ANY picked value. Between filters an item must
// match ALL of them. Nothing picked in a filter means no limit. The text
// search is not here (src/lib/listSearch.ts): the pages apply both.
// Every function keeps the order of the list it gets. Nothing here sorts.
import type { IssueSummary, SpaceType, Stakeholder } from '@/types'
import { crossCoverageIssueNumbers, crossNeedCoverage } from './crossIssue'
import type { ListContext } from './listSort'
import { needsForStakeholder } from './needs'
import type { RecentSolution } from './recent'
import { solutionNeedCoverage } from './solutionPage'
import { isListed } from './stakeholders'
import { issueUsedCodes, solutionCodes, TYPE_KINDS, type TypeKind } from './typeKinds'

/** The filters of the list pages, as listParamsOf reads them from the URL.
 * A page uses only its own filters. */
export interface ListFilters {
  /** 議題: picked issue numbers (issue=<n>). */
  issues: number[]
  /** 「跨議題」 in the 議題 filter (issue=X). */
  crossChoice: boolean
  /** 空間類型: picked space codes (space=<code>). */
  spaces: string[]
  /** 領域: picked level 2 domain codes (domain=<code>), Task U5. */
  domains: string[]
  /** 解法類型: picked solution type codes (solutiontype=<code>), Task U5. */
  solutionTypes: string[]
  /** 利害關係人: one stakeholder ID (who=<id>), or null. */
  who: string | null
  /** 只看特別關注族群 (specialonly=1). */
  specialOnly: boolean
  /** 空間分類 on #/spaces: picked space groups (group=<name>), decision 122. */
  groups: string[]
}

/** No filter on. */
export const NO_FILTERS: ListFilters = {
  issues: [], crossChoice: false, spaces: [], domains: [], solutionTypes: [], who: null, specialOnly: false, groups: [],
}

/** The filter field of each kind of type: 空間類型, 領域 and 解法類型. */
export const TYPE_FILTER_FIELDS = { space: 'spaces', domain: 'domains', solutionType: 'solutionTypes' } as const satisfies Record<
  TypeKind,
  keyof ListFilters
>

export type TypeFilterField = (typeof TYPE_FILTER_FIELDS)[TypeKind]

/** The type filters a page may have. A page leaves out the ones it does not
 * have; a left-out filter is off. */
type TypeFilters = Partial<Pick<ListFilters, TypeFilterField>>

/** True when a 空間類型, 領域 or 解法類型 filter is on. */
export function typeFiltersOn(filter: Partial<ListFilters>): boolean {
  return TYPE_KINDS.some((kind) => (filter[TYPE_FILTER_FIELDS[kind]] ?? []).length > 0)
}

/** True when the item passes every type filter that is on: for each such
 * filter, codesOf(kind) has ANY picked code. */
function matchesTypeFilters(filter: TypeFilters, codesOf: (kind: TypeKind) => string[]): boolean {
  return TYPE_KINDS.every((kind) => {
    const picked = filter[TYPE_FILTER_FIELDS[kind]] ?? []
    return picked.length === 0 || codesOf(kind).some((c) => picked.includes(c))
  })
}

/** #/issues: 空間類型, 領域 and 利害關係人. A 製作中 issue has no codes and no
 * stakeholders, so any filter hides it. 空間類型 and 領域 keep an issue that
 * uses a picked code by the rule of the type pages (issueUsedCodes): for
 * 領域 that is usedDomains, so a solution's own 領域 counts too (Task U5).
 * index.json is enough: no issue files are needed. */
export function filterIssues(
  issues: IssueSummary[],
  filter: Pick<ListFilters, 'spaces' | 'who'> & Partial<Pick<ListFilters, 'domains'>>,
  stakeholders: Stakeholder[],
): IssueSummary[] {
  const whoIssues = filter.who === null ? null : (stakeholders.find((s) => s.id === filter.who)?.issues ?? [])
  const types = { spaces: filter.spaces, domains: filter.domains }
  return issues.filter(
    (i) =>
      matchesTypeFilters(types, (kind) => (i.available ? issueUsedCodes(kind, i, []) : [])) &&
      (whoIssues === null || (i.available && whoIssues.includes(i.number))),
  )
}

/** #/stakeholders: 議題 (with 「跨議題」) and 只看特別關注族群. Only listed
 * stakeholders (isListed) are kept. 「跨議題」 keeps a stakeholder in 2 or
 * more analyzed issues. issues: the issue list of index.json. */
export function filterStakeholders(
  list: Stakeholder[],
  filter: Pick<ListFilters, 'issues' | 'crossChoice' | 'specialOnly'>,
  issues: IssueSummary[],
): Stakeholder[] {
  const analyzed = new Set(issues.filter((i) => i.available).map((i) => i.number))
  const issueFilterOn = filter.issues.length > 0 || filter.crossChoice
  return list.filter(
    (s) =>
      isListed(s) &&
      (!issueFilterOn ||
        s.issues.some((n) => filter.issues.includes(n)) ||
        (filter.crossChoice && s.issues.filter((n) => analyzed.has(n)).length >= 2)) &&
      (!filter.specialOnly || s.focus.length > 0),
  )
}

/** The 利害關係人 rule for an issue solution: it covers at least one need
 * with a story of the stakeholder. The same rule as the issue's 解法 tab. */
function issueSolutionCovers(item: Extract<RecentSolution, { kind: 'issue' }>, who: string, ctx: ListContext): boolean {
  const issue = ctx.issues.find((i) => i.number === item.issueNumber)
  if (!issue) return false
  return needsForStakeholder(solutionNeedCoverage(issue, item.solution).covered, who).length > 0
}

/** #/solutions: 議題 (with 「跨議題解法」), 空間類型, 領域, 解法類型 and
 * 利害關係人. The type filters keep a solution with ANY picked code
 * (solutionCodes). An issue solution's domains are its own 領域, or else its
 * issue's. An X- solution's domains are the union of its parts.
 * 議題 keeps an issue solution of a picked issue. It keeps a cross-issue
 * solution when 「跨議題解法」 is picked, or a picked issue is in its parts
 * or in the issues of the needs it covers (X-S5 matches #1).
 * 利害關係人 keeps a cross-issue solution that covers one of the
 * stakeholder's needs in any issue (decision 60). */
export function filterSolutions(
  items: RecentSolution[],
  filter: Pick<ListFilters, 'issues' | 'crossChoice' | 'spaces' | 'who'> & TypeFilters,
  ctx: ListContext,
): RecentSolution[] {
  const issueFilterOn = filter.issues.length > 0 || filter.crossChoice
  return items.filter((item) => {
    if (!matchesTypeFilters(filter, (kind) => solutionCodes(kind, item.solution))) return false
    if (item.kind === 'issue') {
      if (issueFilterOn && !filter.issues.includes(item.issueNumber)) return false
      return filter.who === null || issueSolutionCovers(item, filter.who, ctx)
    }
    const cross = ctx.cross
    if (cross === null) return false
    if (
      issueFilterOn &&
      !filter.crossChoice &&
      !crossCoverageIssueNumbers(cross, item.solution).some((n) => filter.issues.includes(n))
    ) {
      return false
    }
    if (filter.who === null) return true
    const who = filter.who
    return crossNeedCoverage(cross, item.solution, ctx.issues).some((i) =>
      i.coverage.covered.some((n) => n.stakeholders.includes(who)),
    )
  })
}

/** #/spaces (decision 122): 空間分類 and 議題. 空間分類 keeps a space of a
 * picked group. 議題 keeps a space that a picked issue uses. A space that
 * no analyzed issue uses is hidden while the 議題 filter is on. issues: the
 * issue list of index.json. */
export function filterSpaces(
  spaces: SpaceType[],
  filter: Pick<ListFilters, 'groups' | 'issues'>,
  issues: IssueSummary[],
): SpaceType[] {
  const users = (code: string) => issues.filter((i) => i.available && i.spaces.includes(code)).map((i) => i.number)
  return filterTypes(spaces, filter, users)
}

/** A type list page (#/spaces, #/domains, #/solution-types; decision 122
 * and Task U3): 分類 and 議題. 分類 keeps a type of a picked group. 議題
 * keeps a type that a picked issue uses. A type that no analyzed issue uses
 * is hidden while the 議題 filter is on. issuesOf: the numbers of the
 * issues that use a code (typeIssues). The order of types is kept. */
export function filterTypes<T extends { code: string; group?: string }>(
  types: T[],
  filter: Pick<ListFilters, 'groups' | 'issues'>,
  issuesOf: (code: string) => number[],
): T[] {
  return types.filter(
    (t) =>
      (filter.groups.length === 0 || (t.group !== undefined && filter.groups.includes(t.group))) &&
      (filter.issues.length === 0 || issuesOf(t.code).some((n) => filter.issues.includes(n))),
  )
}
