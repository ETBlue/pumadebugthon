import { Link } from 'react-router'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { CellText } from '@/components/CellText'
import { linkClass, proseClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import type { SummaryTab as SummaryTabName } from '@/lib/issuePage'
import { summaryItemsOf, summaryRefTo } from '@/lib/summary'
import type { IssueTabProps } from './types'

/** A 分析摘要 topic tab of the issue page (design 3.2, decision 102): one
 * short line, then the rows of the topic in file order. A 【待補】 row is
 * shown with a dashed border; it is not in the tab count. There is no side
 * bar. The 「只看有資料根據」 filter does not hide rows (as on 總覽 before);
 * the reference links keep ?evidence=1. */
export function SummaryTab({ tab, issue, summary }: IssueTabProps & { tab: SummaryTabName }) {
  const [dataBasedOnly] = useDataBasisFilter()
  const items = summaryItemsOf(issue, tab)
  const n = summary.number

  return (
    <div>
      <p className={`text-sm leading-relaxed text-muted-foreground ${proseClass}`}>{t.issue.summaryTab.intro}</p>
      {items.length === 0 ? (
        <p className="mt-4">{t.issue.summaryTab.none}</p>
      ) : (
        <ul aria-label={t.issue.tabs[tab]} className={`mt-4 space-y-2 ${proseClass}`}>
          {items.map((item) => (
            <li
              key={item.item}
              className={
                item.text.pending
                  ? 'min-w-0 rounded-md border border-dashed border-muted-foreground bg-muted/40 p-3 text-sm'
                  : 'min-w-0 rounded-md border p-3 text-sm'
              }
            >
              <p className="font-medium">{item.item}</p>
              <p className="mt-1"><CellText cell={item.text} /></p>
              {item.refs.length > 0 && (
                <p className="mt-1 text-muted-foreground">
                  {t.overview.summaryRefs}
                  {item.refs.map((ref, i) => {
                    const target = summaryRefTo(ref, n, issue, dataBasedOnly)
                    return (
                      <span key={ref}>
                        {target ? <Link to={target} className={linkClass}>{ref}</Link> : <span>{ref}</span>}
                        {i < item.refs.length - 1 && t.listSeparator}
                      </span>
                    )
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
