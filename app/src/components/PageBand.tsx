import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, type To } from 'react-router'
import { cn } from '@/lib/utils'
import { containerClass } from './styles'

/** Where the back button goes and what it says (decision 111). */
export interface BackTarget {
  to: To
  /** The accessible name, for example 「回到議題列表」. */
  label: string
  /** A shorter visible text, when label is long (the story page: 「回到 I06」).
   * The label starts with it, so the visible text is part of the name. */
  short?: string
}

/** The back button: an arrow and its text. Below sm only the arrow shows
 * (the text is still there for screen readers), so the title has room. It
 * is at least 36 x 36 px. */
export function BackLink({ to, label, short }: BackTarget) {
  return (
    <Link
      to={to}
      aria-label={short === undefined ? undefined : label}
      className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-3"
    >
      <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{short ?? label}</span>
    </Link>
  )
}

/** The band at the top of a detail page (design 3.2, decision 111): a
 * full-width strip with a background color, right under the header, like
 * the ListBar band of the list pages (decision 106). Inside, in the page
 * column: the back button and the h1 in one row. above is shown over that
 * row (the breadcrumb of the story page). The route needs handle.fullWidth,
 * and the page puts the rest in PageBody. */
export function PageBand({ back, above, titleClassName, children }: {
  back: BackTarget
  above?: ReactNode
  titleClassName?: string
  /** The content of the h1. */
  children: ReactNode
}) {
  return (
    <div className="border-b border-border bg-muted">
      <div className={`${containerClass} py-4 md:py-6`}>
        {above !== undefined && <div className="mb-3">{above}</div>}
        <div className="flex items-start gap-3">
          <BackLink {...back} />
          <h1 className={cn('min-w-0 flex-1 text-2xl font-bold break-words md:text-3xl', titleClassName)}>{children}</h1>
        </div>
      </div>
    </div>
  )
}

/** The page column under the band, or the whole page when there is no band
 * (loading, not found). The same column and space as main on other pages. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn(containerClass, 'py-6', className)}>{children}</div>
}
