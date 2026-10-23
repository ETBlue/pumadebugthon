import { ConflictView } from '@/components/ConflictView'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { t } from '@/i18n/zh-TW'
import { stakeholderConflictViews } from '@/lib/stakeholderPage'
import { Empty, IssueSection, type StakeholderTabProps } from './IssueSection'

const tp = t.stakeholderPage

/** 衝突 (design 3.3, decision 142). Before, this was a part of the 訴求 tab.
 * Per issue: the conflicts with one of its stories on a side, in file order,
 * each with the other side's stories, 雙方的需求, 以需求為本的解方 and the
 * method. One conflict per row: a conflict card has two sides in it
 * (decision 139). 「只看有資料根據」 hides no conflict. It hides the stories
 * with no data basis. The same conflict ID can show under two issues, so the
 * items get no focus ID. */
export function ConflictsTab({ index, issues, id }: StakeholderTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  return (
    <div className="space-y-10">
      {issues.map((issue) => {
        const conflicts = stakeholderConflictViews(issue, id)
        return (
          <IssueSection key={issue.number} issue={issue} tab="conflicts">
            {conflicts.length === 0 ? (
              <Empty>{tp.conflictsNone}</Empty>
            ) : (
              <ul className="space-y-4">
                {conflicts.map((c) => (
                  <li key={c.view.conflict.id}>
                    <ConflictView
                      view={c.view}
                      issue={issue}
                      stakeholders={index.stakeholders}
                      headingLevel={3}
                      otherStories={c.otherStories}
                      dataBasedOnly={dataBasedOnly}
                      focusTarget={false}
                    />
                  </li>
                ))}
              </ul>
            )}
          </IssueSection>
        )
      })}
    </div>
  )
}
