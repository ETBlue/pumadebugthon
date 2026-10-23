import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { CellText } from '@/components/CellText'
import { FilterStatus } from '@/components/FilterStatus'
import { IssueMenuBar } from '@/components/IssueMenuBar'
import { RefLine } from '@/components/RefLine'
import { t } from '@/i18n/zh-TW'
import type { SummaryTab as SummaryTabName } from '@/lib/issuePage'
import { summaryItemsOf, summaryItemsShown, summaryRefTo } from '@/lib/summary'
import type { IssueFile } from '@/types'
import type { IssueTabProps } from './types'

const ts = t.issue.summaryTab

/** A 分析摘要 topic tab of the issue page (design 3.2, decisions 102, 108,
 * 116 and 140; only 難以取捨 is left): one short line, the menu bar (IssueMenuBar) with the
 * 「只看有資料根據」 toggle, the filter status line, then the rows of the
 * topic in file order. The rows are not entities (they have no ID or page),
 * so they are shown as an article: one column, a heading and a paragraph
 * each, no card box (decision 134). A 【待補】 row is shown in muted text; it
 * is not in the tab count. With the filter on, only the rows tagged
 * [實證] or [AI整理] are shown (summaryItemsShown), and the reference links
 * keep ?evidence=1. */
export function SummaryTab({ tab, issue, summary }: IssueTabProps & { tab: SummaryTabName }) {
  const [dataBasedOnly] = useDataBasisFilter()
  const items = summaryItemsOf(issue, tab)
  const shown = summaryItemsShown(items, dataBasedOnly)
  const n = summary.number

  return (
    <div>
      <p className="text-sm leading-relaxed text-muted-foreground">{ts.intro}</p>
      <IssueMenuBar label={t.sideMenu.filters} className="mt-4">
        <DataBasisToggle variant="bar" />
      </IssueMenuBar>
      {/* The same status line and 「清除篩選」 as the 訴求, 需求 and 解法
          tabs. Only the data filter applies here. */}
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
        <ul aria-label={t.issue.tabs[tab]} className="mt-6 space-y-6">
          {shown.map((item) => (
            <li key={item.item} className={item.text.pending ? 'min-w-0 text-muted-foreground' : 'min-w-0'}>
              <h3 className="text-lg font-semibold text-foreground">{item.item}</h3>
              <p className="mt-1 leading-relaxed"><CellText cell={item.text} /></p>
              <SummaryRefs refs={item.refs} issueNumber={n} issue={issue} dataBasedOnly={dataBasedOnly} className="mt-1 text-sm" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The 「相關：」 line of a 分析摘要 row of an issue: each reference as a
 * link (summaryRefTo), or plain text when it cannot be read. Nothing when
 * the row has no reference. */
export function SummaryRefs({ refs, issueNumber, issue, dataBasedOnly, className = '' }: {
  refs: string[]
  issueNumber: number
  issue: IssueFile
  dataBasedOnly: boolean
  className?: string
}) {
  return (
    <RefLine
      refs={refs}
      targetOf={(ref) => summaryRefTo(ref, issueNumber, issue, dataBasedOnly)}
      className={className}
    />
  )
}
