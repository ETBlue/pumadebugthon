import { useEffect } from 'react'
import { pageTitle } from '@/lib/pageTitle'

/** Sets the page <title> from the parts (see pageTitle). Renders nothing, so
 * a page can use it in any branch, for example the "not found" branch. */
export function PageTitle({ parts = [] }: { parts?: (string | null | undefined)[] }) {
  const title = pageTitle(...parts)
  useEffect(() => {
    document.title = title
  }, [title])
  return null
}
