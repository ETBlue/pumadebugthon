// The filters of the three list pages (design 3.23.5, decision 85). Inside
// one filter an item matches ANY picked value. Between filters an item must
// match ALL of them. Nothing picked in a filter means no limit. The text
// search is not here (src/lib/listSearch.ts): the pages apply both.
// Every function keeps the order of the list it gets. Nothing here sorts.
import type { IssueSummary, Stakeholder } from '@/types'
import { crossCoverageIssueNumbers, crossNeedCoverage } from './crossIssue'
import type { ListContext } from './listSort'
import { needsForStakeholder } from './needs'
import type { RecentSolution } from './recent'
import { solutionNeedCoverage } from './solutionPage'
import { isListed } from './stakeholders'

/** The filters of the list pages, as listParamsOf reads them from the URL.
 * A page uses only its own filters. */
export interface ListFilters {
  /** 議題: picked issue numbers (issue=<n>). */
  issues: number[]
  /** 「跨議題」 in the 議題 filter (issue=X). */
  crossChoice: boolean
  /** 空間類型: picked space codes (space=<code>). */
  spaces: string[]
  /** 利害關係人: one stakeholder ID (who=<id>), or null. */
  who: string | null
  /** 只看特別關注族群 (specialonly=1). */
  specialOnly: boolean
}

/** No filter on. */
export const NO_FILTERS: ListFilters = { issues: [], crossChoice: false, spaces: [], who: null, specialOnly: false }

/** #/issues: 空間類型 and 利害關係人. A 製作中 issue has no spaces and no
 * stakeholders, so any filter hides it. */
export function filterIssues(
  issues: IssueSummary[],
  filter: Pick<ListFilters, 'spaces' | 'who'>,
  stakeholders: Stakeholder[],
): IssueSummary[] {
  const whoIssues = filter.who === null ? null : (stakeholders.find((s) => s.id === filter.who)?.issues ?? [])
  return issues.filter(
    (i) =>
      (filter.spaces.length === 0 || i.spaces.some((c) => filter.spaces.includes(c))) &&
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

/** #/solutions: 議題 (with 「跨議題解法」), 空間類型 and 利害關係人.
 * 議題 keeps an issue solution of a picked issue. It keeps a cross-issue
 * solution when 「跨議題解法」 is picked, or a picked issue is in its parts
 * or in the issues of the needs it covers (X-E matches #1).
 * 利害關係人 keeps a cross-issue solution that covers one of the
 * stakeholder's needs in any issue (decision 60). */
export function filterSolutions(
  items: RecentSolution[],
  filter: Pick<ListFilters, 'issues' | 'crossChoice' | 'spaces' | 'who'>,
  ctx: ListContext,
): RecentSolution[] {
  const issueFilterOn = filter.issues.length > 0 || filter.crossChoice
  return items.filter((item) => {
    if (filter.spaces.length > 0 && !item.solution.spaces.some((c) => filter.spaces.includes(c))) return false
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
