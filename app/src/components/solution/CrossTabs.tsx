import { useMemo } from 'react'
import { CellText } from '@/components/CellText'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { ItemKey } from '@/components/ItemKey'
import { Markdown } from '@/components/Markdown'
import { NeedSummaryLink } from '@/components/NeedItem'
import { TagBadge } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { crossNeedCoverage, crossNeedGroupsOf, crossStakeholderCoverage } from '@/lib/crossIssue'
import { dataBasedNeeds, issueNeeds, type NeedItem } from '@/lib/needs'
import { priorityLabel } from '@/lib/priority'
import type { CrossIssueFile, CrossNeedGroup, CrossSolution, IndexFile, IssueFile } from '@/types'
import { NeedCoverageParts } from './NeedsTab'
import { PartEmpty, SolutionPart } from './Parts'
import { StakeholderCoverageParts } from './StakeholdersTab'

const tp = t.solutionPage
const tx = t.crossIssue

/** One X-N group (design 3.18): the summary with its tag, the priority (or
 * 「各議題的優先順序不同」), the reason, and its issue needs as links to the
 * issue's 需求 tab. An X-N group has no page and no link. The need list
 * follows the 「只看有資料根據」 setting. */
function CrossNeedGroupCard({ group: g, issues }: { group: CrossNeedGroup; issues: IssueFile[] }) {
  const [dataBasedOnly] = useDataBasisFilter()
  const key = `cross-group-${g.id}`
  const items = g.needs.flatMap((m) => {
    const issue = issues.find((i) => i.number === m.issue)
    const item = issue && issueNeeds(issue).find((i) => i.need.id === m.id)
    return item ? [{ issueNumber: m.issue, item }] : []
  })
  const keep = new Set<NeedItem>(dataBasedOnly ? dataBasedNeeds(items.map((i) => i.item)) : items.map((i) => i.item))
  const shown = items.filter((i) => keep.has(i.item))
  return (
    <article aria-labelledby={key} className="rounded-md border p-3">
      <h4 id={key} className="font-semibold">
        <span className="mr-2 font-mono">{g.id}</span>
        {g.tag && <TagBadge kind={g.tag} className="mr-1.5" />}
        <Markdown text={g.summary} />
      </h4>
      <dl className="mt-2 space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{tx.groupPriority}</dt>
          <dd>
            {g.priority === null || g.prioritiesDiffer ? (
              tx.prioritiesDiffer
            ) : (
              <>
                {g.priorityTag && <TagBadge kind={g.priorityTag} className="mr-1.5" />}
                {priorityLabel(g.priority)}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{tx.groupReason}</dt>
          <dd><CellText cell={g.reason} /></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{tx.groupNeeds}</dt>
          <dd>
            {shown.length === 0 ? (
              <p className="text-muted-foreground">{tp.needsFilteredNone}</p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {shown.map(({ issueNumber, item }) => (
                  <li key={`${issueNumber}-${item.need.id}`}>
                    <span className="mr-1.5 text-muted-foreground">{tx.issueLink(issueNumber)}</span>
                    <NeedSummaryLink summary={item.summary} issueNumber={issueNumber} needKey={item.need.id} />
                    <ItemKey issueNumber={issueNumber} value={item.need.id} className="ml-2 text-xs" muted />
                    <span className="ml-2 text-muted-foreground">{priorityLabel(item.need.priority)}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </article>
  )
}

/** The 需求 tab of a cross-issue solution (design 3.18): the toggle,
 * 「跨議題的共同需求」, then one h3 per issue with the covered and the not
 * covered needs of that issue (NeedCoverageParts). */
export function CrossNeedsTab({ data, index, issues, solution }: {
  data: CrossIssueFile
  index: IndexFile
  issues: IssueFile[]
  solution: CrossSolution
}) {
  const groups = crossNeedGroupsOf(data, solution)
  const coverage = useMemo(() => crossNeedCoverage(data, solution, issues), [data, solution, issues])
  const title = (n: number) => {
    const issue = issues.find((i) => i.number === n)
    return issue ? t.issueCard.numberTitle(n, issue.title) : `#${n}`
  }
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <div className="space-y-12">
        <SolutionPart id="cross-groups" title={tx.groupsHeading}>
          {groups.length === 0 ? (
            <PartEmpty>{tx.groupsNone}</PartEmpty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tx.groupsIntro}</p>
              <ul className="mt-3 space-y-3">
                {groups.map((g) => <li key={g.id}><CrossNeedGroupCard group={g} issues={issues} /></li>)}
              </ul>
            </>
          )}
        </SolutionPart>

        {/* A line above each issue, so the issue h3 stands apart from the h4 parts under it. */}
        {coverage.map(({ issueNumber, coverage: c }) => (
          <div key={issueNumber} className="border-t pt-6">
            <SolutionPart id={`cross-issue-${issueNumber}`} title={title(issueNumber)}>
              <NeedCoverageParts
                issueNumber={issueNumber}
                coverage={c}
                solutionId={solution.code}
                stakeholders={index.stakeholders}
                headingLevel={4}
                idPrefix={`cross-needs-${issueNumber}`}
                focusTarget={false}
              />
            </SolutionPart>
          </div>
        ))}
      </div>
    </>
  )
}

/** The 利害關係人 tab of a cross-issue solution (design 3.18): as for an
 * issue solution, with the needs of each stakeholder split by issue. */
export function CrossStakeholdersTab({ data, index, issues, solution }: {
  data: CrossIssueFile
  index: IndexFile
  issues: IssueFile[]
  solution: CrossSolution
}) {
  const entries = useMemo(() => crossStakeholderCoverage(data, solution, issues), [data, solution, issues])
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <StakeholderCoverageParts index={index} covered={entries.covered} notCovered={entries.notCovered} showIssue />
    </>
  )
}
