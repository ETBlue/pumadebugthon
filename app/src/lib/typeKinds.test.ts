// The generic type helpers for the three kinds of type: space (空間類型),
// domain (領域) and solution type (解法類型).
import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import treesJson from '@/test/fixtures/issues/1-trees.json'
import trashcansJson from '@/test/fixtures/issues/2-trashcans.json'
import smokefreeJson from '@/test/fixtures/issues/8-smokefree.json'
import policyJson from '@/test/fixtures/issues/9-policydiscovery.json'
import type { IndexFile, IssueFile } from '@/types'
import { compareIds } from './ids'
import { availableIssues } from './issues'
import {
  findType, hasTagCodes, issueCodes, issuesByType, solutionTagCodes, otherTypes, sameTypeIssues, solutionCodes, solutionsByType, stakeholdersByType,
  issueListsSolutionCodes, issueTypeOptions, issueUsedCodes, TYPE_KINDS, TYPE_LIST_PAGES, typeGroupNames, typeGroups, typeIssues, typesOf, type TypeKind,
} from './typeKinds'

const index = indexJson as IndexFile
const trees = treesJson as IssueFile
const trashcans = trashcansJson as IssueFile
const smokefree = smokefreeJson as IssueFile
const policy = policyJson as IssueFile
/** Not in number order on purpose: the helpers must sort. */
const files = [policy, smokefree, trashcans, trees]

/** A changed copy of index.json: #2 S1 has the own 領域 police, so #2
 * uses police (usedDomains). No fixture solution has an own 領域. */
const ownIndex: IndexFile = {
  ...index,
  issues: index.issues.map((i) => (i.number === 2 && i.available ? { ...i, usedDomains: [...i.usedDomains, 'police'] } : i)),
}

const pairs = (list: { issueNumber: number; solution: { id: string } }[]) =>
  list.map((x) => `#${x.issueNumber} ${x.solution.id}`)
const numbers = (kind: TypeKind, code: string) => issuesByType(kind, index, files, code).map((i) => i.number)

/** A level 1 code of each kind. A solution type has one level only, so it
 * uses the code of a level 1 domain, which is not a solution type. */
const LEVEL_1: Record<TypeKind, string> = { space: 'road', domain: 'general-affairs', solutionType: 'general-affairs' }

describe('typesOf and findType', () => {
  it('gives the list of each kind, in file order', () => {
    expect(typesOf('space', index)).toBe(index.spaceTypes)
    expect(typesOf('domain', index)).toBe(index.domainTypes)
    expect(typesOf('solutionType', index)).toBe(index.solutionTypes)
    expect(typesOf('domain', index)).toHaveLength(28)
    expect(typesOf('solutionType', index).map((t) => t.code).slice(0, 3)).toEqual(['digital-tool', 'open-data', 'outreach'])
  })

  it('finds a level 2 code of each kind', () => {
    expect(findType('space', index, 'sidewalk-furniture')?.name).toBe('人行道設施帶')
    expect(findType('domain', index, 'environment')?.name).toBe(
      index.domainTypes.find((d) => d.code === 'environment')!.name,
    )
    expect(findType('solutionType', index, 'open-data')?.name).toBe('資料公開')
  })

  it('returns null for a level 1 code and an unknown code', () => {
    for (const kind of TYPE_KINDS) {
      expect(findType(kind, index, LEVEL_1[kind])).toBeNull()
      expect(findType(kind, index, 'nope')).toBeNull()
    }
  })
})

describe('solutionCodes and issueCodes', () => {
  it('reads the codes of a solution for each kind', () => {
    const s = trashcans.solutions[0]
    expect(solutionCodes('space', s)).toBe(s.spaces)
    expect(solutionCodes('domain', s)).toEqual(['environment'])
    expect(solutionCodes('solutionType', s)).toEqual(['digital-tool', 'planning'])
  })

  it('an issue uses a solution type when one of its solutions has it: in solution order, each code once', () => {
    const issue2 = availableIssues(index).find((i) => i.number === 2)!
    expect(issueCodes('solutionType', issue2, files)).toEqual([
      'digital-tool', 'planning', 'intake', 'open-data', 'participation', 'facility', 'service',
    ])
    expect(issueCodes('space', issue2, files)).toEqual(issue2.spaces)
    expect(issueCodes('domain', issue2, files)).toEqual(['environment'])
  })

  it('has no solution types for an issue whose file is not loaded', () => {
    const issue2 = availableIssues(index).find((i) => i.number === 2)!
    expect(issueCodes('solutionType', issue2, [trees])).toEqual([])
  })
})

describe('issuesByType', () => {
  it('domain: by the issue 領域, in number order', () => {
    expect(numbers('domain', 'environment')).toEqual([1, 2, 8])
    expect(numbers('domain', 'health')).toEqual([8])
    expect(numbers('domain', 'administration')).toEqual([9])
  })

  it('solution type: the issues with a solution of the type, in number order', () => {
    expect(numbers('solutionType', 'participation')).toEqual([1, 2, 8, 9])
    expect(numbers('solutionType', 'digital-tool')).toEqual([1, 2])
    expect(numbers('solutionType', 'enforcement')).toEqual([8])
  })

  it('space: the same as before', () => {
    expect(numbers('space', 'arcade')).toEqual([2, 8])
  })

  it('an unused, level 1 or unknown code gives no issue', () => {
    expect(numbers('domain', 'police')).toEqual([])
    expect(numbers('solutionType', 'subsidy')).toEqual([])
    for (const kind of TYPE_KINDS) {
      expect(numbers(kind, LEVEL_1[kind])).toEqual([])
      expect(numbers(kind, 'nope')).toEqual([])
    }
  })
})

describe('solutionsByType', () => {
  it('domain: by issue number, then solution order', () => {
    expect(pairs(solutionsByType('domain', files, 'health'))).toEqual(['#8 S1', '#8 S2', '#8 S3', '#8 S4', '#8 S5'])
    expect(pairs(solutionsByType('domain', files, 'administration'))).toEqual(['#9 S1', '#9 S2', '#9 S3', '#9 S4', '#9 S5'])
  })

  it('solution type: only the solutions that have it', () => {
    expect(pairs(solutionsByType('solutionType', files, 'digital-tool'))).toEqual(['#1 S1', '#2 S1', '#2 S2', '#2 S3'])
    expect(pairs(solutionsByType('solutionType', files, 'open-data'))).toEqual(['#1 S2', '#2 S3', '#8 S3', '#9 S4'])
  })

  it('a level 1 or unknown code gives no solution', () => {
    for (const kind of TYPE_KINDS) {
      expect(solutionsByType(kind, files, LEVEL_1[kind])).toEqual([])
      expect(solutionsByType(kind, files, 'nope')).toEqual([])
    }
  })
})

describe('stakeholdersByType', () => {
  it('domain health: only #8, in ID order', () => {
    const list = stakeholdersByType('domain', files, 'health')
    expect(list.map((x) => x.issueNumber)).toEqual([8])
    expect([...list[0].stakeholders].sort(compareIds)).toEqual(list[0].stakeholders)
    expect(list[0].stakeholders.length).toBeGreaterThan(0)
  })

  it('solution type enforcement: the stakeholders of the stories of #8 S4', () => {
    const list = stakeholdersByType('solutionType', files, 'enforcement')
    const s4 = smokefree.solutions.find((s) => s.id === 'S4')!
    const expected = [...new Set(smokefree.stories.filter((s) => s4.stories.includes(s.id)).map((s) => s.stakeholder))]
      .sort(compareIds)
    expect(list).toEqual([{ issueNumber: 8, stakeholders: expected }])
  })

  it('solution type participation: an entry for each issue, by number', () => {
    expect(stakeholdersByType('solutionType', files, 'participation').map((x) => x.issueNumber)).toEqual([1, 2, 8, 9])
  })

  it('a level 1 or unknown code gives no stakeholder', () => {
    for (const kind of TYPE_KINDS) {
      expect(stakeholdersByType(kind, files, LEVEL_1[kind])).toEqual([])
      expect(stakeholdersByType(kind, files, 'nope')).toEqual([])
    }
  })
})

describe('sameTypeIssues', () => {
  it('domain: the other issues with the same 領域, in the issue order of its codes', () => {
    expect(sameTypeIssues('domain', index, files, 8)).toEqual([{ code: 'environment', issues: [1, 2] }])
    expect(sameTypeIssues('domain', index, files, 9)).toEqual([])
  })

  it('solution type: uses the solution types of the solutions', () => {
    expect(sameTypeIssues('solutionType', index, files, 9)).toEqual([
      { code: 'planning', issues: [1, 2] },
      { code: 'procedure', issues: [1] },
      { code: 'regulation', issues: [1, 8] },
      { code: 'participation', issues: [1, 2, 8] },
      { code: 'open-data', issues: [1, 2, 8] },
    ])
  })

  it('is empty for an unknown issue', () => {
    for (const kind of TYPE_KINDS) expect(sameTypeIssues(kind, index, files, 99)).toEqual([])
  })
})

describe('otherTypes', () => {
  it('gives the other codes of a solution, in its own order', () => {
    expect(otherTypes('solutionType', trashcans.solutions[0], 'planning')).toEqual(['digital-tool'])
    expect(otherTypes('domain', smokefree.solutions[0], 'health')).toEqual(['environment'])
  })
})

describe('typeGroups (the list page headings)', () => {
  it('domain: the 8 groups, in the order of domainGroups, each type in file order', () => {
    const groups = typeGroups(typesOf('domain', index))
    expect(groups.map((g) => g.group)).toEqual(index.domainGroups.map((g) => g.name))
    expect(groups[0].types.map((t) => t.code)).toEqual(['administration', 'legislature', 'civil-affairs', 'police', 'finance'])
    expect(groups.flatMap((g) => g.types)).toEqual(index.domainTypes)
  })

  it('space: the 4 groups, as spaceGroups', () => {
    expect(typeGroups(typesOf('space', index)).map((g) => g.group)).toEqual(['道路', '地下', '公共空間', '建築'])
  })

  it('solution type: one group with no heading, all 13 in file order', () => {
    const groups = typeGroups(typesOf('solutionType', index))
    expect(groups).toHaveLength(1)
    expect(groups[0].group).toBeNull()
    expect(groups[0].types).toEqual(index.solutionTypes)
  })

  it('is empty for an empty list', () => {
    expect(typeGroups([])).toEqual([])
  })
})

// Task U3: the issues of a type page and of a card on the list page.
describe('typeIssues (the issues of a type page)', () => {
  const nums = (kind: TypeKind, list: IssueFile[], code: string) => typeIssues(kind, index, list, code).map((i) => i.number)

  it('space and domain: the issues with the code on the issue', () => {
    expect(nums('space', files, 'arcade')).toEqual([2, 8])
    expect(nums('domain', files, 'environment')).toEqual([1, 2, 8])
    expect(nums('domain', files, 'police')).toEqual([])
  })

  it('solution type: the issues with a solution of the type', () => {
    expect(nums('solutionType', files, 'participation')).toEqual([1, 2, 8, 9])
    expect(nums('solutionType', [], 'participation')).toEqual([])
  })

  it('domain: also an issue whose solution has its own 領域, which is never on the issue', () => {
    // #2 S1 gets the own 領域 police (usedDomains of index.json). #2 itself has only environment.
    expect(typeIssues('domain', ownIndex, [], 'police').map((i) => i.number)).toEqual([2])
    expect(numbers('domain', 'police')).toEqual([])
  })

  it('a level 1 or unknown code gives no issue', () => {
    for (const kind of TYPE_KINDS) {
      expect(nums(kind, files, LEVEL_1[kind])).toEqual([])
      expect(nums(kind, files, 'nope')).toEqual([])
    }
  })
})

// Task U5: the 領域 filter of #/issues uses the same rule as typeIssues.
describe('issueUsedCodes and issueTypeOptions (the #/issues filters)', () => {
  const issue = (n: number, from: IndexFile = index) => availableIssues(from).find((i) => i.number === n)!

  it('gives the codes on the issue, then the codes of its solutions, each once', () => {
    expect(issueUsedCodes('domain', issue(2), [])).toEqual(['environment'])
    // 領域 come from usedDomains of index.json, not from the issue files.
    expect(issueUsedCodes('domain', issue(2, ownIndex), [])).toEqual(['environment', 'police'])
    expect(issueUsedCodes('space', issue(1), [])).toEqual(issue(1).spaces)
    expect(issueUsedCodes('solutionType', issue(9), files)).toEqual(['planning', 'procedure', 'regulation', 'participation', 'open-data'])
  })

  it('usedDomains agrees with the old rule on the fixtures: the 領域 line, then the own 領域 of the solutions', () => {
    for (const i of availableIssues(index)) {
      const file = files.find((f) => f.number === i.number)!
      const old = [...i.domains]
      for (const s of file.solutions) for (const d of s.ownDomains) if (!old.includes(d)) old.push(d)
      expect(i.usedDomains).toEqual(old)
    }
    // And typeIssues gives the same issues as the old rule (the 領域 line or a solution's domains).
    for (const t of typesOf('domain', index)) {
      const old = availableIssues(index)
        .filter((i) => i.domains.includes(t.code) || files.find((f) => f.number === i.number)!.solutions.some((s) => s.domains.includes(t.code)))
        .map((i) => i.number)
      expect(typeIssues('domain', index, [], t.code).map((i) => i.number)).toEqual(old)
    }
  })

  it('agrees with typeIssues for every kind and code', () => {
    for (const kind of TYPE_KINDS) {
      for (const t of typesOf(kind, index)) {
        const users = availableIssues(index).filter((i) => issueUsedCodes(kind, i, files).includes(t.code)).map((i) => i.number)
        expect(users).toEqual(typeIssues(kind, index, files, t.code).map((i) => i.number))
      }
    }
  })

  it('offers the used types only, in file order (never by a count)', () => {
    const codes = (kind: TypeKind, list: IssueFile[]) => issueTypeOptions(kind, index, list).map((t) => t.code)
    // The space options need only index.json (the old usedSpaceTypes).
    expect(new Set(codes('space', []))).toEqual(new Set(['sidewalk-furniture', 'arcade', 'bus-stop', 'park', 'mrt-exit', 'indoor-home', 'utility', 'bike-lane']))
    expect(codes('space', [])).toEqual(index.spaceTypes.map((s) => s.code).filter((c) => codes('space', []).includes(c)))
    expect(codes('domain', [])).toEqual(['administration', 'civil-affairs', 'health', 'environment'])
    expect(issueTypeOptions('domain', ownIndex, []).map((t) => t.code)).toEqual(['administration', 'civil-affairs', 'police', 'health', 'environment'])
  })
})

describe('issueListsSolutionCodes', () => {
  it('is true only for space: a solution space is always on its issue', () => {
    expect(TYPE_KINDS.map(issueListsSolutionCodes)).toEqual([true, false, false])
  })
})

describe('typeGroupNames', () => {
  it('gives the level 1 names in file order; a solution type has none', () => {
    expect(typeGroupNames('space', index)).toEqual(['道路', '地下', '公共空間', '建築'])
    expect(typeGroupNames('domain', index)).toEqual(index.domainGroups.map((g) => g.name))
    expect(typeGroupNames('domain', index)).toHaveLength(8)
    expect(typeGroupNames('solutionType', index)).toEqual([])
  })
})

describe('TYPE_LIST_PAGES', () => {
  it('gives the list page (and the URL segment) of each kind', () => {
    expect(TYPE_KINDS.map((k) => TYPE_LIST_PAGES[k])).toEqual(['spaces', 'domains', 'solution-types'])
  })
})

describe('solutionTagCodes and hasTagCodes (the tag rows of a solution, Task U4)', () => {
  const s1 = trashcans.solutions.find((s) => s.id === 'S1')!
  const own = { ...s1, domains: ['police'], ownDomains: ['police'] }

  it('gives the codes of each kind in the order of the data', () => {
    expect(solutionTagCodes(s1)).toEqual({ space: s1.spaces, domain: ['environment'], solutionType: ['digital-tool', 'planning'] })
  })

  it('issueDomains false: leaves out the 領域 taken from the issue, keeps own 領域', () => {
    expect(solutionTagCodes(s1, { issueDomains: false }).domain).toEqual([])
    expect(solutionTagCodes(own, { issueDomains: false }).domain).toEqual(['police'])
  })

  it('hasTagCodes is true when any kind has a code', () => {
    expect(hasTagCodes(solutionTagCodes(s1))).toBe(true)
    expect(hasTagCodes({ space: [], domain: [], solutionType: [] })).toBe(false)
    expect(hasTagCodes({})).toBe(false)
    expect(hasTagCodes({ domain: ['police'] })).toBe(true)
  })
})
