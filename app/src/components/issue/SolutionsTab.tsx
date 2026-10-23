import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { LabelledSection, SectionLabelScope } from '@/components/LabelledSection'
import { Markdown } from '@/components/Markdown'
import { NeedSummaryLink } from '@/components/NeedItem'
import { SolutionTitleLink } from '@/components/SolutionCard'
import { CrossSolutionLink } from '@/components/solution/CrossSolutionCard'
import { SpaceLinks } from '@/components/SpaceLinks'
import { cardGridClass, targetLinkClass } from '@/components/styles'
import { useCrossIssueOrNull } from '@/data'
import { t } from '@/i18n/zh-TW'
import { crossSolutionsOfIssue } from '@/lib/crossIssue'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { conflictFocusPath, solutionPath } from '@/lib/entityPaths'
import { solutionsTabView } from '@/lib/issueTabs'
import type { CoveredNeed } from '@/lib/solutionPage'
import { cn } from '@/lib/utils'
import { IssueFilterLayout } from './IssueFilterLayout'
import type { IssueTabProps } from './types'
import { useIssueSpecial, useIssueStakeholder } from './useIssueStakeholder'

const ts = t.solutionsTab
const tm = t.sideMenu
const tx = t.crossIssue

/** The box 「本議題也在跨議題解法中」 (design 3.18): each cross-issue solution
 * with this issue in parts, in code order, and the issue solutions it
 * combines. Nothing without cross-issue.json or without such a solution. */
function CrossIssueBox({ issueNumber }: { issueNumber: number }) {
  const cross = useCrossIssueOrNull()
  const list = crossSolutionsOfIssue(cross, issueNumber)
  if (list.length === 0) return null
  return (
    <aside aria-labelledby="issue-cross-solutions" className="mb-6 rounded-lg border bg-muted/40 p-3 md:p-4">
      <h3 id="issue-cross-solutions" className="font-semibold">{tx.issueBoxHeading}</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {list.map((sol) => (
          <li key={sol.code}>
            <CrossSolutionLink solution={sol} />
            <span className="block text-muted-foreground">
              {tx.issueBoxParts(sol.parts.filter((p) => p.issue === issueNumber).map((p) => p.code))}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

/** One part of 涵蓋的需求 (必須有, or 應該有、可以有): each need with its
 * summary (a link to the need on the 需求 tab) and its stakeholders as plain
 * IDs (design 3.2). Left out when the part has no need. */
function NeedPart({ id, title, needs, issueNumber }: { id: string; title: string; needs: CoveredNeed[]; issueNumber: number }) {
  if (needs.length === 0) return null
  return (
    <LabelledSection headingId={id} className="mt-3">
      <h5 id={id} className="text-sm font-semibold">{title}</h5>
      <ul className="mt-1 space-y-2 text-sm">
        {needs.map((n) => (
          <li key={n.need.id} className="min-w-0 border-l-2 pl-3">
            {/* The tab shows only the needs of the picked stakeholder, and the
                需求 tab with the same filter shows them too, so the link keeps it. */}
            <p><NeedSummaryLink summary={n.summary} issueNumber={issueNumber} needKey={n.need.id} keepStakeholder /></p>
            <p className="mt-0.5 text-muted-foreground">
              {ts.needStakeholders}
              <span className="font-mono">{n.stakeholders.join(t.listSeparator)}</span>
            </p>
          </li>
        ))}
      </ul>
    </LabelledSection>
  )
}

/** 解法 (design 3.2): each solution in letter order, with its summary, space
 * types, the needs it covers (the two parts of step 6.2) and 解開的衝突. With
 * a stakeholder picked in the menu bar (decision 116), only the solutions with one
 * of its needs, and only its needs. The 特別關注 chips work the same way
 * (decision 75). With 只看有資料根據, a solution with none of its shown
 * needs left is not listed (decisions 74 and 77). */
export function SolutionsTab({ index, issue }: IssueTabProps) {
  const [dataBasedOnly] = useDataBasisFilter()
  const [params] = useSearchParams()
  const stakeholder = useIssueStakeholder(index, issue)
  const special = useIssueSpecial(index, issue)
  const view = useMemo(
    () => solutionsTabView(issue, stakeholder, dataBasedOnly, special),
    [issue, stakeholder, dataBasedOnly, special],
  )
  const n = issue.number

  if (issue.solutions.length === 0) return <p>{ts.none}</p>
  return (
    <IssueFilterLayout
      index={index}
      issue={issue}
      current={stakeholder}
      context="issue-solutions"
      shown={tm.shownSolutions(view.length)}
    >
      <CrossIssueBox issueNumber={n} />
      {view.length === 0 && (
        <p className="text-muted-foreground">
          {special !== null
            ? ts.noneFiltered
            : stakeholder !== null
              ? (dataBasedOnly ? ts.noneForStakeholderData : ts.noneForStakeholder)
              : ts.noneData}
        </p>
      )}
      <ul className={cardGridClass}>
        {view.map((item) => {
          const sol = item.solution
          const key = `solution-${sol.id}`
          return (
            <li key={sol.id}>
              <article aria-labelledby={key} className="h-full min-w-0 rounded-lg border p-3 md:p-4">
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
                {/* The solution title is part of the name of these two parts. */}
                <SectionLabelScope id={key}>
                  <NeedPart id={`${key}-must`} title={ts.must} needs={item.must} issueNumber={n} />
                  <NeedPart id={`${key}-should`} title={ts.shouldCould} needs={item.shouldCould} issueNumber={n} />
                </SectionLabelScope>
                {item.otherNeeds > 0 && (
                  <p className="mt-3 text-sm">
                    <Link
                      to={{ pathname: solutionPath(n, sol.id, 'needs'), search: dataBasisFilterSearch(params) }}
                      className={targetLinkClass}
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
                          <Link to={conflictFocusPath(n, c.id, params)} className={cn(targetLinkClass, 'font-mono')}>
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
