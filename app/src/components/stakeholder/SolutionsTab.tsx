import { useMemo } from 'react'
import { DataBasisEmpty, useDataBasisFilter } from '@/components/DataBasisToggle'
import { LabelledSection } from '@/components/LabelledSection'
import { NeedItem, NeedSummaryLink } from '@/components/NeedItem'
import { CoveredBasisField, SolutionCard } from '@/components/SolutionCard'
import { CrossSolutionCard } from '@/components/solution/CrossSolutionCard'
import { cardGridClass } from '@/components/styles'
import { useCrossIssueOrNull, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import {
  crossSolutionCells, solutionCells, stakeholderCrossSolutions, stakeholderUncoveredNeeds, type StakeholderCrossSolution,
} from '@/lib/coverage'
import { availableIssues } from '@/lib/issues'
import { needsOfStakeholder } from '@/lib/needs'
import { stakeholderSolutionsView } from '@/lib/stakeholderPage'
import { Empty, IssueSection, Part, type StakeholderTabProps } from './IssueSection'

const tp = t.stakeholderPage

/** 解法 (design 3.3). Per issue: the solutions that cover at least one of
 * its needs, each with the needs it covers, then 「尚未有解法涵蓋的需求」.
 * That list leaves out the needs that a cross-issue solution covers
 * (stakeholderUncoveredNeeds, decision 124), because they are listed under
 * 「跨議題解法」.
 * Then 「跨議題解法」: the cross-issue solutions that cover at least one of
 * its needs (decision 119). The tab label counts the same solutions
 * (stakeholderSolutionCount). Without cross-issue.json, or while it loads or
 * when it fails to load, the cross-issue part is left out.
 * The same need key can show under two issues, so the items get no focus ID. */
export function SolutionsTab({ index, issues, id }: StakeholderTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const cross = useCrossIssueOrNull()
  const allCross = stakeholderCrossSolutions(issues, cross, id)
  const shownCross = dataBasedOnly ? stakeholderCrossSolutions(issues, cross, id, true) : allCross
  return (
    <div className="space-y-10">
      {issues.map((issue) => {
        const hasNeeds = needsOfStakeholder(issue, id).length > 0
        const v = stakeholderSolutionsView(issue, id, dataBasedOnly)
        const uncovered = stakeholderUncoveredNeeds(issue, cross, id, dataBasedOnly)
        // Some needs are covered only by a cross-issue solution.
        const crossOnly = uncovered.length < v.uncovered.length
        const p = `stakeholder-solutions-${issue.number}`
        if (!hasNeeds) {
          return (
            <IssueSection key={issue.number} issue={issue} tab="solutions">
              <Empty>{tp.needsNone}</Empty>
            </IssueSection>
          )
        }
        // v.uncovered, not uncovered: a need covered only by a cross-issue
        // solution still passes the filter.
        const filteredOut = dataBasedOnly && v.solutions.length === 0 && v.uncovered.length === 0
        return (
          <IssueSection key={issue.number} issue={issue} tab="solutions">
            {filteredOut ? (
              <DataBasisEmpty />
            ) : (
              <>
                <Part id={`${p}-covering`} title={tp.solutionsHeading}>
                  {v.solutions.length === 0 ? (
                    <Empty>{crossOnly ? tp.solutionsNoneCrossOnly : tp.solutionsNone}</Empty>
                  ) : (
                    <ul className={cardGridClass}>
                      {v.solutions.map(({ solution, needs }) => (
                        <li key={solution.id}>
                          <SolutionCard variant="compact" solution={solution} issueNumber={issue.number}>
                            {/* The cells of all the needs it covers (decision 112). */}
                            <dl className="mt-2 text-sm">
                              <CoveredBasisField basis={{ cells: solutionCells(issue, solution), percent: null }} />
                            </dl>
                            <div className="mt-2 text-sm">
                              <p className="text-muted-foreground">{tp.coveredNeeds}</p>
                              <ul className="mt-1 space-y-1">
                                {needs.map((n) => (
                                  <li key={n.need.id}>
                                    <NeedSummaryLink summary={n.summary} issueNumber={issue.number} needKey={n.need.id} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </SolutionCard>
                        </li>
                      ))}
                    </ul>
                  )}
                </Part>

                <Part id={`${p}-uncovered`} title={tp.uncoveredNeeds}>
                  {uncovered.length === 0 ? (
                    <Empty>{tp.uncoveredNeedsNone}</Empty>
                  ) : (
                    <ul className={cardGridClass}>
                      {uncovered.map((item) => (
                        <li key={item.need.id}>
                          <NeedItem
                            item={item}
                            issueNumber={issue.number}
                            stakeholders={index.stakeholders}
                            parts={['priority', 'reason']}
                            summaryLink
                            focusTarget={false}
                            className="h-full"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </Part>
              </>
            )}
          </IssueSection>
        )
      })}
      {allCross.length > 0 && <CrossSolutionsSection index={index} shown={shownCross} />}
    </div>
  )
}

/** 「跨議題解法」 of the 解法 tab (decision 119): the cross-issue solution
 * cards as on the home page, each with 「涵蓋需求的資料根據」 and the needs
 * of this stakeholder that it covers. The 資料根據 cells count every need
 * the solution covers in every analyzed issue, as on the home page, so they
 * wait for all the issue files. shown is empty when the 「只看有資料根據」
 * filter leaves nothing. */
function CrossSolutionsSection({ index, shown }: { index: StakeholderTabProps['index']; shown: StakeholderCrossSolution[] }) {
  const cross = useCrossIssueOrNull()
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const allIssues = useIssues(folders)
  const headingId = 'stakeholder-solutions-cross'
  return (
    <LabelledSection headingId={headingId} className="space-y-6 border-t pt-6">
      <h2 id={headingId} className="text-xl font-bold">{tp.crossSolutionsHeading}</h2>
      {shown.length === 0 ? (
        <DataBasisEmpty />
      ) : (
        <div>
          <p className="text-sm text-muted-foreground">{tp.crossSolutionsIntro}</p>
          <ul className={`mt-3 ${cardGridClass}`}>
            {shown.map(({ solution, needs }) => {
              const cells = cross !== null && allIssues.status === 'ready'
                ? crossSolutionCells(cross, solution, allIssues.data)
                : null
              return (
                <li key={solution.code}>
                  <CrossSolutionCard solution={solution} issueTitles={index.issues} className="h-full">
                    {cells && (
                      <dl className="mt-2 text-sm">
                        <CoveredBasisField basis={{ cells, percent: null }} />
                      </dl>
                    )}
                    <div className="mt-2 text-sm">
                      <p className="text-muted-foreground">{tp.coveredNeeds}</p>
                      <ul className="mt-1 space-y-1">
                        {needs.map(({ issueNumber, item }) => (
                          <li key={`${issueNumber}:${item.need.id}`}>
                            <span className="mr-1.5 text-muted-foreground">{t.crossIssue.issueLink(issueNumber)}</span>
                            <NeedSummaryLink summary={item.summary} issueNumber={issueNumber} needKey={item.need.id} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CrossSolutionCard>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </LabelledSection>
  )
}
