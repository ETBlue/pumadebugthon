import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { DataBasisToggle } from '@/components/DataBasisToggle'
import { StakeholderMenu, StakeholderMenuLayout } from '@/components/StakeholderMenu'
import { focusTargetClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { isDataBasisFilterOn } from '@/lib/dataBasis'
import { stakeholderFilterOf } from '@/lib/stakeholderFilter'
import { issueStakeholderIds, wantsTabView } from '@/lib/wantsTab'
import { ConflictsTab } from './ConflictsTab'
import { OpinionTab } from './OpinionTab'
import type { IssueTabProps } from './types'

const tw = t.wantsTab

/** The 訴求 tab of the issue page (design 3.2, decision 38). The stakeholder
 * menu (filter mode) is inside the tab content, so the keyboard order is
 * tabs, menu, content (coordinator decision after the N4 review). From top
 * to bottom: the 「只看有資料根據」 toggle, 「訴求與意見健檢」 (the opinion check
 * with the wants as its pick list), then 「衝突」. With ?stakeholder=<id>, only the
 * wants and the conflicts with a story of that stakeholder show. */
export function WantsTab(props: IssueTabProps) {
  const { index, issue } = props
  const [params] = useSearchParams()
  const ids = useMemo(() => issueStakeholderIds(issue), [issue])
  // The resolved filter (a moved ID becomes the new ID, an ID not in the
  // issue turns the filter off), never the raw ?stakeholder= value.
  const stakeholder = stakeholderFilterOf(params, ids, index.stakeholders)
  const dataBasedOnly = isDataBasisFilterOn(params)
  const view = useMemo(() => wantsTabView(issue, stakeholder, dataBasedOnly), [issue, stakeholder, dataBasedOnly])

  const menu = (
    <StakeholderMenu
      mode="filter"
      ids={ids}
      stakeholders={index.stakeholders}
      current={stakeholder}
      shown={t.stakeholderMenu.shownWants(view.wants.length, view.conflicts.length)}
    />
  )

  return (
    <StakeholderMenuLayout menu={menu}>
      <div className="space-y-10">
        <DataBasisToggle />

        <section aria-labelledby="wants-check-heading" className="space-y-4">
          <h3 id="wants-check-heading" className="text-lg font-semibold">{tw.checkHeading}</h3>
          <p className="leading-relaxed">{tw.intro}</p>
          <OpinionTab {...props} wants={view.wants} filtered={stakeholder !== null} />
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
            dataBasedOnly={dataBasedOnly}
          />
        </section>
      </div>
    </StakeholderMenuLayout>
  )
}
