import { useId } from 'react'
import { useSearchParams, type To } from 'react-router'
import { Toggle } from '@/components/ui/toggle'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch, isDataBasisFilterOn, withDataBasisFilter } from '@/lib/dataBasis'
import { tabPath, type IssueTab } from '@/lib/issuePage'
import { cn } from '@/lib/utils'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const tf = t.dataBasisFilter

/** The 「只看有資料根據」 setting (design 3.5). It is in the URL (?evidence=1),
 * so it stays when the tab changes and a link can share it. */
export function useDataBasisFilter(): [boolean, (on: boolean) => void] {
  const [params, setParams] = useSearchParams()
  const set = (on: boolean) =>
    setParams((prev) => withDataBasisFilter(prev, on), { replace: true, preventScrollReset: true })
  return [isDataBasisFilterOn(params), set]
}

/** A link target for a tab of the issue page that keeps the 「只看有資料根據」 setting. */
export function useTabTo(): (issueNumber: number, tab: IssueTab) => To {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  return (issueNumber, tab) => ({ pathname: tabPath(issueNumber, tab), search })
}

/** The 「只看有資料根據」 toggle. variant 'page' (default): the toggle at the
 * top of a content block. 'bar': the toggle in the menu bar of an issue tab
 * (IssueMenuBar, decision 116), with a `bg-background` like the other bar
 * controls. The hint is not visible text, so it does not repeat on every tab
 * (decision 146). It is the `title` (shown on hover) and an `sr-only` text for
 * `aria-describedby`. The visible explanation is on #/about. */
export function DataBasisToggle({ className, variant = 'page' }: { className?: string; variant?: 'page' | 'bar' }) {
  const [on, setOn] = useDataBasisFilter()
  const hintId = useId()
  const bar = variant === 'bar'
  return (
    <div className={className}>
      <Toggle
        variant="outline"
        pressed={on}
        onPressedChange={setOn}
        aria-describedby={hintId}
        title={tf.hint}
        className={cn(toggleOnClass, bar && 'bg-background')}
      >
        <ToggleCheck />
        {tf.label}
      </Toggle>
      <span id={hintId} className="sr-only">{tf.hint}</span>
    </div>
  )
}

/** The text for a story list that the filter left empty. */
export function DataBasisEmpty() {
  return <p className="mt-2 text-muted-foreground">{tf.empty}</p>
}
