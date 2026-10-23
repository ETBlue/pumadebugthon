import { CellParts } from '@/components/CellParts'
import { CellText } from '@/components/CellText'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { RefLine } from '@/components/RefLine'
import { t } from '@/i18n/zh-TW'
import { concernItems, concernItemsShown, concernPending, type ConcernItem, type ConcernTab } from '@/lib/solutionPage'
import type { RefTarget } from '@/lib/summary'
import type { SolutionEvaluation, SummaryItem } from '@/types'
import { PartEmpty } from './Parts'

const tp = t.solutionPage

/** The heading of an item: the 項目 of a 分析摘要 row, or the label of a step 7 row. */
const itemTitle = (c: ConcernItem) => (c.kind === 'summary' ? c.item.item : tp.evaluationLabels[c.key])

/** The 可能爭議 or 法規障礙 tab of a solution (decision 140), for an issue
 * solution and a cross-issue solution. One intro line, the 「只看有資料根據」
 * toggle, then the items (concernItems): the 分析摘要 rows that name the
 * solution, then the step 7 rows. The items are not entities, so they are in
 * article style (decisions 134 and 137): one column, an h3 and a paragraph
 * each, no card box. A 分析摘要 row has the 「相關：」 line; a step 7 row has
 * a source line. A 【待補】 item is in muted text. With the filter on, an
 * item stays when it has a [實證] or [AI整理] part (concernItemsShown), and
 * a step 7 row hides its [AI模擬] parts (CellParts).
 * targetOf: the link of a reference. step7Source: the source line of a step 7 row. */
export function ConcernsTab({ tab, solution, targetOf, step7Source }: {
  tab: ConcernTab
  solution: { evaluation: SolutionEvaluation; controversies: SummaryItem[]; legal: SummaryItem[] }
  targetOf: (ref: string, dataBasedOnly: boolean) => RefTarget | null
  step7Source: string
}) {
  const [dataBasedOnly] = useDataBasisFilter()
  const shown = concernItemsShown(concernItems(solution, tab), dataBasedOnly)
  return (
    <>
      <p className="text-sm text-muted-foreground">{tp.concernsIntro[tab]}</p>
      <DataBasisToggle className="mt-3" />
      {shown.length === 0 ? (
        <div className="mt-6"><PartEmpty>{tp.concernsDataEmpty}</PartEmpty></div>
      ) : (
        <ul aria-label={tp.tabs[tab]} className="mt-6 space-y-6">
          {shown.map((c) => (
            <li
              key={c.kind === 'summary' ? `summary-${c.item.item}` : `step7-${c.key}`}
              className={concernPending(c) ? 'min-w-0 text-muted-foreground' : 'min-w-0'}
            >
              <h3 className="text-lg font-semibold text-foreground">{itemTitle(c)}</h3>
              {c.kind === 'summary' ? (
                <>
                  <p className="mt-1 leading-relaxed"><CellText cell={c.item.text} /></p>
                  <RefLine refs={c.item.refs} targetOf={(ref) => targetOf(ref, dataBasedOnly)} className="mt-1 text-sm" />
                </>
              ) : (
                <>
                  <p className="mt-1 leading-relaxed"><CellParts parts={c.parts} dataBasedOnly={dataBasedOnly} /></p>
                  <p className="mt-1 text-sm text-muted-foreground">{step7Source}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
