// Links to the app's own data files, for the about page (design 3.13): the JSON
// the site reads, and the CSV files in analysis/ on GitHub (the shared ones are in analysis/data/). The issue files
// come from index.json, so a new issue appears without a code change.
import type { IndexFile } from '@/types'
import { availableIssues } from './issues'

export interface DataFileLink {
  /** The file name, for example "user-stories.csv". */
  file: string
  /** The issue number for a per-issue file; null for a shared file. */
  issue: number | null
  href: string
}

/** baseUrl is import.meta.env.BASE_URL (ends with "/"). repoUrl is the
 * GitHub repository URL. Issues are in number order. hasCross: the site has
 * cross-issue.json (design 3.18); it is listed after the issue files. */
export function dataFileLinks(
  index: IndexFile,
  baseUrl: string,
  repoUrl: string,
  hasCross = false,
): { json: DataFileLink[]; csv: DataFileLink[] } {
  const issues = availableIssues(index)
  const blob = `${repoUrl}/blob/main/analysis`
  const shared = (file: string): DataFileLink => ({ file, issue: null, href: `${blob}/data/${file}` })
  return {
    json: [
      { file: 'index.json', issue: null, href: `${baseUrl}data/index.json` },
      ...issues.map((i) => ({
        file: `${i.folder}.json`,
        issue: i.number,
        href: `${baseUrl}data/issues/${encodeURIComponent(i.folder)}.json`,
      })),
      ...(hasCross ? [{ file: 'cross-issue.json', issue: null, href: `${baseUrl}data/cross-issue.json` }] : []),
    ],
    csv: [
      shared('stakeholders.csv'),
      ...issues.map((i) => ({
        file: 'user-stories.csv',
        issue: i.number,
        href: `${blob}/${encodeURIComponent(i.folder)}/user-stories.csv`,
      })),
      shared('space-types.csv'),
      shared('path-labels.csv'),
      shared('issues.csv'),
      shared('open-data.csv'),
    ],
  }
}
