import { useId } from 'react'
import { useSearchParams, type To } from 'react-router'
import { Toggle } from '@/components/ui/toggle'
import { t } from '@/i18n/zh-TW'
import { evidenceSearch, isEvidenceOnly, withEvidence } from '@/lib/evidence'
import { tabPath, type IssueTab } from '@/lib/issuePage'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const te = t.evidenceFilter

/** The 「只看 [實證]」 setting (design 3.5). It is in the URL (?evidence=1),
 * so it stays when the tab changes and a link can share it. */
export function useEvidenceOnly(): [boolean, (on: boolean) => void] {
  const [params, setParams] = useSearchParams()
  const set = (on: boolean) =>
    setParams((prev) => withEvidence(prev, on), { replace: true, preventScrollReset: true })
  return [isEvidenceOnly(params), set]
}

/** A link target for a tab of the issue page that keeps the 「只看 [實證]」 setting. */
export function useTabTo(): (issueNumber: number, tab: IssueTab) => To {
  const [params] = useSearchParams()
  const search = evidenceSearch(params)
  return (issueNumber, tab) => ({ pathname: tabPath(issueNumber, tab), search })
}

/** The 「只看 [實證]」 toggle with a short hint. */
export function EvidenceToggle({ className }: { className?: string }) {
  const [on, setOn] = useEvidenceOnly()
  const hintId = useId()
  return (
    <div className={className}>
      <Toggle variant="outline" pressed={on} onPressedChange={setOn} aria-describedby={hintId} className={toggleOnClass}>
        <ToggleCheck />
        {te.label}
      </Toggle>
      <p id={hintId} className="mt-1 text-sm text-muted-foreground">{te.hint}</p>
    </div>
  )
}

/** The text for a story list that the filter left empty. */
export function EvidenceEmpty() {
  return <p className="mt-2 text-muted-foreground">{te.empty}</p>
}
