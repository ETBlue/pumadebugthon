import { availableIssues, sharedStakeholders } from '@/lib/issues'
import { evidenceShare } from '@/lib/coverage'
import type { IndexFile, IssueSummary } from '@/types'
import { IssueCard } from './IssueCard'

/** The issue cards of #/issues (design 3.23.1 and 3.23.9). The page filters,
 * searches and sorts the list. This component only shows it, in the order
 * it gets. headingLevel is the level of each card title. showShare: true
 * while the 依資料根據比例 sort is on, so each card shows its share. */
export function IssueList({ index, issues, headingLevel, showShare = false }: {
  index: IndexFile
  issues: IssueSummary[]
  headingLevel: 2 | 3
  showShare?: boolean
}) {
  const multi = availableIssues(index).length >= 2
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {issues.map((issue) => (
        <li key={issue.number}>
          <IssueCard
            variant="detailed"
            issue={issue}
            spaceTypes={index.spaceTypes}
            shared={multi && issue.available ? sharedStakeholders(index.stakeholders, issue.number) : null}
            share={showShare && issue.available ? evidenceShare(issue.counts.cells) : null}
            headingLevel={headingLevel}
          />
        </li>
      ))}
    </ul>
  )
}
