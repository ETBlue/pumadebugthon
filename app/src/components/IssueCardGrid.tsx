import { IssueCard } from '@/components/IssueCard'
import { cardGridClass } from '@/components/styles'
import { sharedForCard } from '@/lib/issues'
import type { AvailableIssueSummary, IndexFile } from '@/types'

/** A list of issues as compact cards in the card grid of the tabs
 * (cardGridClass, decision 139). The 議題 tab of the space page uses it.
 * The stakeholder page's 議題 tab used it too (decision 145), until decision
 * 147 gave each issue its own section. It needs only index.json. */
export function IssueCardGrid({ index, issues }: { index: IndexFile; issues: AvailableIssueSummary[] }) {
  return (
    <ul className={cardGridClass}>
      {issues.map((i) => (
        <li key={i.number}>
          <IssueCard variant="compact" issue={i} spaceTypes={index.spaceTypes} shared={sharedForCard(index, i)} />
        </li>
      ))}
    </ul>
  )
}
