import { useMemo, type ReactNode } from 'react'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Heading, type HeadingLevel } from '@/components/Heading'
import { AlsoInLine } from '@/components/issue/AlsoIn'
import { NeedSummaryLink } from '@/components/NeedItem'
import { SolutionTitleLink } from '@/components/SolutionCard'
import { StakeholderCard } from '@/components/StakeholderCard'
import { t } from '@/i18n/zh-TW'
import { availableIssues } from '@/lib/issues'
import {
  dataBasedCoverage, solutionStakeholderCoverage, stakeholderEntries,
  type CoveredNeed, type NotCoveredNeed, type StakeholderEntry,
} from '@/lib/solutionPage'
import { findStakeholder } from '@/lib/stakeholders'
import type { IndexFile, IssueFile, Solution } from '@/types'
import { PartEmpty } from './Parts'
import { ItemKey } from '@/components/ItemKey'

const tp = t.solutionPage

function CoveredList({ items, issueNumber }: { items: CoveredNeed[]; issueNumber: number }) {
  return (
    <ul className="mt-1 space-y-1.5">
      {items.map((item) => (
        <li key={item.need.id}>
          <NeedSummaryLink summary={item.summary} issueNumber={issueNumber} needKey={item.need.id} />
          <ItemKey issueNumber={issueNumber} value={item.need.id} className="ml-2 text-xs" muted />
        </li>
      ))}
    </ul>
  )
}

function NotCoveredList({ items, issueNumber }: { items: NotCoveredNeed[]; issueNumber: number }) {
  return (
    <ul className="mt-1 space-y-2">
      {items.map((item) => (
        <li key={item.need.id}>
          <NeedSummaryLink summary={item.summary} issueNumber={issueNumber} needKey={item.need.id} />
          <ItemKey issueNumber={issueNumber} value={item.need.id} className="ml-2 text-xs" muted />
          <p className="mt-0.5 text-muted-foreground">
            {item.otherSolutions.length === 0 ? (
              tp.otherSolutionsNone
            ) : (
              <>
                {tp.otherSolutions}
                {item.otherSolutions.map((sol, i) => (
                  <span key={sol.id}>
                    {i > 0 && t.listSeparator}
                    <SolutionTitleLink solution={sol} issueNumber={issueNumber} />
                  </span>
                ))}
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}

/** The needs of one stakeholder, per issue: 「涵蓋的需求」 and, when there are
 * any, 「未涵蓋的需求」. The issue name shows only with showIssue. */
function StakeholderNeeds({ entry, issueTitle, showIssue }: {
  entry: StakeholderEntry
  issueTitle: (n: number) => string
  showIssue: boolean
}) {
  const [dataBasedOnly] = useDataBasisFilter()
  const issues = entry.issues.map((i) => ({ issueNumber: i.issueNumber, ...dataBasedCoverage(i, dataBasedOnly) }))
  if (issues.every((i) => i.covered.length === 0 && i.notCovered.length === 0)) {
    return <p className="mt-2 text-sm text-muted-foreground">{tp.needsFilteredNone}</p>
  }
  return (
    <div className="mt-2 space-y-3 text-sm">
      {issues.map((i) => (
        <div key={i.issueNumber}>
          {showIssue && <p className="font-medium">{issueTitle(i.issueNumber)}</p>}
          {i.covered.length > 0 && (
            <div className="mt-1">
              <p className="text-muted-foreground">{tp.stakeholderCovered}</p>
              <CoveredList items={i.covered} issueNumber={i.issueNumber} />
            </div>
          )}
          {i.notCovered.length > 0 && (
            <div className="mt-2">
              <p className="text-muted-foreground">{tp.stakeholderNotCovered}</p>
              <NotCoveredList items={i.notCovered} issueNumber={i.issueNumber} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export interface StakeholderCoveragePartsProps {
  index: IndexFile
  /** The covered and the not covered stakeholders, in ID order, each with
   * its needs split by issue (stakeholderEntries, or the cross-issue version
   * in Task N11). */
  covered: StakeholderEntry[]
  notCovered: StakeholderEntry[]
  /** Show the issue name above the needs of each issue. Default false (one
   * issue). Task N11 sets it for a cross-issue solution. */
  showIssue?: boolean
  /** Extra content at the end of each card, before the needs. The issue
   * solution passes the 「也出現在」 mark (AlsoInLine). */
  cardExtra?: (id: string) => ReactNode
  /** The level of the two part headings. Default 3. */
  headingLevel?: HeadingLevel
}

/** The two parts of the 利害關係人 tab (design 3.12): 「涵蓋的利害關係人」 and
 * 「未涵蓋的利害關係人」, each in ID order (never by count). Each stakeholder
 * is a compact StakeholderCard with its needs. The needs follow the
 * 「只看有資料根據」 setting; the stakeholder lists do not change, like the
 * tab counts (decision 49). */
export function StakeholderCoverageParts({
  index, covered, notCovered, showIssue = false, cardExtra, headingLevel = 3,
}: StakeholderCoveragePartsProps) {
  const issueTitle = (n: number) => {
    const issue = index.issues.find((i) => i.number === n)
    return issue ? t.issueCard.numberTitle(n, issue.title) : `#${n}`
  }
  const part = (id: string, title: string, intro: string, none: string, list: StakeholderEntry[]) => (
    <section aria-labelledby={id}>
      <Heading level={headingLevel} id={id} className="text-xl font-bold">{title}</Heading>
      {list.length === 0 ? (
        <div className="mt-3"><PartEmpty>{none}</PartEmpty></div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {list.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <StakeholderCard variant="compact" stakeholder={findStakeholder(index.stakeholders, entry.id)}>
                  {cardExtra?.(entry.id)}
                  <StakeholderNeeds entry={entry} issueTitle={issueTitle} showIssue={showIssue} />
                </StakeholderCard>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )

  return (
    <div className="space-y-10">
      {part('solution-stakeholders-covered', tp.coveredStakeholdersHeading, tp.coveredStakeholdersIntro,
        tp.coveredStakeholdersNone, covered)}
      {part('solution-stakeholders-not-covered', tp.notCoveredStakeholdersHeading, tp.notCoveredStakeholdersIntro,
        tp.notCoveredStakeholdersNone, notCovered)}
    </div>
  )
}

/** The 利害關係人 tab of an issue solution (design 3.12): the 「只看有資料根據」
 * toggle, then StakeholderCoverageParts with the 「也出現在」 mark. */
export function StakeholdersTab({ index, issue, solution }: { index: IndexFile; issue: IssueFile; solution: Solution }) {
  const entries = useMemo(
    () => stakeholderEntries(issue.number, solutionStakeholderCoverage(issue, solution)),
    [issue, solution],
  )
  const available = useMemo(() => availableIssues(index).map((i) => i.number), [index])
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <StakeholderCoverageParts
        index={index}
        covered={entries.covered}
        notCovered={entries.notCovered}
        cardExtra={(id) => <AlsoInLine index={index} id={id} issueNumber={issue.number} available={available} />}
      />
    </>
  )
}
