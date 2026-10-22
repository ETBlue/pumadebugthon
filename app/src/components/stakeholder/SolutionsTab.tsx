import { DataBasisEmpty, useDataBasisFilter } from '@/components/DataBasisToggle'
import { NeedItem, NeedSummaryLink } from '@/components/NeedItem'
import { CoveredBasisField, SolutionCard } from '@/components/SolutionCard'
import { t } from '@/i18n/zh-TW'
import { solutionCells } from '@/lib/coverage'
import { needsOfStakeholder } from '@/lib/needs'
import { stakeholderSolutionsView } from '@/lib/stakeholderPage'
import { Empty, IssueSection, Part, type StakeholderTabProps } from './IssueSection'

const tp = t.stakeholderPage

/** 解法 (design 3.3). Per issue: the solutions that cover at least one of
 * its needs, each with the needs it covers, then 「尚未有解法涵蓋的需求」.
 * The same need key can show under two issues, so the items get no focus ID. */
export function SolutionsTab({ index, issues, id }: StakeholderTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  // The 資料根據 note is shown once, when some issue shows a solution card.
  const anySolution = issues.some((issue) => stakeholderSolutionsView(issue, id, dataBasedOnly).solutions.length > 0)
  return (
    <div className="space-y-10">
      {issues.map((issue) => {
        const hasNeeds = needsOfStakeholder(issue, id).length > 0
        const v = stakeholderSolutionsView(issue, id, dataBasedOnly)
        const p = `stakeholder-solutions-${issue.number}`
        if (!hasNeeds) {
          return (
            <IssueSection key={issue.number} issue={issue} tab="solutions">
              <Empty>{tp.needsNone}</Empty>
            </IssueSection>
          )
        }
        const filteredOut = dataBasedOnly && v.solutions.length === 0 && v.uncovered.length === 0
        return (
          <IssueSection key={issue.number} issue={issue} tab="solutions">
            {filteredOut ? (
              <DataBasisEmpty />
            ) : (
              <>
                <Part id={`${p}-covering`} title={tp.solutionsHeading}>
                  {v.solutions.length === 0 ? (
                    <Empty>{tp.solutionsNone}</Empty>
                  ) : (
                    <ul className="space-y-3">
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
                  {v.uncovered.length === 0 ? (
                    <Empty>{tp.uncoveredNeedsNone}</Empty>
                  ) : (
                    <ul className="space-y-3">
                      {v.uncovered.map((item) => (
                        <li key={item.need.id}>
                          <NeedItem
                            item={item}
                            issueNumber={issue.number}
                            stakeholders={index.stakeholders}
                            parts={['priority', 'reason']}
                            summaryLink
                            focusTarget={false}
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
      {/* The 資料根據 explanation, once under the lists (decision 112). */}
      {anySolution && <p className="text-sm leading-relaxed text-muted-foreground">{t.basis.listNote('解法')}</p>}
    </div>
  )
}
