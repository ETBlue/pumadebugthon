import { Fragment } from 'react'
import { Link, type To } from 'react-router'
import { targetLinkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'

/** One breadcrumb item. An item that names an issue, a stakeholder or a
 * solution has both an ID and a name (decision 99). An item with no name,
 * such as a story, has the ID only. A plain item such as 首頁 has the name only. */
export interface BreadcrumbItem {
  /** Shown in font-mono, for example 「#8」, 「#2 A」 or 「I06」. */
  id?: string
  /** Plain text, for example 「無菸城市」. */
  name?: string
  /** The link target. The last item is the current page and is never a link. */
  to?: To
}

/** The breadcrumb of the story page, in the band above the h1 (design 3.15,
 * decisions 99 and 111; the other detail pages have a back button instead): a nav with an ol,
 * a 「›」 between the items, and the last item marked as the current page.
 * A long name wraps inside its item, so a 360 px screen has no sideways scroll. */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label={t.breadcrumb.label}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1
          const text = <ItemText item={item} />
          return (
            <Fragment key={i}>
              {i > 0 && <li aria-hidden="true" className="text-muted-foreground">›</li>}
              {last || item.to === undefined ? (
                <li aria-current={last ? 'page' : undefined} className="min-w-0 break-words">{text}</li>
              ) : (
                <li className="min-w-0 break-words">
                  <Link to={item.to} className={targetLinkClass}>{text}</Link>
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

function ItemText({ item }: { item: BreadcrumbItem }) {
  return (
    <>
      {item.id !== undefined && <span className="font-mono">{item.id}</span>}
      {item.id !== undefined && item.name !== undefined && ' '}
      {item.name}
    </>
  )
}
