// Load the JSON made by analysis/build_json.py from public/data/.
import { useEffect, useState } from 'react'
import { t } from '@/i18n/zh-TW'
import type { IndexFile, IssueFile } from '@/types'

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
