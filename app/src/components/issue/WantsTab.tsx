import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { focusTargetClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { isDataBasisFilterOn } from '@/lib/dataBasis'
import { wantsTabView } from '@/lib/wantsTab'
import { ConflictsTab } from './ConflictsTab'
import { IssueFilterLayout } from './IssueFilterLayout'
import { OpinionTab } from './OpinionTab'
import type { IssueTabProps } from './types'
import { useIssueSpecial, useIssueStakeholder } from './useIssueStakeholder'

const tw = t.wantsTab

/** The 訴求 tab of the issue page (design 3.2, decision 38). IssueFilterLayout
 * puts the menu bar (the stakeholder picker, 特別關注 and 「只看有資料根據」,
 * decision 116) and the filter status line at the top of the tab content.
 * Then the content is: 「訴求與意見健檢」
 * (the opinion check with the wants as its pick list), then 「衝突」. With
 * ?stakeholder=<id>, only the wants and the conflicts with a story of that
 * stakeholder show. ?special= (the 特別關注 toggles) works the same way with
 * the stakeholders of the picked groups (decision 75). */
export function WantsTab(props: IssueTabProps) {
  const { index, issue } = props
  const [params] = useSearchParams()
  // The checked filter (a moved ID or an ID not in the issue turns the
  // filter off), never the raw ?stakeholder= value.
  const stakeholder = useIssueStakeholder(index, issue)
  const dataBasedOnly = isDataBasisFilterOn(params)
  const special = useIssueSpecial(index, issue)
  const view = useMemo(() => wantsTabView(issue, stakeholder, dataBasedOnly, special), [issue, stakeholder, dataBasedOnly, special])

  return (
    <IssueFilterLayout
      index={index}
      issue={issue}
      current={stakeholder}
      context="issue-wants"
      shown={t.sideMenu.shownWants(view.wants.length, view.conflicts.length)}
    >
      <div className="space-y-10">

        <section aria-labelledby="wants-check-heading" className="space-y-4">
          <h3 id="wants-check-heading" className="text-lg font-semibold">{tw.checkHeading}</h3>
          <p className="leading-relaxed">{tw.intro}</p>
          <OpinionTab {...props} wants={view.wants} filtered={stakeholder !== null} specialOn={special !== null} />
        </section>

        <section
          id="focus-conflicts"
          tabIndex={-1}
          aria-labelledby="wants-conflicts-heading"
          className={focusTargetClass}
        >
          <h3 id="wants-conflicts-heading" className="text-lg font-semibold">{tw.conflictsHeading}</h3>
          <ConflictsTab
            conflicts={view.conflicts}
            issue={issue}
            stakeholders={index.stakeholders}
            filtered={stakeholder !== null}
            specialOn={special !== null}
            dataBasedOnly={dataBasedOnly}
          />
        </section>
      </div>
    </IssueFilterLayout>
  )
}
