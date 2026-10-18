import { useId } from 'react'
import { useSearchParams, type To } from 'react-router'
import { Toggle } from '@/components/ui/toggle'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch, isDataBasisFilterOn, withDataBasisFilter } from '@/lib/dataBasis'
import { tabPath, type IssueTab } from '@/lib/issuePage'
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

/** The 「只看有資料根據」 toggle with a short hint. */
export function DataBasisToggle({ className }: { className?: string }) {
  const [on, setOn] = useDataBasisFilter()
  const hintId = useId()
  return (
    <div className={className}>
      <Toggle variant="outline" pressed={on} onPressedChange={setOn} aria-describedby={hintId} className={toggleOnClass}>
        <ToggleCheck />
        {tf.label}
      </Toggle>
      <p id={hintId} className="mt-1 text-sm text-muted-foreground">{tf.hint}</p>
    </div>
  )
}

/** The text for a story list that the filter left empty. */
export function DataBasisEmpty() {
  return <p className="mt-2 text-muted-foreground">{tf.empty}</p>
}
