import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Markdown } from '@/components/Markdown'
import { NeedSummaryLink } from '@/components/NeedItem'
import { SolutionTitleLink } from '@/components/SolutionCard'
import { SpaceLinks } from '@/components/SpaceLinks'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { conflictFocusPath, solutionPath } from '@/lib/entityPaths'
import { solutionsTabView } from '@/lib/issueTabs'
import type { CoveredNeed } from '@/lib/solutionPage'
import { cn } from '@/lib/utils'
import { IssueFilterLayout } from './IssueFilterLayout'
import type { IssueTabProps } from './types'
import { useIssueStakeholder } from './useIssueStakeholder'

const ts = t.solutionsTab
const tm = t.stakeholderMenu

/** One part of 涵蓋的需求 (必須有, or 應該有、可以有): each need with its
 * summary (a link to the need on the 需求 tab) and its stakeholders as plain
 * IDs (design 3.2). Left out when the part has no need. */
function NeedPart({ id, title, needs, issueNumber }: { id: string; title: string; needs: CoveredNeed[]; issueNumber: number }) {
  if (needs.length === 0) return null
  return (
    <section aria-labelledby={id} className="mt-3">
      <h5 id={id} className="text-sm font-semibold">{title}</h5>
      <ul className="mt-1 space-y-2 text-sm">
        {needs.map((n) => (
          <li key={n.need.id} className="min-w-0 border-l-2 pl-3">
            <p><NeedSummaryLink summary={n.summary} issueNumber={issueNumber} needKey={n.need.id} /></p>
            <p className="mt-0.5 text-muted-foreground">
              {ts.needStakeholders}
              <span className="font-mono">{n.stakeholders.join('、')}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 解法 (design 3.2): each solution in letter order, with its summary, space
 * types, the needs it covers (the two parts of step 6.2) and 解開的衝突. With
 * a stakeholder picked in the menu, only the solutions with one
 * of its needs, and only its needs. */
export function SolutionsTab({ index, issue }: IssueTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const [params] = useSearchParams()
  const stakeholder = useIssueStakeholder(index, issue)
  const view = useMemo(() => solutionsTabView(issue, stakeholder, dataBasedOnly), [issue, stakeholder, dataBasedOnly])
  const n = issue.number

  if (issue.solutions.length === 0) return <p>{ts.none}</p>
  return (
    <IssueFilterLayout
      index={index}
      issue={issue}
      current={stakeholder}
      shown={stakeholder === null ? undefined : tm.shownSolutions(view.length)}
    >
      <DataBasisToggle className="mb-6" />
      {view.length === 0 && <p className="text-muted-foreground">{ts.noneForStakeholder}</p>}
      <ul className="space-y-6">
        {view.map((item) => {
          const sol = item.solution
          const key = `solution-${sol.id}`
          return (
            <li key={sol.id}>
              <article aria-labelledby={key} className="min-w-0 rounded-lg border p-3 md:p-4">
                <h3 id={key} className="text-lg font-semibold">
                  <SolutionTitleLink solution={sol} issueNumber={n} />
                </h3>
                <p className="mt-2"><Markdown text={sol.summary} /></p>
                {sol.spaces.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-2 text-sm">
                    <span className="text-muted-foreground">{ts.spaces}</span>
                    <SpaceLinks spaceTypes={index.spaceTypes} codes={sol.spaces} />
                  </div>
                )}

                <h4 id={`${key}-needs`} className="mt-4 font-medium">{ts.needs}</h4>
                {sol.needs === null && <p className="mt-1 text-sm text-muted-foreground">{ts.needsNone}</p>}
                {item.emptyByData && <p className="mt-1 text-sm text-muted-foreground">{ts.dataEmpty}</p>}
                <NeedPart id={`${key}-must`} title={ts.must} needs={item.must} issueNumber={n} />
                <NeedPart id={`${key}-should`} title={ts.shouldCould} needs={item.shouldCould} issueNumber={n} />
                {item.otherNeeds > 0 && (
                  <p className="mt-3 text-sm">
                    <Link
                      to={{ pathname: solutionPath(n, sol.id, 'needs'), search: dataBasisFilterSearch(params) }}
                      className={linkClass}
                    >
                      {ts.otherNeeds(item.otherNeeds)}
                    </Link>
                  </p>
                )}

                {item.wayOutConflicts.length > 0 && (
                  <>
                    <h4 id={`${key}-wayout`} className="mt-4 font-medium">{ts.wayOut}</h4>
                    <ul aria-labelledby={`${key}-wayout`} className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      {item.wayOutConflicts.map((c) => (
                        <li key={c.id}>
                          <Link to={conflictFocusPath(n, c.id, dataBasedOnly)} className={cn(linkClass, 'font-mono')}>
                            {c.id}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </article>
            </li>
          )
        })}
      </ul>
    </IssueFilterLayout>
  )
}
