// Checks the fixtures (copies of build_json.py output) against src/types.ts.
// The type casts below only check that the shapes overlap. These tests check
// the values at runtime.
// Refresh the fixtures with: npm run fixtures
import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import type { Cell, IndexFile, IssueFile } from '@/types'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const issues = [trees, trashcans, smokefree]

const TAGS = ['實證', 'AI整理', 'AI模擬', null]
const PRIORITIES = ['M', 'S', 'C', 'W']

function expectCell(c: Cell) {
  expect(typeof c.text).toBe('string')
  expect(TAGS).toContain(c.tag)
  expect(typeof c.pending).toBe('boolean')
  // Only a cell with no tag can be 【待補】.
  if (c.pending) expect(c.tag).toBeNull()
}

describe('index.json', () => {
  it('has the 6 host issues and #8; #1, #2 and #8 are available', () => {
    // #7 (自由題) has no topic, so it is not listed.
    expect(index.issues.map((i) => i.number)).toEqual([1, 2, 3, 4, 5, 6, 8])
    expect(index.issues.filter((i) => i.available).map((i) => i.number)).toEqual([1, 2, 8])
  })

  it('has the source of each issue: #8 was added by a participant', () => {
    expect(index.issues.map((i) => [i.number, i.source])).toEqual([
      [1, '主辦單位'], [2, '主辦單位'], [3, '主辦單位'], [4, '主辦單位'], [5, '主辦單位'], [6, '主辦單位'], [8, '參加者補充'],
    ])
  })

  it('has no counts, spaces or date for unavailable issues', () => {
    for (const i of index.issues.filter((i) => !i.available)) {
      expect(i.counts).toBeNull()
      expect(i.spaces).toEqual([])
      expect(i.updated).toBeNull()
    }
  })

  it('has the counts of #2', () => {
    const i = index.issues.find((i) => i.number === 2)
    expect(i?.counts).toEqual({
      stakeholdersO: 12, stakeholdersI: 15, stories: 51, conflicts: 8, solutions: 5, wantsEvidence: 6, wantsAiSummary: 11,
    })
  })

  it('counts match the issue files', () => {
    for (const issue of issues) {
      const s = index.issues.find((i) => i.number === issue.number)
      expect(s?.available).toBe(true)
      if (!s?.available) continue
      expect(s.counts.stories).toBe(issue.stories.length)
      expect(s.counts.conflicts).toBe(issue.conflicts.length)
      expect(s.counts.solutions).toBe(issue.solutions.length)
      expect(s.counts.stakeholdersO + s.counts.stakeholdersI).toBe(issue.stakeholders.length)
      expect(s.spaces).toEqual(issue.spaces)
    }
  })

  it('marks moved IDs: O02 moved to I12, I12 is active', () => {
    const o02 = index.stakeholders.find((s) => s.id === 'O02')
    const i12 = index.stakeholders.find((s) => s.id === 'I12')
    expect(o02).toMatchObject({ movedTo: 'I12', issues: [], path: null })
    expect(i12?.movedTo).toBeNull()
    expect(i12?.issues).toContain(2)
  })

  it('has an added date (YYYY-MM-DD) for every stakeholder', () => {
    for (const s of index.stakeholders) expect(s.added, s.id).toMatch(/^\d{4}-\d\d-\d\d$/)
  })

  it('has the open datasets of #1, #2 and #8 with known issue numbers', () => {
    expect(index.openData.length).toBeGreaterThan(0)
    const numbers = index.issues.map((i) => i.number)
    for (const d of index.openData) {
      expect(d.url).toMatch(/^https:\/\/data\.(gov\.tw|taipei)\//)
      expect(d.name && d.agency && d.license).toBeTruthy()
      expect(d.issues.length).toBeGreaterThan(0)
      for (const n of d.issues) expect(numbers).toContain(n)
    }
    expect(new Set(index.openData.flatMap((d) => d.issues))).toEqual(new Set([1, 2, 8]))
  })

  it('has a label for every path prefix, and known space codes', () => {
    for (const s of index.stakeholders) {
      if (s.path === null) continue
      const parts = s.path.split('-')
      for (let n = 1; n <= parts.length; n++) {
        expect(index.pathLabels, s.id).toHaveProperty([parts.slice(0, n).join('-')])
      }
    }
    const codes = index.spaceTypes.map((t) => t.code)
    expect(codes).toContain('sidewalk')
    for (const i of index.issues) for (const c of i.spaces) expect(codes).toContain(c)
  })
})

describe('issue files', () => {
  it('have the known counts', () => {
    expect(trashcans.stories).toHaveLength(51)
    expect(trashcans.conflicts).toHaveLength(8)
    expect(trashcans.solutions).toHaveLength(5)
    expect(trashcans.groups).toHaveLength(11)
    expect(trees.stories).toHaveLength(65)
  })

  it('C6 of #2 has I01-US01 on one side and I06-US01 on the other', () => {
    const c6 = trashcans.conflicts.find((c) => c.id === 'C6')
    expect(c6?.sideA).toContain('I01-US01')
    expect(c6?.sideB).toEqual(expect.arrayContaining(['I06-US01', 'I07-US02', 'O12-US01']))
  })

  for (const issue of issues) {
    describe(`#${issue.number} ${issue.folder}`, () => {
      const stakeholderIds = new Set(issue.stakeholders.map((s) => s.id))
      const storyIds = new Set(issue.stories.map((s) => s.id))
      const groupIds = new Set(issue.groups.map((g) => g.id))
      const activeIds = new Set(index.stakeholders.filter((s) => s.movedTo === null).map((s) => s.id))

      it('lists only active stakeholders that list this issue', () => {
        for (const s of issue.stakeholders) {
          expect(activeIds.has(s.id), s.id).toBe(true)
          expect(index.stakeholders.find((x) => x.id === s.id)?.issues).toContain(issue.number)
          expectCell(s.relation)
        }
      })

      it("every story's stakeholder is in the issue's stakeholders", () => {
        for (const s of issue.stories) {
          expect(stakeholderIds.has(s.stakeholder), s.id).toBe(true)
          expect(s.id.startsWith(`${s.stakeholder}-`)).toBe(true)
        }
      })

      it('stories have valid cells, priorities and groups', () => {
        for (const s of issue.stories) {
          expectCell(s.want)
          expectCell(s.soThat)
          expect(PRIORITIES).toContain(s.priority)
          expect(['實證', 'AI整理', 'AI模擬']).toContain(s.priorityTag)
          if (s.group !== null) expect(groupIds.has(s.group), s.id).toBe(true)
        }
      })

      it('groups, conflicts and solutions refer to stories of this issue', () => {
        for (const g of issue.groups) for (const id of g.stories) expect(storyIds.has(id), g.id).toBe(true)
        for (const c of issue.conflicts) {
          expect(c.sideA.length).toBeGreaterThan(0)
          expect(c.sideB.length).toBeGreaterThan(0)
          for (const id of [...c.sideA, ...c.sideB]) expect(storyIds.has(id), c.id).toBe(true)
          expectCell(c.text)
          expectCell(c.method)
          expectCell(c.result)
        }
        for (const sol of issue.solutions) {
          for (const id of sol.stories) expect(storyIds.has(id), sol.id).toBe(true)
          for (const code of sol.spaces) expect(issue.spaces).toContain(code)
          expect(sol.added, sol.id).toMatch(/^\d{4}-\d\d-\d\d$/)
          expectCell(sol.name)
        }
      })

      it('input sources list stakeholders of this issue', () => {
        for (const src of issue.inputSources) {
          for (const id of src.stakeholders) expect(stakeholderIds.has(id), src.source).toBe(true)
          expectCell(src.fit)
        }
      })

      it('every pending item has section and text', () => {
        expect(issue.pending.length).toBeGreaterThan(0)
        for (const p of issue.pending) {
          expect(typeof p.section).toBe('string')
          expect(p.text).toMatch(/^【待補[^】]*】$/)
          expect(p.context === null || typeof p.context === 'string').toBe(true)
        }
      })
    })
  }
})
