import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { NeedItem } from '@/components/NeedItem'
import { cardGridClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { needsTabView } from '@/lib/issueTabs'
import { issueNeeds } from '@/lib/needs'
import { PRIORITIES, priorityLabel } from '@/lib/priority'
import { conflictFilterOf, priorityFilterOf } from '@/lib/stakeholderFilter'
import { IssueFilterLayout } from './IssueFilterLayout'
import type { IssueTabProps } from './types'
import { useIssueSpecial, useIssueStakeholder } from './useIssueStakeholder'

const tn = t.needsTab
const tm = t.sideMenu

/** 需求 (design 3.2): the needs of the issue, grouped by priority in the
 * fixed order 必須有, 應該有, 可以有, 這次不做. Inside a group, the order of
 * step 5.2. The stakeholder picker and the 特別關注 toggles in the menu bar
 * (decisions 75 and 116) filter the needs. Only this tab also has
 * 優先順序 (?priority=) and 只看有衝突的需求 (?conflict=1) in the bar
 * (decision 127). They do not change the tab count 「需求 N」. */
export function NeedsTab({ index, issue }: IssueTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const stakeholder = useIssueStakeholder(index, issue)
  const special = useIssueSpecial(index, issue)
  const [params] = useSearchParams()
  const hasConflicts = issue.conflicts.length > 0
  const priorities = priorityFilterOf(params)
  const conflictOnly = conflictFilterOf(params, hasConflicts)
  const priorityKey = priorities.join(',')
  // priorities is a new array on each render; priorityKey is the real input.
  const value = useMemo(() => ({ priorities, conflictOnly }), [priorityKey, conflictOnly])
  // The priorities that the needs of the issue use, before any filter, so
  // the toggles do not change when another filter changes.
  const priorityOptions = useMemo(() => {
    const used = new Set(issueNeeds(issue).map((i) => i.need.priority))
    return PRIORITIES.filter((p) => used.has(p))
  }, [issue])
  const view = useMemo(
    () => needsTabView(issue, stakeholder, dataBasedOnly, special, value),
    [issue, stakeholder, dataBasedOnly, special, value],
  )
  const extraOn = value.priorities.length > 0 || value.conflictOnly

  if (view.oldFormat) return <p>{tn.oldFormat}</p>
  return (
    <IssueFilterLayout
      index={index}
      issue={issue}
      current={stakeholder}
      context="issue-needs"
      shown={tm.shownNeeds(view.shown)}
      needs={{ priorityOptions, showConflict: hasConflicts, value }}
    >
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{tn.intro}</p>
      {view.shown === 0 && (
        <p className="text-muted-foreground">
          {special !== null || extraOn ? tn.noneFiltered : dataBasedOnly ? tn.dataEmpty : stakeholder !== null ? tn.noneForStakeholder : tn.none}
        </p>
      )}
      <div className="space-y-8">
        {view.groups.map((g) => (
          <section key={g.priority} aria-labelledby={`needs-${g.priority}`}>
            <h3 id={`needs-${g.priority}`} className="text-lg font-semibold">{priorityLabel(g.priority)}</h3>
            <ul className={`mt-3 ${cardGridClass}`}>
              {g.items.map((item) => (
                <li key={item.need.id}>
                  <NeedItem item={item} issueNumber={issue.number} stakeholders={index.stakeholders} className="h-full" />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </IssueFilterLayout>
  )
}
