// The statistics on #/stakeholders (design 3.20, decision 63). Plain counts
// only: no percent, no score, no rank. Every list is in a fixed order
// (FIRST_LEVEL_ORDER, FOCUS_ORDER, issue number). Nothing here sorts by a
// count.
import type { IssueFile, Stakeholder } from '@/types'
import { dataBasedOnly } from './dataBasis'
import { compareIds } from './ids'
import { FOCUS_ORDER } from './issues'
import { menuIdsFor, type SideBarFilters } from './stakeholderFilter'
import { buildTree, storyCountsByStakeholder, type TreeNode } from './stakeholders'

export interface StatsTotals {
  /** The stakeholders the side menu lists. */
  stakeholders: number
  organizations: number
  individuals: number
  /** Of these, the ones in 2 or more issues (the rule of 只看跨議題). null
   * with fewer than 2 analyzed issues: the page does not show it. */
  crossIssue: number | null
  /** Their stories over the analyzed issues. */
  stories: number
}

/** One row of 依分類: one first level of 分類路徑. */
export interface CategoryRow {
  root: 'O' | 'I'
  /** The first level code, for example "gov". */
  path: string
  /** Its name from path-labels.csv (the code when there is no name). */
  label: string
  stakeholders: number
  stories: number
}

/** One row of 特別關注族群. */
export interface FocusGroupRow {
  group: string
  /** In ID order. Empty when no listed stakeholder has the group. */
  stakeholders: Stakeholder[]
}

/** One row of 各議題. */
export interface IssueRow {
  issueNumber: number
  title: string
  stakeholders: number
  organizations: number
  individuals: number
}

export interface StakeholderStats {
  totals: StatsTotals
  /** In FIRST_LEVEL_ORDER (組織 levels, then 個人 levels). Rows with 0
   * stakeholders are left out. */
  byCategory: CategoryRow[]
  /** The 6 groups in FOCUS_ORDER, also a group with no stakeholder. */
  byFocusGroup: FocusGroupRow[]
  /** In issue number order. */
  byIssue: IssueRow[]
}

const isOrg = (s: Stakeholder) => s.id.startsWith('O')

function countBelow(node: TreeNode): number {
  return node.stakeholders.length + node.children.reduce((sum, c) => sum + countBelow(c), 0)
}

/** The statistics of #/stakeholders. They describe the stakeholders that
 * the side menu lists: active, in at least one of the analyzed issues, and
 * passing 只看跨議題 and 特別關注 (menuIdsFor). With 只看有資料根據, only the
 * story counts change: they count only the stories with a [實證] or
 * [AI整理] cell (hasDataBasis). issues are the analyzed issues. */
export function stakeholderStats(
  stakeholders: Stakeholder[],
  issues: IssueFile[],
  filters: SideBarFilters,
  pathLabels: Record<string, string>,
): StakeholderStats {
  const numbers = issues.map((i) => i.number)
  const menuIds = stakeholders
    .filter((s) => s.movedTo === null && s.issues.some((n) => numbers.includes(n)))
    .map((s) => s.id)
  const ids = new Set(menuIdsFor(menuIds, stakeholders, filters, null))
  const listed = stakeholders.filter((s) => ids.has(s.id)).sort((a, b) => compareIds(a.id, b.id))

  // The issues with only the stories that count.
  const counted = issues.map((i) => ({ ...i, stories: filters.dataBasedOnly ? dataBasedOnly(i.stories) : i.stories }))
  const stories = counted.reduce((sum, i) => sum + i.stories.filter((s) => ids.has(s.stakeholder)).length, 0)

  const orgs = listed.filter(isOrg).length
  const totals: StatsTotals = {
    stakeholders: listed.length,
    organizations: orgs,
    individuals: listed.length - orgs,
    crossIssue: issues.length >= 2 ? listed.filter((s) => s.issues.length >= 2).length : null,
    stories,
  }

  // buildTree gives the first levels in FIRST_LEVEL_ORDER and the story
  // total of each level. It leaves out levels with no stakeholder.
  const tree = buildTree(listed, pathLabels, storyCountsByStakeholder(counted))
  const byCategory: CategoryRow[] = [
    ...tree.organizations.map((n) => ({ root: 'O' as const, n })),
    ...tree.individuals.map((n) => ({ root: 'I' as const, n })),
  ].map(({ root, n }) => ({ root, path: n.path, label: n.label, stakeholders: countBelow(n), stories: n.storyTotal }))

  const byFocusGroup: FocusGroupRow[] = FOCUS_ORDER.map((group) => ({
    group,
    stakeholders: listed.filter((s) => s.focus.includes(group)),
  }))

  const byIssue: IssueRow[] = [...issues]
    .sort((a, b) => a.number - b.number)
    .map((issue) => {
      const inIssue = listed.filter((s) => s.issues.includes(issue.number))
      const o = inIssue.filter(isOrg).length
      return { issueNumber: issue.number, title: issue.title, stakeholders: inIssue.length, organizations: o, individuals: inIssue.length - o }
    })

  return { totals, byCategory, byFocusGroup, byIssue }
}
