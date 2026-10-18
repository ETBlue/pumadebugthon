import { describe, expect, it } from 'vitest'
import indexJson from '@/test/fixtures/index.json'
import type { IndexFile } from '@/types'
import { dataFileLinks } from './dataFiles'

const index = indexJson as IndexFile
const repo = 'https://github.com/ETBlue/pumadebugthon'

describe('dataFileLinks', () => {
  const links = dataFileLinks(index, '/pumadebugthon/', repo)

  it('lists the site JSON: index.json, then each analyzed issue by number', () => {
    expect(links.json).toEqual([
      { file: 'index.json', issue: null, href: '/pumadebugthon/data/index.json' },
      { file: '1-trees.json', issue: 1, href: '/pumadebugthon/data/issues/1-trees.json' },
      { file: '2-trashcans.json', issue: 2, href: '/pumadebugthon/data/issues/2-trashcans.json' },
      { file: '8-smokefree.json', issue: 8, href: '/pumadebugthon/data/issues/8-smokefree.json' },
    ])
  })

  it('lists the CSV files on GitHub: stakeholders, each issue, then the other shared files', () => {
    const blob = `${repo}/blob/main/analysis`
    expect(links.csv).toEqual([
      { file: 'stakeholders.csv', issue: null, href: `${blob}/stakeholders.csv` },
      { file: 'user-stories.csv', issue: 1, href: `${blob}/1-trees/user-stories.csv` },
      { file: 'user-stories.csv', issue: 2, href: `${blob}/2-trashcans/user-stories.csv` },
      { file: 'user-stories.csv', issue: 8, href: `${blob}/8-smokefree/user-stories.csv` },
      { file: 'space-types.csv', issue: null, href: `${blob}/space-types.csv` },
      { file: 'path-labels.csv', issue: null, href: `${blob}/path-labels.csv` },
      { file: 'issues.csv', issue: null, href: `${blob}/issues.csv` },
      { file: 'open-data.csv', issue: null, href: `${blob}/open-data.csv` },
    ])
  })

  it('takes new issues from index.json, and leaves out issues without an analysis', () => {
    const more: IndexFile = {
      ...index,
      issues: [
        ...index.issues,
        { number: 9, folder: '9-new', title: 'x', source: '主辦單位', available: true, spaces: [], updated: null,
          counts: { stakeholdersO: 0, stakeholdersI: 0, stories: 0, conflicts: 0, solutions: 0,
            cells: { evidence: 0, aiSummary: 0, aiSimulated: 0, pending: 0 } } },
      ],
    }
    const l = dataFileLinks(more, '/', repo)
    expect(l.json.map((x) => x.issue)).toEqual([null, 1, 2, 8, 9])
    expect(l.json[4].href).toBe('/data/issues/9-new.json')
    expect(l.csv.filter((x) => x.issue !== null).map((x) => x.issue)).toEqual([1, 2, 8, 9])
    // #3 to #6 are 製作中: no files.
    expect(l.json.some((x) => x.issue === 3)).toBe(false)
  })

  it('encodes the folder name in the URL', () => {
    const odd: IndexFile = { ...index, issues: [{ ...index.issues[0], folder: 'a b' } as IndexFile['issues'][number]] }
    const l = dataFileLinks(odd, '/', repo)
    expect(l.json[1].href).toBe('/data/issues/a%20b.json')
    expect(l.csv[1].href).toBe(`${repo}/blob/main/analysis/a%20b/user-stories.csv`)
  })
})
