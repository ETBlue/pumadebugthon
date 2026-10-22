import { useMemo } from 'react'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { NeedItem } from '@/components/NeedItem'
import { proseClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { needsTabView } from '@/lib/issueTabs'
import { priorityLabel } from '@/lib/priority'
import { IssueFilterLayout } from './IssueFilterLayout'
import type { IssueTabProps } from './types'
import { useIssueSpecial, useIssueStakeholder } from './useIssueStakeholder'

const tn = t.needsTab
const tm = t.sideMenu

/** 需求 (design 3.2): the needs of the issue, grouped by priority in the
 * fixed order 必須有, 應該有, 可以有, 這次不做. Inside a group, the order of
 * step 5.2. The stakeholder picker and the 特別關注 toggles in the menu bar
 * (decisions 75 and 116) filter the needs. */
export function NeedsTab({ index, issue }: IssueTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const stakeholder = useIssueStakeholder(index, issue)
  const special = useIssueSpecial(index, issue)
  const view = useMemo(() => needsTabView(issue, stakeholder, dataBasedOnly, special), [issue, stakeholder, dataBasedOnly, special])

  if (view.oldFormat) return <p>{tn.oldFormat}</p>
  return (
    <IssueFilterLayout
      index={index}
      issue={issue}
      current={stakeholder}
      context="issue-needs"
      shown={tm.shownNeeds(view.shown)}
    >
      <p className={`mb-6 text-sm leading-relaxed text-muted-foreground ${proseClass}`}>{tn.intro}</p>
      {view.shown === 0 && (
        <p className="text-muted-foreground">
          {special !== null ? tn.noneFiltered : dataBasedOnly ? tn.dataEmpty : stakeholder !== null ? tn.noneForStakeholder : tn.none}
        </p>
      )}
      <div className="space-y-8">
        {view.groups.map((g) => (
          <section key={g.priority} aria-labelledby={`needs-${g.priority}`}>
            <h3 id={`needs-${g.priority}`} className="text-lg font-semibold">{priorityLabel(g.priority)}</h3>
            <ul className="mt-3 space-y-4">
              {g.items.map((item) => (
                <li key={item.need.id}>
                  <NeedItem item={item} issueNumber={issue.number} stakeholders={index.stakeholders} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </IssueFilterLayout>
  )
}
