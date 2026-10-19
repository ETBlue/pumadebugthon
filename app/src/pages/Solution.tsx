import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { PageTabs } from '@/components/PageTabs'
import { CellText } from '@/components/CellText'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { Markdown } from '@/components/Markdown'
import { PageTitle } from '@/components/PageTitle'
import { SpaceLinks } from '@/components/SpaceLinks'
import { linkClass } from '@/components/styles'
import { NeedsTab } from '@/components/solution/NeedsTab'
import { OverviewTab } from '@/components/solution/OverviewTab'
import { StakeholdersTab } from '@/components/solution/StakeholdersTab'
import { useIndex, useIssue } from '@/data'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { parseSolutionSlug, parseSolutionTab, SOLUTION_TABS, solutionPath, type SolutionTab } from '@/lib/entityPaths'
import { findIssue, tabPath } from '@/lib/issuePage'
import { findSolution, solutionTitle } from '@/lib/solutionPage'
import { solutionTabCounts } from '@/lib/tabCounts'
import type { AvailableIssueSummary, IndexFile, IssueFile, Solution as SolutionType } from '@/types'

const tp = t.solutionPage

/** The links shown when the issue or the solution is not found. */
function NotFound({ title, body, issueNumber }: { title: string; body: string; issueNumber?: number }) {
  return (
    <>
      <PageTitle parts={[title]} />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3">{body}</p>
      <ul className="mt-3 space-y-1">
        {issueNumber !== undefined && (
          <li><Link to={tabPath(issueNumber, 'solutions')} className={linkClass}>{tp.issueSolutionsLink(issueNumber)}</Link></li>
        )}
        <li><Link to="/solutions" className={linkClass}>{tp.allSolutionsLink}</Link></li>
        {issueNumber === undefined && <li><Link to="/issues" className={linkClass}>{tp.issuesLink}</Link></li>}
        <li><Link to="/" className={linkClass}>{tp.backHome}</Link></li>
      </ul>
    </>
  )
}

/** Solution page (design 3.12): #/solutions/:slug/:tab?, for example
 * #/solutions/2-A/needs. One solution with everything the analysis says
 * about it. The old #/issues/<n>/solutions/<code> redirects here (router). */
export default function Solution() {
  const index = useIndex()
  const { slug = '' } = useParams()
  if (index.status !== 'ready') return <LoadState state={index} />
  const parsed = parseSolutionSlug(slug)
  // A cross-issue solution (X-A) comes with Task N11 of plan.md. Until then
  // it shows the "not found" message.
  if (parsed === null || parsed.kind === 'cross') {
    return <NotFound title={tp.notFoundTitle} body={tp.slugNotFoundBody(slug)} />
  }
  const found = findIssue(index.data, String(parsed.issueNumber))
  if (found.kind !== 'available') {
    return <NotFound title={tp.issueNotFoundTitle} body={tp.issueNotFoundBody} />
  }
  return <SolutionLoader index={index.data} summary={found.issue} code={parsed.code} />
}

function SolutionLoader({ index, summary, code }: { index: IndexFile; summary: AvailableIssueSummary; code: string }) {
  const issue = useIssue(summary.folder)
  if (issue.status !== 'ready') return <LoadState state={issue} />
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
  const tabLabel = (name: SolutionTab) =>
    name === 'overview' ? tp.tabs.overview : tp.tabLabels[name](counts[name].covered, counts[name].notCovered)

  return (
    <>
      <PageTitle parts={[solutionTitle(n, sol), tab && tab !== 'overview' ? tp.tabs[tab] : null, tp.titlePart]} />
      <nav aria-label={tp.breadcrumb}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <li><Link to="/" className={linkClass}>{tp.home}</Link></li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li><Link to={{ pathname: '/solutions', search }} className={linkClass}>{tp.solutions}</Link></li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li aria-current="page" className="font-mono">{t.solutionId(n, sol.id)}</li>
        </ol>
      </nav>

      <h1 className="mt-4 text-2xl font-bold md:text-3xl">
        <span className="mr-1 font-mono">{t.solutionId(n, sol.id)}</span>{' '}
        <CellText cell={sol.name} />
      </h1>
      <p className="mt-2">
        {tp.issueLine}
        <Link to={{ pathname: tabPath(n, 'overview'), search }} className={linkClass}>{issueTitle}</Link>
      </p>
      <p className="mt-3 leading-relaxed"><Markdown text={sol.summary} /></p>
      <dl className="mt-3 space-y-1.5 text-sm">
        {sol.spaces.length > 0 && (
          <Field label={tp.spaces}><SpaceLinks spaceTypes={index.spaceTypes} codes={sol.spaces} /></Field>
        )}
        <Field label={tp.added}><time dateTime={sol.added}>{sol.added}</time></Field>
      </dl>

      <PageTabs
        label={tp.tabsLabel}
        tabs={SOLUTION_TABS}
        current={tab}
        nameOf={(name) => tp.tabs[name]}
        labelOf={tabLabel}
        pathOf={(name) => solutionPath(n, sol.id, name)}
        notFound={tp.tabNotFound}
        overviewPath={solutionPath(n, sol.id)}
        overviewLink={tp.goToOverview}
      >
        {(name) =>
          name === 'overview' ? (
            <OverviewTab index={index} issue={issue} solution={sol} />
          ) : name === 'needs' ? (
            <NeedsTab issue={issue} solution={sol} stakeholders={index.stakeholders} />
          ) : (
            <StakeholdersTab index={index} issue={issue} solution={sol} />
          )}
      </PageTabs>
    </>
  )
}
