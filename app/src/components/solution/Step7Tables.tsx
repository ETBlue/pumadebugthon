import { CellParts } from '@/components/CellParts'
import { t } from '@/i18n/zh-TW'
import type { Step7Row } from '@/lib/solutionPage'

const tp = t.solutionPage

function Rows({ rows, dataBasedOnly }: { rows: Step7Row[]; dataBasedOnly: boolean }) {
  return (
    <dl className="mt-4 space-y-4">
      {rows.map((r) => (
        <div key={r.key}>
          <dt className="font-semibold">{r.label}</dt>
          <dd className="mt-1 leading-relaxed"><CellParts parts={r.parts} dataBasedOnly={dataBasedOnly} /></dd>
        </div>
      ))}
    </dl>
  )
}

/** The step 7 evaluation rows, then the 執行計畫 rows under an h4 (ETBlue,
 * 2026-10-23). Each cell follows the 「只看有資料根據」 filter (decision 105).
 * Used by the 總覽 tab of an issue solution and of a cross-issue solution. */
export function Step7Tables({ rows, dataBasedOnly }: { rows: { evaluation: Step7Row[]; plan: Step7Row[] }; dataBasedOnly: boolean }) {
  return (
    <>
      <Rows rows={rows.evaluation} dataBasedOnly={dataBasedOnly} />
      <section aria-labelledby="solution-plan" className="mt-6">
        <h4 id="solution-plan" className="text-lg font-semibold">{tp.planHeading}</h4>
        <Rows rows={rows.plan} dataBasedOnly={dataBasedOnly} />
      </section>
    </>
  )
}
