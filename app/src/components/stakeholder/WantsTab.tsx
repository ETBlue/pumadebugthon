import { ConflictView } from '@/components/ConflictView'
import { DataBasisEmpty, useDataBasisFilter } from '@/components/DataBasisToggle'
import { cardGridClass } from '@/components/styles'
import { WantItem, type WantPart } from '@/components/WantItem'
import { t } from '@/i18n/zh-TW'
import { dataBasedPickList } from '@/lib/dataBasis'
import { stakeholderConflictViews } from '@/lib/stakeholderPage'
import { wantsOfStakeholder } from '@/lib/wantList'
import { Empty, IssueSection, Part, type StakeholderTabProps } from './IssueSection'

const tp = t.stakeholderPage

/** The want parts on the stakeholder page (design 3.3). */
const WANT_PARTS: readonly WantPart[] = ['stakeholders', 'conflicts', 'pickLink']

/** 訴求 (design 3.3). Per issue: its wants in the order of the pick list,
 * then its conflicts with the other side's stories. The same want key or
 * conflict ID can show under two issues, so the items get no focus ID. */
export function WantsTab({ index, issues, id }: StakeholderTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  return (
    <div className="space-y-10">
      {issues.map((issue) => {
        const all = wantsOfStakeholder(issue, id)
        // The same rule as the issue's 訴求 tab: keep a want when one of its
        // stories has a data-based tag.
        const keep = new Set(dataBasedPickList(all, issue.stories).map((w) => w.key))
        const wants = dataBasedOnly ? all.filter((w) => keep.has(w.key)) : all
        const conflicts = stakeholderConflictViews(issue, id)
        const p = `stakeholder-wants-${issue.number}`
        return (
          <IssueSection key={issue.number} issue={issue} tab="wants">
            <Part id={`${p}-wants`} title={tp.wantsHeading}>
              {all.length === 0 ? (
                <Empty>{tp.wantsNone}</Empty>
              ) : wants.length === 0 ? (
                <DataBasisEmpty />
              ) : (
                <ul className={cardGridClass}>
                  {wants.map((w) => (
                    <li key={w.key}>
                      <WantItem
                        item={w}
                        issueNumber={issue.number}
                        stakeholders={index.stakeholders}
                        parts={WANT_PARTS}
                        summaryLink
                        others={id}
                        focusTarget={false}
                        className="h-full"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Part>

            {/* One conflict per row: a conflict card has two sides in it. */}
            <Part id={`${p}-conflicts`} title={tp.conflicts}>
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
                        otherStories={c.otherStories}
                        dataBasedOnly={dataBasedOnly}
                        focusTarget={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Part>
          </IssueSection>
        )
      })}
    </div>
  )
}
