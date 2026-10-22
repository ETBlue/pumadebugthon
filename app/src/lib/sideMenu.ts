// The stakeholder side menu (design 3.21, decisions 65 and 66): the tree and
// the count next to each stakeholder. The tree is in tree order and ID
// order. A count says how many items the main block shows after a click on
// that stakeholder. It is not a score. Nothing here sorts by a count.
import type { IssueFile, Stakeholder } from '@/types'
import { compareIds } from './ids'
import { needsTabView, solutionsTabView } from './issueTabs'
import {
  buildTree, filterStakeholders, findStakeholder, type StakeholderFilter, type StoryCountsByStakeholder, type TreeNode,
} from './stakeholders'
import { wantsTabView } from './wantsTab'

/** One group of the side menu: a root (組織 or 個人) or a level of 分類路徑. */
export interface SideMenuGroup {
  /** Unique in the tree: "O" or "I" for a root, "O:gov-local" for a level. */
  key: string
  root: 'O' | 'I'
  /** The 分類路徑 prefix of a level. null for a root. */
  path: string | null
  /** The name of a level from path-labels.csv (the last code when there is
   * no name). null for a root: the component shows 組織 or 個人. */
  label: string | null
  /** The stakeholders directly in this group, in ID order. In a root: the
   * stakeholders with no path (and unknown IDs). */
  stakeholders: Stakeholder[]
  /** The child levels, in the order of buildTree. */
  children: SideMenuGroup[]
  /** The number of stakeholders in this group and every level below it. */
  stakeholderCount: number
}

function fromNode(node: TreeNode, root: 'O' | 'I'): SideMenuGroup {
  const children = node.children.map((c) => fromNode(c, root))
  return {
    key: `${root}:${node.path}`,
    root,
    path: node.path,
    label: node.label,
    stakeholders: node.stakeholders,
    children,
    stakeholderCount: node.stakeholders.length + children.reduce((sum, c) => sum + c.stakeholderCount, 0),
  }
}

/** The side menu tree (design 3.21) for these IDs. Two roots, O then I. In
 * each group: its stakeholders in ID order, then its child levels. The first
 * levels follow FIRST_LEVEL_ORDER, deeper levels the order of buildTree
 * (under 個人 only the first level). A stakeholder with no path, or an
 * unknown ID (shown with the ID as its name), is directly under its root.
 * Levels and roots with no stakeholder are left out. */
export function sideMenuTree(ids: string[], stakeholders: Stakeholder[], pathLabels: Record<string, string>): SideMenuGroup[] {
  const listed = [...new Set(ids)].map((id) => findStakeholder(stakeholders, id))
  // buildTree leaves out stakeholders with no path and moved IDs.
  const inTree = listed.filter((s) => s.path !== null && s.movedTo === null)
  const tree = buildTree(inTree, pathLabels, new Map())
  const levels = { O: tree.organizations, I: tree.individuals }
  const groups: SideMenuGroup[] = []
  for (const root of ['O', 'I'] as const) {
    const own = listed
      .filter((s) => !inTree.includes(s) && (s.id.startsWith('O') ? root === 'O' : root === 'I'))
      .sort((a, b) => compareIds(a.id, b.id))
    const children = levels[root].map((n) => fromNode(n, root))
    const stakeholderCount = own.length + children.reduce((sum, c) => sum + c.stakeholderCount, 0)
    if (stakeholderCount === 0) continue
    groups.push({ key: root, root, path: null, label: null, stakeholders: own, children, stakeholderCount })
  }
  return groups
}

/** The tree of the 利害關係人 tab of the issue page (decision 115): the
 * stakeholders that pass the filter (filterStakeholders), in the same tree
 * as the side menu and the tree view of #/stakeholders. */
export function filteredSideMenuTree(
  stakeholders: Stakeholder[],
  pathLabels: Record<string, string>,
  filter: StakeholderFilter,
): SideMenuGroup[] {
  const ids = filterStakeholders(stakeholders, filter).map((s) => s.id)
  return sideMenuTree(ids, stakeholders, pathLabels)
}

/** The number of stories of all stakeholders in a group and every level
 * below it. counts: from storyCountsByStakeholder. */
export function groupStoryTotal(group: SideMenuGroup, counts: StoryCountsByStakeholder): number {
  const own = group.stakeholders.reduce(
    (sum, s) => sum + (counts.get(s.id) ?? []).reduce((n, e) => n + e.stories.length, 0),
    0,
  )
  return own + group.children.reduce((sum, c) => sum + groupStoryTotal(c, counts), 0)
}

/** The keys of every group in these groups and below them. */
export function groupKeys(groups: SideMenuGroup[]): string[] {
  return groups.flatMap((g) => [g.key, ...groupKeys(g.children)])
}

/** The keys of the groups above the stakeholder, from the root down. These
 * groups are always open (design 3.21). Empty for null or an ID not in the tree. */
export function groupKeysAbove(tree: SideMenuGroup[], id: string | null): string[] {
  if (id === null) return []
  for (const group of tree) {
    if (group.stakeholders.some((s) => s.id === id)) return [group.key]
    const below = groupKeysAbove(group.children, id)
    if (below.length > 0) return [group.key, ...below]
  }
  return []
}

/** The pages with a side menu, and so the meaning of the count (design 3.21).
 * Only the 訴求, 需求 and 解法 tabs of the issue page have a side menu now:
 * #/stakeholders and the stakeholder page have no side bar (decisions 87
 * and 94). */
export const SIDE_MENU_CONTEXTS = [
  'issue-wants',
  'issue-needs',
  'issue-solutions',
] as const

export type SideMenuContext = (typeof SIDE_MENU_CONTEXTS)[number]

/** The count of one stakeholder in one issue. It uses the same functions as
 * the tab views, so the count and the list cannot differ. */
function countIn(
  context: SideMenuContext,
  issue: IssueFile,
  id: string,
  dataBased: boolean,
  special: ReadonlySet<string> | null,
): number {
  switch (context) {
    case 'issue-wants':
      return wantsTabView(issue, id, dataBased, special).wants.length
    case 'issue-needs':
      return needsTabView(issue, id, dataBased, special).shown
    case 'issue-solutions':
      return solutionsTabView(issue, id, dataBased, special).length
  }
}

/** The count next to each stakeholder in the side menu (decision 66): the
 * number of items the main block shows after a click on it, with the same
 * 只看有資料根據 filter. The counts are summed over the issues given; the
 * issue page passes only its own issue. The map has one entry per ID, in
 * the order of ids (0 for an ID with nothing to show). special: the
 * 特別關注 filter of the issue page's tab content (decision 75,
 * specialStakeholderIds), or null. */
export function sideMenuCounts(
  context: SideMenuContext,
  issues: IssueFile[],
  ids: string[],
  dataBased: boolean,
  special: ReadonlySet<string> | null = null,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const id of ids) out.set(id, issues.reduce((sum, issue) => sum + countIn(context, issue, id, dataBased, special), 0))
  return out
}
