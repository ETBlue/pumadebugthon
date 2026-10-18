import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import type { IndexFile, IssueFile, Stakeholder } from '@/types'
import {
  alsoInIssues, buildTree, FIRST_LEVEL_ORDER, filterStakeholders, issueStakeholders, resolveId, stakeholderName, storiesWithoutSolution, storyCountsByStakeholder, type TreeNode,
} from './stakeholders'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const counts = storyCountsByStakeholder([trees, trashcans])

function find(nodes: TreeNode[], path: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.path === path) return n
    const m = find(n.children, path)
    if (m) return m
  }
  return undefined
}

function storiesOf(id: string) {
  return (counts.get(id) ?? []).reduce((sum, e) => sum + e.stories.length, 0)
}

function allIds(nodes: TreeNode[]): string[] {
  return nodes.flatMap((n) => [...n.stakeholders.map((s) => s.id), ...allIds(n.children)])
}

describe('storyCountsByStakeholder', () => {
  it('gives I06 an entry for issue 1 and issue 2, with stories and priority counts', () => {
    const i06 = counts.get('I06')!
    expect(i06.map((e) => e.issueNumber)).toEqual([1, 2])
    expect(i06[0].stories.map((s) => s.id)).toEqual(['I06-US01', 'I06-US02'])
    expect(i06[0].counts).toEqual([{ tag: 'AI模擬', counts: [{ priority: 'M', n: 2 }] }])
    expect(i06[1].counts).toEqual([{ tag: 'AI模擬', counts: [{ priority: 'M', n: 1 }, { priority: 'S', n: 1 }] }])
  })

  it('orders issues by number, whatever the input order', () => {
    expect(storyCountsByStakeholder([trashcans, trees]).get('I06')!.map((e) => e.issueNumber)).toEqual([1, 2])
  })

  it('has one entry per issue only for issues the stakeholder is in', () => {
    expect(counts.get('O03')!.map((e) => e.issueNumber)).toEqual([2])
    expect(counts.get('O02')).toBeUndefined()
  })

  it('total stories match the issue files', () => {
    const total = [...counts.values()].flat().reduce((sum, e) => sum + e.stories.length, 0)
    expect(total).toBe(trees.stories.length + trashcans.stories.length)
  })
})

describe('buildTree', () => {
  const tree = buildTree(index.stakeholders, index.pathLabels, counts)

  it('builds the O tree by path prefix, with labels', () => {
    const taipei = find(tree.organizations, 'gov-local-taipei')!
    expect(taipei.label).toBe('臺北市')
    expect(find(tree.organizations, 'gov')!.children.map((c) => c.path)).toEqual(['gov-local'])
    const epb = find(tree.organizations, 'gov-local-taipei-epb')!
    expect(epb.stakeholders.map((s) => s.id)).toEqual(['O04'])
    expect(epb.children.map((c) => [c.path, c.label])).toEqual([['gov-local-taipei-epb-cleaning', '清潔隊']])
  })

  it('orders nodes by path and stakeholders by ID', () => {
    expect(tree.organizations.map((n) => n.path)).toEqual(['gov', 'soe', 'ind', 'acd', 'edu', 'ngo', 'cmt'])
    expect(find(tree.organizations, 'gov-local-taipei')!.children.map((c) => c.path)).toEqual([
      'gov-local-taipei-doh', 'gov-local-taipei-epb', 'gov-local-taipei-li', 'gov-local-taipei-pwd', 'gov-local-taipei-rdec',
      'gov-local-taipei-udd',
    ])
    expect(find(tree.organizations, 'ngo-environment')!.stakeholders.map((s) => s.id)).toEqual(['O08', 'O17'])
  })

  it('uses the first-level order of FIRST_LEVEL_ORDER; unknown first levels go last, by code', () => {
    expect(FIRST_LEVEL_ORDER).toEqual({
      organizations: ['gov', 'soe', 'ind', 'acd', 'edu', 'ngo', 'cmt'],
      individuals: ['res', 'mov', 'vis', 'wrk'],
    })
    const base = { name: '', focus: [], issues: [1], movedTo: null }
    const list: Stakeholder[] = [
      { ...base, id: 'O01', path: 'zzz' },
      { ...base, id: 'O02', path: 'aaa' },
      { ...base, id: 'O03', path: 'cmt' },
      { ...base, id: 'O04', path: 'gov' },
      { ...base, id: 'I01', path: 'abc' },
      { ...base, id: 'I02', path: 'wrk' },
      { ...base, id: 'I03', path: 'res' },
    ]
    const t = buildTree(list, {}, new Map())
    expect(t.organizations.map((n) => n.path)).toEqual(['gov', 'cmt', 'aaa', 'zzz'])
    expect(t.individuals.map((n) => n.path)).toEqual(['res', 'wrk', 'abc'])
  })

  it('groups I stakeholders by the first level only', () => {
    expect(tree.individuals.map((n) => [n.path, n.label])).toEqual([
      ['res', '居民'], ['mov', '用路人'], ['vis', '遊客'], ['wrk', '工作者'],
    ])
    for (const n of tree.individuals) expect(n.children).toEqual([])
    expect(tree.individuals.find((n) => n.path === 'wrk')!.stakeholders.map((s) => s.id)).toEqual([
      'I08', 'I11', 'I12', 'I13', 'I15', 'I28',
    ])
  })

  it('leaves out moved IDs and lists every other stakeholder once', () => {
    const ids = [...allIds(tree.organizations), ...allIds(tree.individuals)]
    expect(ids).not.toContain('O02')
    expect(ids.sort()).toEqual(index.stakeholders.filter((s) => s.movedTo === null).map((s) => s.id).sort())
  })

  it('the 臺北市 storyTotal is the sum of its children and its own stakeholders', () => {
    const taipei = find(tree.organizations, 'gov-local-taipei')!
    const own = taipei.stakeholders.reduce((sum, s) => sum + storiesOf(s.id), 0)
    const kids = taipei.children.reduce((sum, c) => sum + c.storyTotal, 0)
    expect(taipei.storyTotal).toBe(own + kids)
    // O03 2, O04 5, O05 1 + 2, O12 1 + 2, O13 1 + 1, O14 6, O21 1
    expect(taipei.storyTotal).toBe(22)
  })

  it('the story totals of all roots add up to all stories', () => {
    const roots = [...tree.organizations, ...tree.individuals]
    expect(roots.reduce((sum, n) => sum + n.storyTotal, 0)).toBe(trees.stories.length + trashcans.stories.length)
  })

  it('a stakeholder without stories adds 0', () => {
    const t = buildTree(index.stakeholders, index.pathLabels, new Map())
    expect(find(t.organizations, 'gov-local-taipei')!.storyTotal).toBe(0)
  })

  it('the order does not depend on story counts', () => {
    // Give the last stakeholders the most stories. The order must not change.
    const fake = new Map(
      index.stakeholders.map((s, i) => [s.id, [{ issueNumber: 2, stories: Array(i * 3).fill(trashcans.stories[0]), counts: [] }]]),
    )
    const t = buildTree(index.stakeholders, index.pathLabels, fake)
    const order = (x: typeof tree) => [...allIds(x.organizations), ...allIds(x.individuals)]
    expect(order(t)).toEqual(order(tree))
    expect(t.individuals.map((n) => n.path)).toEqual(tree.individuals.map((n) => n.path))
    expect(t.organizations.map((n) => n.path)).toEqual(tree.organizations.map((n) => n.path))
  })

  it('does not depend on the order of the input list', () => {
    const t = buildTree([...index.stakeholders].reverse(), index.pathLabels, counts)
    expect(t).toEqual(tree)
  })
})

describe('storiesWithoutSolution', () => {
  it('returns [] for a stakeholder whose stories are all covered', () => {
    expect(storiesWithoutSolution(trashcans, 'I06')).toEqual([])
  })

  it('returns the stories that no solution covers', () => {
    expect(storiesWithoutSolution(trashcans, 'O09').map((s) => s.id)).toEqual(['O09-US01'])
  })

  it('returns [] for a stakeholder that is not in the issue', () => {
    expect(storiesWithoutSolution(trashcans, 'O21')).toEqual([])
  })
})

describe('resolveId', () => {
  it('sends a moved ID to the new ID', () => {
    expect(resolveId(index.stakeholders, 'O02')).toBe('I12')
  })

  it('keeps an active ID', () => {
    expect(resolveId(index.stakeholders, 'I06')).toBe('I06')
  })

  it('returns null for an unknown ID', () => {
    expect(resolveId(index.stakeholders, 'X99')).toBeNull()
    expect(resolveId(index.stakeholders, 'O99')).toBeNull()
  })

  it('follows a chain of moves and stops on a loop', () => {
    const base = { name: '', path: null, focus: [], issues: [] }
    const list: Stakeholder[] = [
      { ...base, id: 'O01', movedTo: 'O02' },
      { ...base, id: 'O02', movedTo: 'I01' },
      { ...base, id: 'I01', path: 'res', issues: [1], movedTo: null },
      { ...base, id: 'O03', movedTo: 'O04' },
      { ...base, id: 'O04', movedTo: 'O03' },
      { ...base, id: 'O05', movedTo: 'O99' },
    ]
    expect(resolveId(list, 'O01')).toBe('I01')
    expect(resolveId(list, 'O03')).toBeNull()
    expect(resolveId(list, 'O05')).toBeNull()
  })
})

describe('filterStakeholders', () => {
  const list = index.stakeholders

  it('returns every active stakeholder with no filter on; moved IDs are left out', () => {
    const all = filterStakeholders(list, { crossIssueOnly: false, focus: [] })
    expect(all.map((s) => s.id)).not.toContain('O02')
    expect(all).toEqual(list.filter((s) => s.id !== 'O02'))
  })

  it('leaves out a moved ID even when it matches the other filters', () => {
    const moved: Stakeholder = { id: 'O99', name: '', path: null, focus: ['高齡'], issues: [1, 2], movedTo: 'I05' }
    expect(filterStakeholders([moved], { crossIssueOnly: true, focus: ['高齡'] })).toEqual([])
  })

  it('crossIssueOnly keeps only stakeholders with 2 or more issues', () => {
    const ids = filterStakeholders(list, { crossIssueOnly: true, focus: [] }).map((s) => s.id)
    expect(ids).toEqual(['O01', 'O03', 'O04', 'O05', 'O06', 'O07', 'O12', 'O13', 'I01', 'I03', 'I05', 'I06', 'I07', 'I13', 'I17', 'I19'])
    expect(ids).not.toContain('O02')
  })

  it('focus keeps stakeholders that have any selected focus tag', () => {
    expect(filterStakeholders(list, { crossIssueOnly: false, focus: ['高齡'] }).map((s) => s.id)).toEqual(['I05', 'I11'])
    expect(filterStakeholders(list, { crossIssueOnly: false, focus: ['高齡', '身心障礙'] }).map((s) => s.id)).toEqual([
      'I05', 'I06', 'I11',
    ])
    expect(filterStakeholders(list, { crossIssueOnly: false, focus: ['經濟弱勢'] }).map((s) => s.id)).toEqual(['I11', 'I19'])
  })

  it('both filters together', () => {
    expect(filterStakeholders(list, { crossIssueOnly: true, focus: ['高齡'] }).map((s) => s.id)).toEqual(['I05'])
  })
})

describe('issueStakeholders', () => {
  it('returns the stakeholders of the issue from the shared list, in the order of the shared list', () => {
    const list = issueStakeholders(index.stakeholders, trashcans)
    expect(list.map((s) => s.id).sort()).toEqual(trashcans.stakeholders.map((s) => s.id).sort())
    const order = index.stakeholders.map((s) => s.id).filter((id) => list.some((s) => s.id === id))
    expect(list.map((s) => s.id)).toEqual(order)
  })

  it('leaves out the moved ID O02 and the stakeholders of other issues', () => {
    const ids = issueStakeholders(index.stakeholders, trashcans).map((s) => s.id)
    expect(ids).not.toContain('O02')
    const onlyTrees = index.stakeholders.filter((s) => s.issues.length === 1 && s.issues[0] === 1)
    expect(onlyTrees.length).toBeGreaterThan(0)
    for (const s of onlyTrees) expect(ids).not.toContain(s.id)
  })
})

describe('stakeholderName', () => {
  it('returns the name, or the ID for an unknown ID', () => {
    expect(stakeholderName(index.stakeholders, 'I06')).toBe('身心障礙者（視障、輪椅使用者）')
    expect(stakeholderName(index.stakeholders, 'X99')).toBe('X99')
  })
})

describe('alsoInIssues', () => {
  it('I06 in #2 also appears in #1', () => {
    expect(alsoInIssues(index.stakeholders, 'I06', 2, [1, 2])).toEqual([1])
    expect(alsoInIssues(index.stakeholders, 'I06', 1, [1, 2])).toEqual([2])
  })

  it('leaves out issues that are not available', () => {
    expect(alsoInIssues(index.stakeholders, 'I06', 2, [2])).toEqual([])
  })

  it('returns [] for a stakeholder in one issue only, and for an unknown ID', () => {
    const only2 = index.stakeholders.find((s) => s.movedTo === null && s.issues.length === 1 && s.issues[0] === 2)!
    expect(alsoInIssues(index.stakeholders, only2.id, 2, [1, 2])).toEqual([])
    expect(alsoInIssues(index.stakeholders, 'X99', 2, [1, 2])).toEqual([])
  })

  it('returns issue numbers in order', () => {
    const s: Stakeholder = { id: 'I50', name: '', path: 'res', focus: [], issues: [5, 2, 1], movedTo: null }
    expect(alsoInIssues([s], 'I50', 2, [1, 2, 5])).toEqual([1, 5])
  })
})
