import { Link } from 'react-router'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { CellText } from '@/components/CellText'
import { FilterStatus } from '@/components/FilterStatus'
import { linkClass, proseClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import type { SummaryTab as SummaryTabName } from '@/lib/issuePage'
import { summaryItemsOf, summaryItemsShown, summaryRefTo } from '@/lib/summary'
import type { IssueFile } from '@/types'
import type { IssueTabProps } from './types'

const ts = t.issue.summaryTab

/** A 分析摘要 topic tab of the issue page (design 3.2, decisions 102 and
 * 108): one short line, the 「只看有資料根據」 toggle and the filter status
 * line, then the rows of the topic in file order. A 【待補】 row is shown
 * with a dashed border; it is not in the tab count. There is no side bar, so
 * the toggle is above the rows. With the filter on, only the rows tagged
 * [實證] or [AI整理] are shown (summaryItemsShown), and the reference links
 * keep ?evidence=1. */
export function SummaryTab({ tab, issue, summary }: IssueTabProps & { tab: SummaryTabName }) {
  const [dataBasedOnly] = useDataBasisFilter()
  const items = summaryItemsOf(issue, tab)
  const shown = summaryItemsShown(items, dataBasedOnly)
  const n = summary.number

  return (
    <div>
      <p className={`text-sm leading-relaxed text-muted-foreground ${proseClass}`}>{ts.intro}</p>
      <DataBasisToggle className="mt-4" />
      {/* The same status line and 「清除篩選」 as the tabs with a side bar.
          Only the data filter applies here. */}
      <FilterStatus
        filters={{ dataBasedOnly, special: [] }}
        stakeholder={null}
        shown={ts.shown(shown.length)}
        className="mt-3"
      />
      {items.length === 0 ? (
        <p className="mt-4">{ts.none}</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{ts.dataEmpty}</p>
      ) : (
        <ul aria-label={t.issue.tabs[tab]} className={`mt-4 space-y-2 ${proseClass}`}>
          {shown.map((item) => (
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
              <SummaryRefs refs={item.refs} issueNumber={n} issue={issue} dataBasedOnly={dataBasedOnly} className="mt-1" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The 「相關：」 line of a 分析摘要 row: each reference as a link
 * (summaryRefTo), or plain text when it cannot be read. Nothing when the row
 * has no reference. */
export function SummaryRefs({ refs, issueNumber, issue, dataBasedOnly, className = '' }: {
  refs: string[]
  issueNumber: number
  issue: IssueFile
  dataBasedOnly: boolean
  className?: string
}) {
  if (refs.length === 0) return null
  return (
    <p className={`text-muted-foreground ${className}`}>
      {t.overview.summaryRefs}
      {refs.map((ref, i) => {
        const target = summaryRefTo(ref, issueNumber, issue, dataBasedOnly)
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
