import { CellParts } from '@/components/CellParts'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Markdown } from '@/components/Markdown'
import { TagBadge } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { dataBasedParts } from '@/lib/dataBasis'
import { planPhases } from '@/lib/solutionPage'
import type { SolutionEvaluation, SolutionPlan, SolutionSchedule, Step7Cell } from '@/types'
import { Schedule } from './Schedule'

const tp = t.solutionPage

/** The 執行步驟 cell: a numbered list of the phases when the cell splits
 * cleanly at 「；」 (planPhases), else the text (CellParts). The tag badge is
 * shown once, before the list. */
function Steps({ cell, dataBasedOnly }: { cell: Step7Cell; dataBasedOnly: boolean }) {
  const phases = planPhases(cell)
  // A list has one part; when the filter hides it, CellParts shows the note.
  if (phases === null || dataBasedParts(cell, dataBasedOnly).length === 0) {
    return <p className="mt-1 leading-relaxed"><CellParts parts={cell} dataBasedOnly={dataBasedOnly} /></p>
  }
  const tag = cell[0].tag
  return (
    <>
      {tag && <p className="mt-1"><TagBadge kind={tag} /></p>}
      <ol className="mt-1 list-decimal space-y-1 pl-5 leading-relaxed">
        {phases.map((phase, i) => <li key={i}><Markdown text={phase} /></li>)}
      </ol>
    </>
  )
}

/** The 執行計畫 tab of a solution (decision 140), for an issue solution and
 * a cross-issue solution: 主責單位, 需要的資料／API／資源, 成本 (the 執行計畫
 * table of step 7), 可行性 (the evaluation table), then 執行步驟 (old step 7
 * format) or 工作分解與時程 (new format, decision 181), in this order.
 * Article style (decision 137): an h3 and the cell for each row, no card box.
 * A row whose parts are all 【待補】 is in muted text. Each cell follows the
 * 「只看有資料根據」 filter as a step 7 cell does (decision 105): the
 * [AI模擬] parts are hidden, and a cell with nothing left says so. */
export function PlanTab({ solution: sol }: {
  solution: { evaluation: SolutionEvaluation; plan: SolutionPlan; schedule?: SolutionSchedule | null }
}) {
  const [dataBasedOnly] = useDataBasisFilter()
  const rows: { key: string; label: string; cell: Step7Cell }[] = [
    { key: 'owner', label: tp.planLabels.owner, cell: sol.plan.owner },
    { key: 'resources', label: tp.planLabels.resources, cell: sol.plan.resources },
    { key: 'cost', label: tp.planLabels.cost, cell: sol.plan.cost },
    { key: 'feasibility', label: tp.evaluationLabels.feasibility, cell: sol.evaluation.feasibility },
  ]
  // The old format has a 執行步驟 cell. The new format has a schedule instead.
  const schedule = sol.schedule ?? null
  if (schedule === null && sol.plan.steps) rows.push({ key: 'steps', label: tp.planLabels.steps, cell: sol.plan.steps })
  return (
    <>
      <p className="text-sm text-muted-foreground">{tp.planIntro}</p>
      <DataBasisToggle className="mt-3" />
      <ul aria-label={tp.tabs.plan} className="mt-6 space-y-6">
        {rows.map((r) => (
          <li key={r.key} className={r.cell.every((p) => p.pending) ? 'min-w-0 text-muted-foreground' : 'min-w-0'}>
            <h3 id={`plan-${r.key}`} className="text-lg font-semibold text-foreground">{r.label}</h3>
            {r.key === 'steps' ? (
              <Steps cell={r.cell} dataBasedOnly={dataBasedOnly} />
            ) : (
              <p className="mt-1 leading-relaxed"><CellParts parts={r.cell} dataBasedOnly={dataBasedOnly} /></p>
            )}
          </li>
        ))}
        {schedule !== null && (
          <li key="schedule" className="min-w-0">
            <h3 id="plan-schedule" className="text-lg font-semibold text-foreground">{tp.planLabels.schedule}</h3>
            <Schedule schedule={schedule} dataBasedOnly={dataBasedOnly} />
          </li>
        )}
      </ul>
    </>
  )
}
