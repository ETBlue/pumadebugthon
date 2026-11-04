import { useEffect, useId, useState } from 'react'
import { CellText } from '@/components/CellText'
import { TagBadge } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { dataBasedParts } from '@/lib/dataBasis'
import { renderGantt } from '@/lib/gantt'
import { scheduleTag } from '@/lib/solutionPage'
import { cn } from '@/lib/utils'
import { useTheme } from '@/theme'
import type { Cell, SolutionSchedule } from '@/types'

const ts = t.solutionPage.schedule

/** A plain cell of a work breakdown row (主責單位, 期間, 人天) as a Cell,
 * so a 【待補】 item looks the same as in the other step 7 cells. */
function plainCell(text: string): Cell {
  return { text, tag: null, pending: text.startsWith('【待補') }
}

/** What the chart shows: loading, the SVG from mermaid, or the error text. */
export type GanttState = { status: 'loading' } | { status: 'ready'; svg: string } | { status: 'error' }

/** The chart box for a state. The SVG comes from mermaid.render() with
 * securityLevel 'strict' (src/lib/gantt.ts). The gantt source is never put
 * into the page as HTML. Screen readers do not read the SVG (aria-hidden).
 * They read the hidden caption, which says the table above has the same content. */
export function GanttView({ state }: { state: GanttState }) {
  if (state.status === 'error') return <p className="mt-3 text-sm text-muted-foreground">{ts.chartError}</p>
  if (state.status === 'loading') return <p className="mt-3 text-sm text-muted-foreground">{ts.chartLoading}</p>
  return (
    <figure className="mt-3 overflow-x-auto">
      <figcaption className="sr-only">{ts.chartAlt}</figcaption>
      <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: state.svg }} />
    </figure>
  )
}

/** The gantt chart. It renders only in the browser, after the page shows
 * (useEffect), and again when the page theme changes (decision 186). */
export function GanttChart({ source }: { source: string }) {
  const [theme] = useTheme()
  // useId gives 「:r1:」 or 「«r1»」; mermaid needs an id that works in a CSS selector.
  const id = `gantt-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const key = `${theme}\n${source}`
  const [result, setResult] = useState<{ key: string; svg: string | null } | null>(null)
  useEffect(() => {
    let live = true
    void renderGantt(id, source, theme).then((svg) => {
      if (live) setResult({ key: `${theme}\n${source}`, svg })
    })
    return () => {
      live = false
    }
  }, [id, source, theme])
  return <GanttView state={ganttState(result, key)} />
}

/** The chart state for the last render result. result.key is the theme and
 * the source it was made for: an old result (for example from before a theme
 * change) counts as loading. A null svg (renderGantt failed) is an error. */
export function ganttState(result: { key: string; svg: string | null } | null, key: string): GanttState {
  if (result === null || result.key !== key) return { status: 'loading' }
  return result.svg === null ? { status: 'error' } : { status: 'ready', svg: result.svg }
}

/** The 工作分解與時程 of a solution in the new step 7 format (decisions 181
 * to 185): the work breakdown table, then the gantt chart.
 * - The tag of the 工作項目 cells is shown once, above the table, when all
 *   rows have the same tag (scheduleTag). Else each row shows its own.
 * - 「只看有資料根據」 (dataBasedOnly) removes the rows whose 工作項目 is
 *   [AI模擬]. The chart shows only when no row is removed. */
export function Schedule({ schedule, dataBasedOnly }: { schedule: SolutionSchedule; dataBasedOnly: boolean }) {
  const rows = schedule.rows.filter((r) => dataBasedParts([r.item], dataBasedOnly).length > 0)
  if (rows.length === 0) return <p className="mt-1 text-muted-foreground">{ts.filteredNone}</p>
  const tag = scheduleTag(rows)
  const c = ts.columns
  const th = 'border-b px-2 py-1.5 text-left font-semibold whitespace-nowrap'
  const td = 'border-b px-2 py-1.5 align-top'
  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">
        {tag && <TagBadge kind={tag} className="mr-1.5" />}
        {ts.intro}
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={th}>{c.id}</th>
              <th scope="col" className={th}>{c.item}</th>
              <th scope="col" className={th}>{c.owner}</th>
              <th scope="col" className={th}>{c.period}</th>
              <th scope="col" className={th}>{c.days}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.level === 1 ? 'bg-muted font-semibold' : undefined}>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{r.id}</td>
                <td className={cn(td, r.level === 2 && 'pl-6')}>
                  <CellText cell={tag ? { ...r.item, tag: null } : r.item} />
                </td>
                <td className={td}><CellText cell={plainCell(r.owner)} /></td>
                <td className={cn(td, 'whitespace-nowrap')}>{r.period}</td>
                <td className={cn(td, 'whitespace-nowrap')}><CellText cell={plainCell(r.days)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === schedule.rows.length
        ? <GanttChart source={schedule.gantt} />
        : <p className="mt-3 text-sm text-muted-foreground">{ts.chartFiltered}</p>}
    </>
  )
}
