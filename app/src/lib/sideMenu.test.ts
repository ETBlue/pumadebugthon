import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import discoveryJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile, Stakeholder } from '@/types'
import { compareIds } from './ids'
import { needsTabView, solutionsTabView } from './issueTabs'
import {
  filteredSideMenuTree, groupKeys, groupKeysAbove, groupStoryTotal, SIDE_MENU_CONTEXTS, sideMenuCounts, sideMenuTree,
  type SideMenuGroup,
} from './sideMenu'
import { specialOptions, specialStakeholderIds } from './stakeholderFilter'
import { issueStakeholders, isListed, storyCountsByStakeholder } from './stakeholders'
import { wantsTabView } from './wantsTab'

const index = indexJson as IndexFile
const trashcans = trashcansJson as IssueFile
const issues = [treesJson, trashcansJson, smokefreeJson, discoveryJson] as IssueFile[]
const issueIds = trashcans.stakeholders.map((s) => s.id)

/** A short view of a group: its key, its own IDs, its count and its children. */
interface Shape {
  key: string
  ids: string[]
  count: number
  children: Shape[]
}
const shape = (g: SideMenuGroup): Shape => ({
  key: g.key,
  ids: g.stakeholders.map((s) => s.id),
  count: g.stakeholderCount,
  children: g.children.map(shape),
})
const keys = (groups: SideMenuGroup[]) => groups.map((g) => g.key)
const find = (groups: SideMenuGroup[], key: string): SideMenuGroup | undefined => {
  for (const g of groups) {
    if (g.key === key) return g
    const inner = find(g.children, key)
    if (inner) return inner
  }
  return undefined
}

describe('sideMenuTree', () => {
  const tree = sideMenuTree(issueIds, index.stakeholders, index.pathLabels)

  it('has two roots, O then I', () => {
    expect(keys(tree)).toEqual(['O', 'I'])
    expect(tree.map((g) => g.root)).toEqual(['O', 'I'])
    expect(tree.map((g) => g.path)).toEqual([null, null])
  })

  it('puts the first levels in FIRST_LEVEL_ORDER', () => {
    // #2 has no 教育機構 (edu) stakeholder, so that level is left out.
    expect(keys(tree[0].children)).toEqual(['O:gov', 'O:soe', 'O:ind', 'O:acd', 'O:ngo', 'O:cmt'])
    expect(keys(tree[1].children)).toEqual(['I:res', 'I:mov', 'I:vis', 'I:wrk'])
  })

  it('builds the levels of 分類路徑 with their names, children in the order of buildTree', () => {
    const taipei = find(tree, 'O:gov-local-taipei')!
    expect(taipei.label).toBe('臺北市')
    expect(shape(taipei)).toEqual({
      key: 'O:gov-local-taipei',
      ids: [],
      count: 5,
      children: [
        {
          key: 'O:gov-local-taipei-epb', ids: ['O04'], count: 2,
          children: [{ key: 'O:gov-local-taipei-epb-cleaning', ids: ['O03'], count: 1, children: [] }],
        },
        { key: 'O:gov-local-taipei-li', ids: ['O05'], count: 1, children: [] },
        {
          key: 'O:gov-local-taipei-pwd', ids: [], count: 1,
          children: [{ key: 'O:gov-local-taipei-pwd-nce', ids: ['O12'], count: 1, children: [] }],
        },
        {
          key: 'O:gov-local-taipei-rdec', ids: [], count: 1,
          children: [{ key: 'O:gov-local-taipei-rdec-1999', ids: ['O13'], count: 1, children: [] }],
        },
      ],
    })
    expect(find(tree, 'O:gov-local-taipei-epb-cleaning')!.label).toBe('清潔隊')
  })

  it('lists the stakeholders of a level in ID order', () => {
    expect(find(tree, 'I:res')!.stakeholders.map((s) => s.id)).toEqual(['I04', 'I05', 'I09', 'I10', 'I24'])
    expect(find(tree, 'I:mov')!.stakeholders.map((s) => s.id)).toEqual(['I01', 'I06', 'I07', 'I23'])
  })

  it('counts the stakeholders of a group and of every level below it', () => {
    expect(tree.map((g) => g.stakeholderCount)).toEqual([12, 15])
    expect(find(tree, 'O:gov')!.stakeholderCount).toBe(5)
    expect(find(tree, 'O:ind')!.stakeholderCount).toBe(3)
  })

  it('is never in count order: 遊客 (2) stays before 工作者 (4)', () => {
    const counts = tree[1].children.map((g) => g.stakeholderCount)
    expect(counts).toEqual([5, 4, 2, 4])
    const byCount = [...tree[1].children].sort((a, b) => b.stakeholderCount - a.stakeholderCount)
    expect(keys(byCount)).not.toEqual(keys(tree[1].children))
  })

  it('leaves out levels with no stakeholder', () => {
    // Only I06 (mov): the O root and every other level are left out.
    const one = sideMenuTree(['I06'], index.stakeholders, index.pathLabels)
    expect(one.map(shape)).toEqual([
      { key: 'I', ids: [], count: 1, children: [{ key: 'I:mov', ids: ['I06'], count: 1, children: [] }] },
    ])
    expect(sideMenuTree([], index.stakeholders, index.pathLabels)).toEqual([])
  })

  it('puts a stakeholder with no path, or an unknown ID, directly under its root, before the levels', () => {
    const extra: Stakeholder[] = [
      ...index.stakeholders,
      { id: 'O98', name: '無路徑', path: null, focus: [], issues: [2], movedTo: null, added: '2026-10-20' },
    ]
    const t = sideMenuTree(['O05', 'O98', 'O99'], extra, index.pathLabels)
    expect(t[0].stakeholders.map((s) => s.id)).toEqual(['O98', 'O99'])
    expect(t[0].stakeholders[1].name).toBe('O99')
    expect(t[0].stakeholderCount).toBe(3)
    expect(keys(t[0].children)).toEqual(['O:gov'])
  })

  it('lists each ID once', () => {
    const t = sideMenuTree(['I06', 'I06'], index.stakeholders, index.pathLabels)
    expect(t[0].stakeholderCount).toBe(1)
  })

  it('works for every listed stakeholder (the tree view of #/stakeholders)', () => {
    const ids = index.stakeholders.filter(isListed).map((s) => s.id)
    const full = sideMenuTree(ids, index.stakeholders, index.pathLabels)
    expect(full.reduce((sum, g) => sum + g.stakeholderCount, 0)).toBe(ids.length)
  })
})

// The tree of the issue's 利害關係人 tab (decision 115).
describe('filteredSideMenuTree', () => {
  const list = issueStakeholders(index.stakeholders, trashcans)
  const allIds = (groups: SideMenuGroup[]): string[] =>
    groups.flatMap((g) => [...g.stakeholders.map((s) => s.id), ...allIds(g.children)])

  it('with no filter, has every stakeholder of the issue, 組織 first, then 個人', () => {
    const tree = filteredSideMenuTree(list, index.pathLabels, { crossIssueOnly: false, focus: [] })
    expect(tree.map((g) => g.key)).toEqual(['O', 'I'])
    expect(allIds(tree).sort(compareIds)).toEqual(list.filter(isListed).map((s) => s.id).sort(compareIds))
  })

  it('keeps only the stakeholders of the picked 特別關注 group', () => {
    const tree = filteredSideMenuTree(list, index.pathLabels, { crossIssueOnly: false, focus: ['高齡'] })
    const ids = allIds(tree)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.length).toBeLessThan(list.length)
    for (const id of ids) expect(list.find((s) => s.id === id)?.focus, id).toContain('高齡')
    // 高齡 is a group of individuals, so the 組織 root is left out.
    expect(tree.map((g) => g.key)).toEqual(['I'])
  })

  it('keeps only the stakeholders in 2 or more issues with 只看跨議題', () => {
    const ids = allIds(filteredSideMenuTree(list, index.pathLabels, { crossIssueOnly: true, focus: [] }))
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(list.find((s) => s.id === id)!.issues.length, id).toBeGreaterThanOrEqual(2)
  })
})

describe('groupStoryTotal and groupKeys', () => {
  const tree = sideMenuTree(issueIds, index.stakeholders, index.pathLabels)
  const counts = storyCountsByStakeholder([trashcans])

  it('sums the stories of a root and all levels below it', () => {
    const total = tree.reduce((sum, g) => sum + groupStoryTotal(g, counts), 0)
    expect(total).toBe(trashcans.stories.length)
  })

  it('lists the key of every group, the roots and all levels', () => {
    const keys = groupKeys(tree)
    expect(keys.slice(0, 1)).toEqual(['O'])
    expect(keys).toContain('I')
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.filter((k) => k.includes(':')).length).toBeGreaterThan(0)
  })
})

describe('groupKeysAbove', () => {
  const tree = sideMenuTree(issueIds, index.stakeholders, index.pathLabels)

  it('gives the groups above a stakeholder, from the root down', () => {
    expect(groupKeysAbove(tree, 'O03')).toEqual([
      'O', 'O:gov', 'O:gov-local', 'O:gov-local-taipei', 'O:gov-local-taipei-epb', 'O:gov-local-taipei-epb-cleaning',
    ])
    expect(groupKeysAbove(tree, 'I06')).toEqual(['I', 'I:mov'])
  })

  it('gives an empty list for null or an ID not in the tree', () => {
    expect(groupKeysAbove(tree, null)).toEqual([])
    expect(groupKeysAbove(tree, 'I14')).toEqual([])
  })
})

describe('sideMenuCounts', () => {
  it('has only the three issue page contexts (decisions 87 and 94)', () => {
    expect(SIDE_MENU_CONTEXTS).toEqual(['issue-wants', 'issue-needs', 'issue-solutions'])
  })

  it('gives one count per ID, for every ID', () => {
    const counts = sideMenuCounts('issue-wants', [trashcans], [...issueIds, 'I99'], false)
    expect([...counts.keys()]).toEqual([...issueIds, 'I99'])
    expect(counts.get('I99')).toBe(0)
  })

  it('I06 on #2: wants W08 and W11, needs N07 and N08, solutions A and C', () => {
    const of = (c: (typeof SIDE_MENU_CONTEXTS)[number]) => sideMenuCounts(c, [trashcans], ['I06'], false).get('I06')
    expect(of('issue-wants')).toBe(2)
    expect(of('issue-needs')).toBe(2)
    expect(of('issue-solutions')).toBe(2)
  })

  // Decision 74: with 只看有資料根據 on, a solution counts for a stakeholder
  // only when one of the stakeholder's needs in it is still shown.
  describe('the 解法 count with 只看有資料根據 (decision 74)', () => {
    it('drops a solution whose needs of the stakeholder are all hidden (#2, I06: 2 to 0)', () => {
      expect(sideMenuCounts('issue-solutions', [trashcans], ['I06'], false).get('I06')).toBe(2)
      expect(sideMenuCounts('issue-solutions', [trashcans], ['I06'], true).get('I06')).toBe(0)
    })

    for (const dataBased of [false, true]) {
      it(`the count equals the 解法 tab in each issue (evidence ${dataBased ? 'on' : 'off'})`, () => {
        for (const issue of issues) {
          const ids = issue.stakeholders.map((s) => s.id)
          const onIssue = sideMenuCounts('issue-solutions', [issue], ids, dataBased)
          for (const id of ids) {
            expect(onIssue.get(id), `#${issue.number} ${id}`).toBe(solutionsTabView(issue, id, dataBased).length)
          }
        }
      })
    }
  })

  // The rule of decision 66: the count is the length of the list that the
  // tab shows after a click on that stakeholder, with the same filter.
  describe('the count equals the length of the list that the tab shows', () => {
    for (const dataBased of [false, true]) {
      it(`on the issue page (#2, evidence ${dataBased ? 'on' : 'off'})`, () => {
        const wants = sideMenuCounts('issue-wants', [trashcans], issueIds, dataBased)
        const needs = sideMenuCounts('issue-needs', [trashcans], issueIds, dataBased)
        const solutions = sideMenuCounts('issue-solutions', [trashcans], issueIds, dataBased)
        for (const id of issueIds) {
          expect(wants.get(id), `wants ${id}`).toBe(wantsTabView(trashcans, id, dataBased).wants.length)
          expect(needs.get(id), `needs ${id}`).toBe(needsTabView(trashcans, id, dataBased).shown)
          expect(solutions.get(id), `solutions ${id}`).toBe(solutionsTabView(trashcans, id, dataBased).length)
        }
      })
    }
  })

  // Decision 75: the same rule with the 特別關注 chips on, on every fixture.
  describe('the count equals the list length with 特別關注 on (issue page)', () => {
    for (const issue of issues) {
      const ids = issue.stakeholders.map((x) => x.id)
      const groups = specialOptions(index.stakeholders.filter((x) => ids.includes(x.id)))
      for (const dataBased of [false, true]) {
        it(`#${issue.number}, evidence ${dataBased ? 'on' : 'off'}, each group`, () => {
          for (const group of groups) {
            const special = specialStakeholderIds(ids, index.stakeholders, [group])
            const wants = sideMenuCounts('issue-wants', [issue], ids, dataBased, special)
            const needs = sideMenuCounts('issue-needs', [issue], ids, dataBased, special)
            const solutions = sideMenuCounts('issue-solutions', [issue], ids, dataBased, special)
            for (const id of ids) {
              expect(wants.get(id), `${group} wants ${id}`).toBe(wantsTabView(issue, id, dataBased, special).wants.length)
              expect(needs.get(id), `${group} needs ${id}`).toBe(needsTabView(issue, id, dataBased, special).shown)
              expect(solutions.get(id), `${group} solutions ${id}`).toBe(solutionsTabView(issue, id, dataBased, special).length)
            }
          }
        })
      }
    }

    it('特別關注 changes some counts (so the test above checks something)', () => {
      const ids = trashcans.stakeholders.map((x) => x.id)
      const special = specialStakeholderIds(ids, index.stakeholders, ['外籍'])
      const off = sideMenuCounts('issue-needs', [trashcans], ids, false)
      const on = sideMenuCounts('issue-needs', [trashcans], ids, false, special)
      expect(ids.some((id) => off.get(id) !== on.get(id))).toBe(true)
    })
  })

  it('the data filter changes some counts (so the test above checks something)', () => {
    const changed = (context: (typeof SIDE_MENU_CONTEXTS)[number], list: IssueFile[], idList: string[]) => {
      const off = sideMenuCounts(context, list, idList, false)
      const on = sideMenuCounts(context, list, idList, true)
      return idList.some((id) => off.get(id) !== on.get(id))
    }
    expect(changed('issue-wants', [trashcans], issueIds)).toBe(true)
    expect(changed('issue-needs', [trashcans], issueIds)).toBe(true)
  })

  it('keeps the order of the IDs it gets (it never sorts by a count)', () => {
    const ids = [...issueIds].sort(compareIds).reverse()
    expect([...sideMenuCounts('issue-wants', [trashcans], ids, false).keys()]).toEqual(ids)
  })
})
