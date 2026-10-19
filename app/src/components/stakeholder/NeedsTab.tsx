import { DataBasisEmpty, useDataBasisFilter } from '@/components/DataBasisToggle'
import { NeedItem, type NeedPart } from '@/components/NeedItem'
import { t } from '@/i18n/zh-TW'
import { dataBasedNeeds, needsByPriority, needsOfStakeholder } from '@/lib/needs'
import { priorityLabel } from '@/lib/priority'
import { Empty, IssueSection, Part, type StakeholderTabProps } from './IssueSection'

const tp = t.stakeholderPage

/** The need parts on the stakeholder page (design 3.3). */
const NEED_PARTS: readonly NeedPart[] = ['ownStories', 'stakeholders', 'solutions']

/** 需求 (design 3.3). Per issue: its needs grouped by priority in the fixed
 * order 必須有, 應該有, 可以有, 這次不做. Inside a group, the order of step
 * 5.2. The same need key can show under two issues, so the items get no
 * focus ID. */
export function NeedsTab({ index, issues, id }: StakeholderTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  return (
    <div className="space-y-10">
      {issues.map((issue) => {
        const all = needsOfStakeholder(issue, id)
        const groups = needsByPriority(dataBasedOnly ? dataBasedNeeds(all) : all)
        const ownStoriesOf = (key: string) => all.find((n) => n.need.id === key)?.ownStories ?? []
        const p = `stakeholder-needs-${issue.number}`
        return (
          <IssueSection key={issue.number} issue={issue} tab="needs">
            {all.length === 0 ? (
              <Empty>{tp.needsNone}</Empty>
            ) : groups.length === 0 ? (
              <DataBasisEmpty />
            ) : (
              groups.map((g) => (
                <Part key={g.priority} id={`${p}-${g.priority}`} title={priorityLabel(g.priority)}>
                  <ul className="space-y-3">
                    {g.items.map((item) => (
                      <li key={item.need.id}>
                        <NeedItem
                          item={item}
                          issueNumber={issue.number}
                          stakeholders={index.stakeholders}
                          parts={NEED_PARTS}
                          summaryLink
                          others={id}
                          ownStories={ownStoriesOf(item.need.id)}
                          focusTarget={false}
                        />
                      </li>
                    ))}
                  </ul>
                </Part>
              ))
            )}
          </IssueSection>
        )
      })}
    </div>
  )
}
