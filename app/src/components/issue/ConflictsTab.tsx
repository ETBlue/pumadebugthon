import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { ConflictView } from '@/components/ConflictView'
import { focusTargetClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { isDataBasisFilterOn } from '@/lib/dataBasis'
import { wantsTabView } from '@/lib/wantsTab'
import { IssueFilterLayout } from './IssueFilterLayout'
import type { IssueTabProps } from './types'
import { useIssueSpecial, useIssueStakeholder } from './useIssueStakeholder'

const tw = t.wantsTab

/** The 衝突 tab of the issue page (design 3.2, decision 142). Before, the
 * conflicts were a part of the 訴求 tab. IssueFilterLayout puts the menu bar
 * (the stakeholder picker, 特別關注 and 「只看有資料根據」, decision 116) and
 * the filter status line at the top. Then each conflict in file order, as a
 * ConflictView with the element ID focus-<conflict ID>, one per row
 * (decision 139: a conflict card has two sides in it).
 * The filter rules are the ones the 訴求 tab used (wantsTabView):
 * - ?stakeholder=<id>: only the conflicts with a story of that stakeholder
 *   on either side.
 * - ?special=: the same with the stakeholders of the picked groups.
 * - ?evidence=1: hides no conflict. It hides the stories with no data basis
 *   inside each side. */
export function ConflictsTab({ index, issue }: IssueTabProps) {
  const [params] = useSearchParams()
  // The checked filter, never the raw ?stakeholder= value.
  const stakeholder = useIssueStakeholder(index, issue)
  const dataBasedOnly = isDataBasisFilterOn(params)
  const special = useIssueSpecial(index, issue)
  const conflicts = useMemo(
    () => wantsTabView(issue, stakeholder, dataBasedOnly, special).conflicts,
    [issue, stakeholder, dataBasedOnly, special],
  )

  let empty: string | null = null
  if (conflicts.length === 0) {
    empty = issue.conflicts.length === 0
      ? tw.conflictsNone
      : special !== null ? tw.conflictsNoneSpecial : stakeholder !== null ? tw.conflictsNoneFiltered : tw.conflictsNone
  }

  return (
    <IssueFilterLayout
      index={index}
      issue={issue}
      current={stakeholder}
      context="issue-conflicts"
      shown={t.sideMenu.shownConflicts(conflicts.length)}
    >
      {/* focus-conflicts: the target of ?focus=conflicts (design 3.2). */}
      <div id="focus-conflicts" tabIndex={-1} className={focusTargetClass}>
        {empty !== null ? (
          <p>{empty}</p>
        ) : (
          <ul className="space-y-6">
            {conflicts.map((view) => (
              <li key={view.conflict.id}>
                <ConflictView
                  view={view}
                  issue={issue}
                  stakeholders={index.stakeholders}
                  headingLevel={3}
                  dataBasedOnly={dataBasedOnly}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </IssueFilterLayout>
  )
}
