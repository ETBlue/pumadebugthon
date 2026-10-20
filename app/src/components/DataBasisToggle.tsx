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

/** The 「只看有資料根據」 toggle with a short hint. variant 'page' (default):
 * the toggle at the top of a content block. 'sideBar': the toggle in the
 * filters group of the side menu (design 3.21). It is smaller, as wide as
 * the side bar, and its text can wrap. */
export function DataBasisToggle({ className, variant = 'page' }: { className?: string; variant?: 'page' | 'sideBar' }) {
  const [on, setOn] = useDataBasisFilter()
  const hintId = useId()
  const side = variant === 'sideBar'
  return (
    <div className={className}>
      <Toggle
        variant="outline"
        size={side ? 'sm' : 'default'}
        pressed={on}
        onPressedChange={setOn}
        aria-describedby={hintId}
        className={cn(toggleOnClass, side && 'h-auto min-h-8 w-full justify-start py-1 text-left whitespace-normal')}
      >
        <ToggleCheck />
        {tf.label}
      </Toggle>
      <p id={hintId} className={cn('mt-1 text-muted-foreground', side ? 'text-xs' : 'text-sm')}>{tf.hint}</p>
    </div>
  )
}

/** The text for a story list that the filter left empty. */
export function DataBasisEmpty() {
  return <p className="mt-2 text-muted-foreground">{tf.empty}</p>
}
