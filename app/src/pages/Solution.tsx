import { useMemo, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { PageBand, PageBody, type BackTarget } from '@/components/PageBand'
import { PageTabs } from '@/components/PageTabs'
import { CellText } from '@/components/CellText'
import { DateFields } from '@/components/DateFields'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { Markdown } from '@/components/Markdown'
import { PageTitle } from '@/components/PageTitle'
import { SpaceLinks } from '@/components/SpaceLinks'
import { linkClass, targetLinkClass } from '@/components/styles'
import { CrossIssueLinks } from '@/components/solution/CrossSolutionCard'
import { CrossOverviewTab } from '@/components/solution/CrossOverviewTab'
import { ConcernsTab } from '@/components/solution/ConcernsTab'
import { ConflictsTab, CrossConflictsTab } from '@/components/solution/ConflictsTab'
import { CrossNeedsTab, CrossStakeholdersTab } from '@/components/solution/CrossTabs'
import { CrossMeasuresTab, MeasuresTab } from '@/components/solution/MeasuresTab'
import { NeedsTab } from '@/components/solution/NeedsTab'
import { OverviewTab } from '@/components/solution/OverviewTab'
import { PlanTab } from '@/components/solution/PlanTab'
import { PoliciesTab } from '@/components/solution/PoliciesTab'
import { StakeholdersTab } from '@/components/solution/StakeholdersTab'
import { CrossWantsTab, WantsTab } from '@/components/solution/WantsTab'
import { TagBadge } from '@/components/TagBadge'
import { useCrossIssue, useIndex, useIssue, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { backListPath } from '@/lib/backLink'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { crossCoverageIssueNumbers, crossSolutionTabCounts, crossSolutionTitle, findCrossSolution } from '@/lib/crossIssue'
import {
  crossSolutionPath, parseSolutionSlug, parseSolutionTab, SOLUTION_TABS, solutionPath, type SolutionTab,
} from '@/lib/entityPaths'
import { findIssue, tabPath } from '@/lib/issuePage'
import { findSolution, solutionTitle } from '@/lib/solutionPage'
import { crossSummaryRefTo, summaryRefTo } from '@/lib/summary'
import { solutionTabCounts, solutionTabLabel } from '@/lib/tabCounts'
import type { AvailableIssueSummary, CrossIssueFile, CrossSolution, IndexFile, IssueFile, Solution as SolutionType } from '@/types'

const tp = t.solutionPage
const tx = t.crossIssue

/** The name of a tab for its hidden h2 (decision 103). 相關政策 uses its full
 * name 「相關或類似的政策與做法」. The page title uses the short tab name. */
const tabHeading = (name: SolutionTab) => (name === 'policies' ? tp.policiesHeading : tp.tabs[name])

/** The back button of the band (decision 111): the solution list, with the
 * sort, filters and search the reader last used there in this session. */
const backToSolutions = (): BackTarget => ({ to: backListPath('solutions'), label: t.backLink.solutions })

/** The links shown when the issue or the solution is not found. */
function NotFound({ title, body, issueNumber }: { title: string; body: string; issueNumber?: number }) {
  return (
    <PageBody>
      <PageTitle parts={[title]} />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3">{body}</p>
      <ul className="mt-3 space-y-1">
        {issueNumber !== undefined && (
          <li><Link to={tabPath(issueNumber, 'solutions')} className={targetLinkClass}>{tp.issueSolutionsLink(issueNumber)}</Link></li>
        )}
        <li><Link to="/solutions" className={targetLinkClass}>{tp.allSolutionsLink}</Link></li>
        {issueNumber === undefined && <li><Link to="/issues" className={targetLinkClass}>{tp.issuesLink}</Link></li>}
        <li><Link to="/" className={targetLinkClass}>{tp.backHome}</Link></li>
      </ul>
    </PageBody>
  )
}

/** Solution page (design 3.12): #/solutions/:slug/:tab?, for example
 * #/solutions/2-A/needs. One solution with everything the analysis says
 * about it. */
export default function Solution() {
  const index = useIndex()
  const { slug = '' } = useParams()
  if (index.status !== 'ready') return <PageBody><LoadState state={index} /></PageBody>
  const parsed = parseSolutionSlug(slug)
  if (parsed === null) {
    return <NotFound title={tp.notFoundTitle} body={tp.slugNotFoundBody(slug)} />
  }
  if (parsed.kind === 'cross') return <CrossSolutionLoader index={index.data} code={parsed.code} />
  const found = findIssue(index.data, String(parsed.issueNumber))
  if (found.kind !== 'available') {
    // A known issue with no analysis yet still gets the link to its 解法 tab (design 3.12).
    const known = found.kind === 'unavailable' ? found.issue.number : undefined
    return <NotFound title={tp.issueNotFoundTitle} body={tp.issueNotFoundBody} issueNumber={known} />
  }
  return <SolutionLoader index={index.data} summary={found.issue} code={parsed.code} />
}

function SolutionLoader({ index, summary, code }: { index: IndexFile; summary: AvailableIssueSummary; code: string }) {
  const issue = useIssue(summary.folder)
  if (issue.status !== 'ready') return <PageBody><LoadState state={issue} /></PageBody>
  const solution = findSolution(issue.data, code)
  if (!solution) {
    return <NotFound title={tp.notFoundTitle} body={tp.notFoundBody(summary.number, code)} issueNumber={summary.number} />
  }
  return <SolutionContent key={solution.id} index={index} issue={issue.data} solution={solution} />
}

function SolutionContent({ index, issue, solution: sol }: { index: IndexFile; issue: IssueFile; solution: SolutionType }) {
  const n = issue.number
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const issueTitle = t.issueCard.numberTitle(n, issue.title)
  const tab = parseSolutionTab(useParams().tab)
  const counts = useMemo(() => solutionTabCounts(issue, sol), [issue, sol])
  const refTarget = (ref: string, dataBasedOnly: boolean) => summaryRefTo(ref, n, issue, dataBasedOnly)

  return (
    <>
      <PageTitle parts={[solutionTitle(n, sol), tab && tab !== 'overview' ? tp.tabs[tab] : null, tp.titlePart]} />
      <PageBand back={backToSolutions()}>
        <span className="mr-1 font-mono">{t.solutionId(n, sol.id)}</span>{' '}
        <CellText cell={sol.name} />
      </PageBand>

      <PageBody>
        <PageTabs
          label={tp.tabsLabel}
          tabs={SOLUTION_TABS}
          current={tab}
          nameOf={tabHeading}
          labelOf={(name) => solutionTabLabel(name, counts)}
          scrollOnPhone
          pathOf={(name) => solutionPath(n, sol.id, name)}
          notFound={tp.tabNotFound}
          overviewPath={solutionPath(n, sol.id)}
          overviewLink={tp.goToOverview}
        >
          {(name) => {
            switch (name) {
              case 'overview':
                return (
                  <>
                    {/* The metadata is at the top of 總覽 (decision 111). */}
                    <SolutionMeta
                      spaces={sol.spaces}
                      added={sol.added}
                      updated={sol.updated}
                      summary={sol.summary}
                      index={index}
                      issueLine={
                        <>
                          {tp.issueLine}
                          <Link to={{ pathname: tabPath(n, 'overview'), search }} className={linkClass}>{issueTitle}</Link>
                        </>
                      }
                    />
                    <OverviewTab issue={issue} solution={sol} />
                  </>
                )
              case 'needs': return <NeedsTab issue={issue} solution={sol} stakeholders={index.stakeholders} />
              case 'wants': return <WantsTab index={index} issue={issue} solution={sol} />
              case 'stakeholders': return <StakeholdersTab index={index} issue={issue} solution={sol} />
              case 'conflicts': return <ConflictsTab index={index} issue={issue} solution={sol} />
              case 'controversies':
              case 'legal':
                return <ConcernsTab tab={name} solution={sol} targetOf={refTarget} step7Source={tp.step7Source} />
              case 'plan': return <PlanTab solution={sol} />
              case 'measures': return <MeasuresTab solution={sol} />
              case 'policies': return <PoliciesTab practices={sol.practices} issueNumber={n} targetOf={refTarget} />
            }
          }}
        </PageTabs>
      </PageBody>
    </>
  )
}

/** A cross-issue solution (design 3.18): #/solutions/X-A. Without
 * cross-issue.json, or with an unknown code, it shows the "not found"
 * message. */
function CrossSolutionLoader({ index, code }: { index: IndexFile; code: string }) {
  const cross = useCrossIssue()
  if (cross.status !== 'ready') return <PageBody><LoadState state={cross} /></PageBody>
  const solution = findCrossSolution(cross.data, code)
  if (cross.data === null || solution === null) {
    return <NotFound title={tp.notFoundTitle} body={tx.notFoundBody(code)} />
  }
  return <CrossIssueFilesLoader key={solution.code} index={index} data={cross.data} solution={solution} />
}

/** Loads the issue files like the issue page does: the issues in parts,
 * plus the issues of the needs the solution covers, for example #1 for
 * X-E through its group X-N03 (crossCoverageIssueNumbers, decision 60). */
function CrossIssueFilesLoader({ index, data, solution }: { index: IndexFile; data: CrossIssueFile; solution: CrossSolution }) {
  const folders = useMemo(
    () =>
      crossCoverageIssueNumbers(data, solution).flatMap(
        (n) => index.issues.find((i) => i.number === n && i.available)?.folder ?? [],
      ),
    [index, data, solution],
  )
  const issues = useIssues(folders)
  if (issues.status !== 'ready') return <PageBody><LoadState state={issues} /></PageBody>
  return <CrossSolutionContent index={index} data={data} issues={issues.data} solution={solution} />
}

function CrossSolutionContent({ index, data, issues, solution: sol }: {
  index: IndexFile
  data: CrossIssueFile
  issues: IssueFile[]
  solution: CrossSolution
}) {
  const tab = parseSolutionTab(useParams().tab)
  const counts = useMemo(() => crossSolutionTabCounts(data, sol, issues), [data, sol, issues])
  const common = { data, index, issues, solution: sol }
  const stakeholderIds = useMemo(() => new Set(index.stakeholders.map((s) => s.id)), [index])
  const refTarget = (ref: string, dataBasedOnly: boolean) => crossSummaryRefTo(ref, stakeholderIds, dataBasedOnly)

  return (
    <>
      <PageTitle parts={[crossSolutionTitle(sol), tab && tab !== 'overview' ? tp.tabs[tab] : null, tp.titlePart]} />
      <PageBand back={backToSolutions()}>
        <span className="mr-1 font-mono">{sol.code}</span>{' '}
        {sol.tag && <TagBadge kind={sol.tag} className="mr-1.5" />}
        {sol.name}
      </PageBand>

      <PageBody>
        <PageTabs
          label={tp.tabsLabel}
          tabs={SOLUTION_TABS}
          current={tab}
          nameOf={tabHeading}
          labelOf={(name) => solutionTabLabel(name, counts)}
          scrollOnPhone
          pathOf={(name) => crossSolutionPath(sol.code, name)}
          notFound={tp.tabNotFound}
          overviewPath={crossSolutionPath(sol.code)}
          overviewLink={tp.goToOverview}
        >
          {(name) => {
            switch (name) {
              case 'overview':
                return (
                  <>
                    {/* The metadata is at the top of 總覽 (decision 111). */}
                    <SolutionMeta
                      spaces={sol.spaces}
                      added={sol.added}
                      updated={sol.updated}
                      summary={sol.summary}
                      index={index}
                      issueLine={
                        <>
                          {tx.issueLine}
                          <CrossIssueLinks solution={sol} />
                        </>
                      }
                    />
                    <CrossOverviewTab {...common} />
                  </>
                )
              case 'needs': return <CrossNeedsTab {...common} />
              case 'wants': return <CrossWantsTab {...common} />
              case 'stakeholders': return <CrossStakeholdersTab {...common} />
              case 'conflicts': return <CrossConflictsTab {...common} />
              case 'controversies':
              case 'legal':
                return <ConcernsTab tab={name} solution={sol} targetOf={refTarget} step7Source={tp.crossStep7Source} />
              case 'plan': return <PlanTab solution={sol} />
              case 'measures': return <CrossMeasuresTab solution={sol} />
              case 'policies': return <PoliciesTab practices={sol.practices} issueNumber={null} targetOf={refTarget} />
            }
          }}
        </PageTabs>
      </PageBody>
    </>
  )
}

/** The metadata of a solution at the top of the 總覽 tab (decision 111): the
 * 議題 line, the summary, the space types, 新增日期 and 更新日期 (decision
 * 131). */
function SolutionMeta({ issueLine, summary, spaces, added, updated, index }: {
  issueLine: ReactNode
  summary: string
  spaces: string[]
  added: string
  updated?: string | null
  index: IndexFile
}) {
  return (
    <div className="mb-8">
      <p>{issueLine}</p>
      <p className="mt-3 leading-relaxed"><Markdown text={summary} /></p>
      <dl className="mt-3 space-y-1.5 text-sm">
        {spaces.length > 0 && (
          <Field label={tp.spaces}><SpaceLinks spaceTypes={index.spaceTypes} codes={spaces} /></Field>
        )}
        <DateFields added={added} updated={updated} />
      </dl>
    </div>
  )
}
