// Stakeholder lookups (design 3.1 and 3.3).
// Order is always by path, then by ID. Nothing here sorts by a count.
import type { IssueFile, Stakeholder, Story } from '@/types'
import { compareIds } from './ids'
import { priorityCounts, type TagPriorityCounts } from './priority'

/** The stories of one stakeholder in one issue. */
export interface StakeholderIssueStories {
  issueNumber: number
  stories: Story[]
  counts: TagPriorityCounts[]
}

/** Stakeholder ID -> one entry per issue, in issue number order. */
export type StoryCountsByStakeholder = Map<string, StakeholderIssueStories[]>

export interface TreeNode {
  /** 分類路徑 prefix, for example "gov-local-taipei". */
  path: string
  /** Name from pathLabels. The last code of the path when there is no name. */
  label: string
  children: TreeNode[]
  /** Stakeholders whose path is exactly this node's path, in ID order. */
  stakeholders: Stakeholder[]
  /** Number of stories of all stakeholders under this node. */
  storyTotal: number
}

export interface StakeholderTree {
  /** O stakeholders: a tree by path prefix. */
  organizations: TreeNode[]
  /** I stakeholders: one node per first path level, without children. */
  individuals: TreeNode[]
}

export interface StakeholderFilter {
  /** Keep only stakeholders in 2 or more issues. */
  crossIssueOnly: boolean
  /** Keep only stakeholders that have at least one of these 特別關注 values.
   * An empty list keeps all. */
  focus: string[]
}

/** Per stakeholder, per issue: the stories and their priority counts. A
 * stakeholder listed in an issue's step 1 gets an entry even with no stories. */
export function storyCountsByStakeholder(issues: IssueFile[]): StoryCountsByStakeholder {
  const result: StoryCountsByStakeholder = new Map()
  const sorted = [...issues].sort((a, b) => a.number - b.number)
  for (const issue of sorted) {
    const ids = new Set([...issue.stakeholders.map((s) => s.id), ...issue.stories.map((s) => s.stakeholder)])
    for (const id of ids) {
      const stories = issue.stories.filter((s) => s.stakeholder === id)
      const entry = { issueNumber: issue.number, stories, counts: priorityCounts(stories) }
      const list = result.get(id)
      if (list) list.push(entry)
      else result.set(id, [entry])
    }
  }
  return result
}

function storyTotalOf(counts: StoryCountsByStakeholder, id: string): number {
  return (counts.get(id) ?? []).reduce((sum, e) => sum + e.stories.length, 0)
}

/** Order of the first path levels (design 5.2). Unknown first levels go
 * after these, by code. Deeper levels are in code order. */
export const FIRST_LEVEL_ORDER = {
  organizations: ['gov', 'soe', 'ind', 'acd', 'ngo', 'cmt'],
  individuals: ['res', 'mov', 'vis', 'wrk'],
} as const

const byPath = (a: TreeNode, b: TreeNode) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)

function byFirstLevel(order: readonly string[]) {
  const rank = (p: string) => (order.includes(p) ? order.indexOf(p) : order.length)
  return (a: TreeNode, b: TreeNode) => rank(a.path) - rank(b.path) || byPath(a, b)
}

function finish(node: TreeNode, counts: StoryCountsByStakeholder): number {
  node.children.sort(byPath)
  node.stakeholders.sort((a, b) => compareIds(a.id, b.id))
  const own = node.stakeholders.reduce((sum, s) => sum + storyTotalOf(counts, s.id), 0)
  node.storyTotal = own + node.children.reduce((sum, c) => sum + finish(c, counts), 0)
  return node.storyTotal
}

/** The stakeholder list as a tree (design 3.1). First levels are in the order
 * of FIRST_LEVEL_ORDER, deeper levels by path, stakeholders by ID. Moved IDs
 * and stakeholders without a path are left out. Story totals come from counts: pass the
 * result of storyCountsByStakeholder for the issues to count. */
export function buildTree(
  stakeholders: Stakeholder[],
  pathLabels: Record<string, string>,
  counts: StoryCountsByStakeholder,
): StakeholderTree {
  const nodes = new Map<string, TreeNode>()
  const roots = { O: [] as TreeNode[], I: [] as TreeNode[] }

  function node(path: string, group: 'O' | 'I'): TreeNode {
    let n = nodes.get(`${group}:${path}`)
    if (n) return n
    const cut = path.lastIndexOf('-')
    n = { path, label: pathLabels[path] ?? path.slice(cut + 1), children: [], stakeholders: [], storyTotal: 0 }
    nodes.set(`${group}:${path}`, n)
    if (cut < 0) roots[group].push(n)
    else node(path.slice(0, cut), group).children.push(n)
    return n
  }

  for (const s of stakeholders) {
    if (s.movedTo !== null || s.path === null) continue
    if (s.id.startsWith('O')) node(s.path, 'O').stakeholders.push(s)
    else node(s.path.split('-')[0], 'I').stakeholders.push(s)
  }

  roots.O.sort(byFirstLevel(FIRST_LEVEL_ORDER.organizations))
  roots.I.sort(byFirstLevel(FIRST_LEVEL_ORDER.individuals))
  for (const n of [...roots.O, ...roots.I]) finish(n, counts)
  return { organizations: roots.O, individuals: roots.I }
}

/** The stories of a stakeholder in an issue that no solution lists. */
export function storiesWithoutSolution(issue: IssueFile, stakeholderId: string): Story[] {
  const covered = new Set(issue.solutions.flatMap((sol) => sol.stories))
  return issue.stories.filter((s) => s.stakeholder === stakeholderId && !covered.has(s.id))
}

/** The ID to show for id: the new ID for a moved ID (following each move),
 * the same ID for an active one, null for an unknown ID or a loop. */
export function resolveId(stakeholders: Stakeholder[], id: string): string | null {
  const byId = new Map(stakeholders.map((s) => [s.id, s]))
  const seen = new Set<string>()
  let current = byId.get(id)
  while (current) {
    if (current.movedTo === null) return current.id
    if (seen.has(current.id)) return null
    seen.add(current.id)
    current = byId.get(current.movedTo)
  }
  return null
}

/** The active stakeholders that pass the filter, in the order of the input
 * list. Moved IDs are always left out. */
export function filterStakeholders(list: Stakeholder[], filter: StakeholderFilter): Stakeholder[] {
  return list.filter(
    (s) =>
      s.movedTo === null &&
      (!filter.crossIssueOnly || s.issues.length >= 2) &&
      (filter.focus.length === 0 || filter.focus.some((f) => s.focus.includes(f))),
  )
}
