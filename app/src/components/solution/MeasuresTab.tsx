import { Link, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { Field } from '@/components/Field'
import { Markdown } from '@/components/Markdown'
import { targetLinkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { solutionPath } from '@/lib/entityPaths'
import { cn } from '@/lib/utils'
import type { CrossSolution, Solution } from '@/types'
import { PartEmpty } from './Parts'

const tp = t.solutionPage
const tx = t.crossIssue

// The 成效衡量 tab (design 3.12, decision 103): the rows of 6.3 (or 4.3 of
// the cross-issue file), moved here from the 總覽 tab. The tab content is
// under the hidden h2 「成效衡量」, so each indicator is an h3. The
// 「只看有資料根據」 filter did not change this list on the 總覽 tab, so it
// does not change it here either.

/** The 成效衡量 tab of an issue solution. */
export function MeasuresTab({ solution: sol }: { solution: Solution }) {
  if (sol.measures.length === 0) return <PartEmpty>{tp.measuresNone}</PartEmpty>
  return (
    <ul className="space-y-3">
      {sol.measures.map((m, i) => (
        <li key={i} className="rounded-md border p-3">
          <h3 className="font-medium"><Markdown text={m.metric} /></h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Field label={tp.baseline}><CellText cell={m.baseline} /></Field>
            <Field label={tp.source}><Markdown text={m.source} /></Field>
          </dl>
        </li>
      ))}
    </ul>
  )
}

/** The 成效衡量 tab of a cross-issue solution: also 「新指標」 and the issue
 * solutions that each indicator comes from (links). */
export function CrossMeasuresTab({ solution: sol }: { solution: CrossSolution }) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  if (sol.measures.length === 0) return <PartEmpty>{tp.measuresNone}</PartEmpty>
  return (
    <ul className="space-y-3">
      {sol.measures.map((m, i) => (
        <li key={i} className="rounded-md border p-3">
          <h3 className="font-medium">
            <Markdown text={m.indicator} />
            {m.isNew && (
              <span className="ml-2 rounded-sm border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                {tx.measureNew}
              </span>
            )}
          </h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <Field label={tp.baseline}><CellText cell={m.baseline} /></Field>
            <Field label={tp.source}><Markdown text={m.source} /></Field>
            {m.from.length > 0 && (
              <Field label={tx.measureFrom}>
                {m.from.map((f, j) => (
                  <span key={`${f.issue}-${f.code}`}>
                    {j > 0 && t.listSeparator}
                    <Link to={{ pathname: solutionPath(f.issue, f.code), search }} className={cn(targetLinkClass, 'font-mono')}>
                      {t.solutionId(f.issue, f.code)}
                    </Link>
                  </span>
                ))}
              </Field>
            )}
          </dl>
        </li>
      ))}
    </ul>
  )
}
