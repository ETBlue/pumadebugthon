// Load the JSON made by analysis/scripts/build_json.py from public/data/.
import { useEffect, useState } from 'react'
import { t } from '@/i18n/zh-TW'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'

const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`

// One request per file. Pages that ask for the same file share the result.
// A failed request is removed, so the next call tries again.
const cache = new Map<string, Promise<unknown>>()

function fetchJson<T>(path: string): Promise<T> {
  const url = dataUrl(path)
  let p = cache.get(url)
  if (!p) {
    p = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
      return res.json()
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p as Promise<T>
}

export function loadIndex(): Promise<IndexFile> {
  return fetchJson<IndexFile>('index.json')
}

/** folder is the issue folder name, for example "2-trashcans". */
export function loadIssue(folder: string): Promise<IssueFile> {
  return fetchJson<IssueFile>(`issues/${encodeURIComponent(folder)}.json`)
}

/** cross-issue.json (design 3.18), or null when the site has no such file.
 * build_json.py writes it only when the cross-issue analysis exists. A
 * missing file is not an error: the page shows no cross-issue parts. A dev
 * server can answer a missing file with index.html, so a reply that is not
 * JSON also counts as missing. */
export function loadCrossIssue(): Promise<CrossIssueFile | null> {
  // vite.config.ts sets this when the file exists at build time. Without the
  // file there is no request, so the browser console shows no 404.
  if (import.meta.env.VITE_CROSS_ISSUE !== '1') return Promise.resolve(null)
  const url = dataUrl('cross-issue.json')
  let p = cache.get(url) as Promise<CrossIssueFile | null> | undefined
  if (!p) {
    p = fetch(url).then((res) => {
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
      if (!(res.headers.get('content-type') ?? '').includes('json')) return null
      return res.json() as Promise<CrossIssueFile>
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

/** message is UI text from src/i18n/zh-TW.ts. error is the original error. */
export type DataState<T> =
  | { status: 'loading'; message: string }
  | { status: 'error'; message: string; error: unknown }
  | { status: 'ready'; data: T }

function useData<T>(key: string, load: () => Promise<T>): DataState<T> {
  const [state, setState] = useState<{ key: string; value: DataState<T> }>({
    key,
    value: { status: 'loading', message: t.data.loading },
  })

  useEffect(() => {
    let active = true
    load().then(
      (data) => active && setState({ key, value: { status: 'ready', data } }),
      (error: unknown) =>
        active && setState({ key, value: { status: 'error', message: t.data.loadError, error } }),
    )
    return () => {
      active = false
    }
    // load is not a dependency: it gives the same data for the same key.
  }, [key])

  // When the key changes, show loading until the new data arrives.
  return state.key === key ? state.value : { status: 'loading', message: t.data.loading }
}

export function useIndex(): DataState<IndexFile> {
  return useData('index', loadIndex)
}

export function useIssue(folder: string): DataState<IssueFile> {
  return useData(`issue:${folder}`, () => loadIssue(folder))
}

/** Several issue files at once, in the order of folders. Use this when the
 * number of issues is known only after index.json is loaded. */
export function useIssues(folders: string[]): DataState<IssueFile[]> {
  return useData(`issues:${folders.join(',')}`, () => Promise.all(folders.map(loadIssue)))
}

/** cross-issue.json: data is null when the file does not exist. */
export function useCrossIssue(): DataState<CrossIssueFile | null> {
  return useData('cross-issue', loadCrossIssue)
}

/** cross-issue.json for the parts that are only shown when it exists (the
 * header count, the list group, the boxes): the file, or null while it
 * loads, when it does not exist, or when it fails to load. Those parts are
 * then hidden and the page works as before. */
export function useCrossIssueOrNull(): CrossIssueFile | null {
  const state = useCrossIssue()
  return state.status === 'ready' ? state.data : null
}
