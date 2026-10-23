import { Link } from 'react-router'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import type { RefTarget } from '@/lib/summary'

/** The 「相關：」 line of a 分析摘要 row or a 相依事項 row: each reference as
 * a link (targetOf), or plain text when targetOf gives null. Nothing when the
 * row has no reference. Used on the issue page and the solution page. */
export function RefLine({ refs, targetOf, className = '' }: {
  refs: string[]
  targetOf: (ref: string) => RefTarget | null
  className?: string
}) {
  if (refs.length === 0) return null
  return (
    <p className={`text-muted-foreground ${className}`}>
      {t.overview.summaryRefs}
      {refs.map((ref, i) => {
        const target = targetOf(ref)
        return (
          <span key={ref}>
            {target ? <Link to={target} className={linkClass}>{ref}</Link> : <span>{ref}</span>}
            {i < refs.length - 1 && t.listSeparator}
          </span>
        )
      })}
    </p>
  )
}
