import { Link, useLocation } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { clearListFilters, type ListPage } from '@/lib/listParams'
import { cn } from '@/lib/utils'
import { linkClass } from './styles'

const tb = t.listBar

/** The result line of a list page (design 3.23.6 and 3.23.13).
 *
 * 「顯示 3 個議題，共 8 個。」 When a search or a filter is on, it also lists
 * them, the search first: 「篩選：搜尋「無菸」；空間類型：人行道。」, then the
 * link 「清除篩選」. The link removes every filter and q, and keeps sort and
 * view (clearListFilters).
 *
 * The element has role="status" and is always in the page, so a screen
 * reader reads the new text after each change.
 *
 * shown: the number of items shown. total: the whole list with no filter.
 * q: the search text (cleaned), or null. parts: the filters that are on, as
 * text, in the order of the bar (use t.listBar.filterPart). clearLink:
 * false in the phone sheet, which has its own 「清除篩選」 button. */
export function ResultLine({ page, shown, total, q, parts, clearLink = true, className }: {
  page: ListPage
  shown: number
  total: number
  q: string | null
  parts: string[]
  clearLink?: boolean
  className?: string
}) {
  const { pathname, search } = useLocation()
  const all = q === null ? parts : [t.listSearch.statusPart(q), ...parts]
  const on = all.length > 0
  return (
    <p role="status" className={cn('text-sm', className)}>
      {tb.shown[page](shown, total)}
      {on && tb.status(all)}
      {on && clearLink && (
        <>
          {' '}
          <Link
            to={{ pathname, search: clearListFilters(new URLSearchParams(search)) }}
            preventScrollReset
            className={linkClass}
          >
            {tb.clear}
          </Link>
        </>
      )}
    </p>
  )
}
