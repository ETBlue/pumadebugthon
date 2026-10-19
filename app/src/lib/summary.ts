// The 分析摘要 at the top of the 總覽 tab (design 3.2, decision 29).
// Topics keep the fixed order of the issue file. Nothing here sorts by a count.
import type { IssueFile } from '@/types'
import { withDataBasisFilter } from './dataBasis'
import { tabPath } from './issuePage'
import { needPickKey } from './needs'
import { solutionPath } from './solutionPage'
import { opinionPickTo } from './wants'

/** The topics of the 分析摘要, in the fixed order. The same list as
 * analysis_common.SUMMARY_TOPICS. */
export const SUMMARY_TOPICS = [
  '難以取捨的決定',
  '可能的爭議',
  '受影響較大的弱勢族群',
  '法規上的障礙',
  '相依事項與現行政策的關係',
] as const

export type SummaryRefKind = 'story' | 'stakeholder' | 'conflict' | 'group' | 'solution'

/** One reference of a 相關編號 cell. */
export interface SummaryRef {
  /** The issue number for a reference to another issue (「#8 解法 B」), else null. */
  issue: number | null
  kind: SummaryRefKind
  /** The ID. For a solution, its code: 「解法 B」 -> "B". */
  id: string
}

// The same format as analysis_common.SUMMARY_REF.
const REF = /^(?:#(\d+) )?([OI]\d\d-US\d\d|[OI]\d\d|C\d+|W\d\d|解法 [A-Z])$/

/** Read one reference, for example "I01-US09", "C9", "解法 A" or "#8 解法 B".
 * null when the text is not a reference. */
export function parseSummaryRef(ref: string): SummaryRef | null {
  const m = REF.exec(ref)
  if (!m) return null
  const issue = m[1] === undefined ? null : Number(m[1])
  const id = m[2]
  if (id.startsWith('解法 ')) return { issue, kind: 'solution', id: id.slice(3) }
  if (id.includes('-US')) return { issue, kind: 'story', id }
  if (id[0] === 'O' || id[0] === 'I') return { issue, kind: 'stakeholder', id }
  return { issue, kind: id[0] === 'C' ? 'conflict' : 'group', id }
}

export interface RefTarget {
  pathname: string
  search: string
}

/** The link of a reference in the summary of issue `issueNumber`.
 * - story: the opinion check with its pick key (its group, or the story), as on 需求.
 * - group: the opinion check with the group picked.
 * - stakeholder: the stakeholder page.
 * - conflict: the 衝突 tab. solution: the solution page.
 * A reference to another issue goes into that issue: its 衝突 tab, its
 * solution page, or its overview for a story or a group (the other issue's
 * file is not loaded, so the pick key is not known).
 * Issue pages keep the 「只看有資料根據」 filter. null when the reference
 * cannot be read or the ID is not in this issue. */
export function summaryRefTo(ref: string, issueNumber: number, issue: IssueFile, dataBasedOnly: boolean): RefTarget | null {
  const r = parseSummaryRef(ref)
  if (!r) return null
  const filter = dataBasedOnly ? `?${withDataBasisFilter(new URLSearchParams(), true).toString()}` : ''
  if (r.kind === 'stakeholder') {
    if (r.issue === null && !issue.stakeholders.some((s) => s.id === r.id)) return null
    return { pathname: `/stakeholders/${r.id}`, search: '' }
  }
  if (r.issue !== null && r.issue !== issueNumber) {
    if (r.kind === 'solution') return { pathname: solutionPath(r.issue, r.id), search: filter }
    if (r.kind === 'conflict') return { pathname: tabPath(r.issue, 'conflicts'), search: filter }
    return { pathname: tabPath(r.issue, 'overview'), search: filter }
  }
  switch (r.kind) {
    case 'story': {
      const story = issue.stories.find((s) => s.id === r.id)
      return story ? opinionPickTo(issueNumber, needPickKey(issue, story), dataBasedOnly) : null
    }
    case 'group':
      return issue.groups.some((g) => g.id === r.id) ? opinionPickTo(issueNumber, r.id, dataBasedOnly) : null
    case 'conflict':
      return issue.conflicts.some((c) => c.id === r.id) ? { pathname: tabPath(issueNumber, 'conflicts'), search: filter } : null
    case 'solution':
      return issue.solutions.some((s) => s.id === r.id) ? { pathname: solutionPath(issueNumber, r.id), search: filter } : null
  }
}
