import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { DataBasisEmpty, DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { AlsoIn } from '@/components/issue/AlsoIn'
import { LoadState } from '@/components/LoadState'
import { Markdown } from '@/components/Markdown'
import { PageTitle } from '@/components/PageTitle'
import { SpaceLinks } from '@/components/SpaceLinks'
import { StoryList } from '@/components/StoryList'
import { linkClass } from '@/components/styles'
import { TagBadge } from '@/components/TagBadge'
import { useIndex, useIssue } from '@/data'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { findIssue, pendingBySection, tabPath } from '@/lib/issuePage'
import { availableIssues } from '@/lib/issues'
import { priorityLabel } from '@/lib/priority'
import {
  findSolution, solutionConflicts, solutionGroupCoverage, solutionStakeholders, solutionStoryGroups, solutionTitle,
} from '@/lib/solutionPage'
import { stakeholderName } from '@/lib/stakeholders'
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

/** Solution page: #/issues/:number/solutions/:code. One solution with
 * everything the analysis says about it. */
export default function Solution() {
  const index = useIndex()
  const { number } = useParams()
  if (index.status !== 'ready') return <LoadState state={index} />
  const found = findIssue(index.data, number)
  if (found.kind !== 'available') {
    return <NotFound title={tp.issueNotFoundTitle} body={tp.issueNotFoundBody} />
  }
  return <SolutionLoader index={index.data} summary={found.issue} />
}

function SolutionLoader({ index, summary }: { index: IndexFile; summary: AvailableIssueSummary }) {
  const issue = useIssue(summary.folder)
  const { code = '' } = useParams()
  if (issue.status !== 'ready') return <LoadState state={issue} />
  const solution = findSolution(issue.data, code)
  if (!solution) {
    return <NotFound title={tp.notFoundTitle} body={tp.notFoundBody(summary.number, code)} issueNumber={summary.number} />
  }
  return <SolutionContent key={solution.id} index={index} issue={issue.data} solution={solution} />
}

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>
}

function SolutionContent({ index, issue, solution: sol }: { index: IndexFile; issue: IssueFile; solution: SolutionType }) {
  const n = issue.number
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const [dataBasedOnly] = useDataBasisFilter()
  const available = useMemo(() => availableIssues(index).map((i) => i.number), [index])
  const name = (id: string) => stakeholderName(index.stakeholders, id)
  const issueTitle = t.issueCard.numberTitle(n, issue.title)
  const storyGroups = solutionStoryGroups(issue, sol, dataBasedOnly)
  const groups = solutionGroupCoverage(issue, sol)
  const stakeholders = solutionStakeholders(issue, sol)
  const conflicts = solutionConflicts(issue, sol)
  const pending = pendingBySection(sol.pending)
  const tabTo = (tab: 'solutions' | 'conflicts') => ({ pathname: tabPath(n, tab), search })

  return (
    <>
      <PageTitle parts={[solutionTitle(n, sol), tp.titlePart]} />
      <nav aria-label={tp.breadcrumb}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <li><Link to="/" className={linkClass}>{tp.home}</Link></li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li><Link to={{ pathname: tabPath(n, 'overview'), search }} className={linkClass}>{issueTitle}</Link></li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li><Link to={tabTo('solutions')} className={linkClass}>{tp.solutions}</Link></li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li aria-current="page" className="font-mono">{sol.id}</li>
        </ol>
      </nav>

      <h1 className="mt-4 text-2xl font-bold md:text-3xl">
        <span className="mr-2 font-mono">{t.solutionId(n, sol.id)}</span>
        <CellText cell={sol.name} />
      </h1>
      <p className="mt-3 leading-relaxed"><Markdown text={sol.summary} /></p>
      <dl className="mt-3 space-y-1.5 text-sm">
        {sol.spaces.length > 0 && (
          <Field label={tp.spaces}><SpaceLinks spaceTypes={index.spaceTypes} codes={sol.spaces} /></Field>
        )}
        <Field label={tp.added}><time dateTime={sol.added}>{sol.added}</time></Field>
      </dl>

      <div className="mt-8 space-y-10">
        <Part id="solution-stories" title={tp.storiesHeading}>
          <DataBasisToggle className="mb-4" />
          {sol.stories.length === 0 ? (
            <Empty>{tp.storiesNone}</Empty>
          ) : storyGroups.length === 0 ? (
            <DataBasisEmpty />
          ) : (
            storyGroups.map((g) => (
              <section key={g.priority} aria-labelledby={`solution-stories-${g.priority}`} className="mt-4 first:mt-0">
                <h3 id={`solution-stories-${g.priority}`} className="font-semibold">{priorityLabel(g.priority)}</h3>
                <StoryList stories={g.stories} stakeholders={index.stakeholders} />
              </section>
            ))
          )}
        </Part>

        <Part id="solution-groups" title={tp.groupsHeading}>
          {groups.length === 0 ? (
            <Empty>{tp.groupsNone}</Empty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tp.groupsIntro}</p>
              <ul className="mt-3 space-y-3">
                {groups.map(({ group: g, full, covered, stakeholders: members }) => (
                  <li key={g.id} className="rounded-md border p-3">
                    <p>
                      <span className="mr-2 font-mono font-semibold">{g.id}</span>
                      {g.tag && <TagBadge kind={g.tag} className="mr-1.5" />}
                      <Markdown text={g.summary} />
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">{full ? tp.groupFull : tp.groupPartial}</span>
                      {!full && <span className="ml-2 text-muted-foreground">{tp.groupCovered(covered)}</span>}
                    </p>
                    <div className="mt-1 text-sm">
                      <span className="text-muted-foreground">{tp.groupMembers}</span>
                      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {members.map((id) => (
                          <li key={id}><Link to={`/stakeholders/${id}`} className={linkClass}>{name(id)}</Link></li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Part>

        <Part id="solution-stakeholders" title={tp.stakeholdersHeading}>
          {stakeholders.length === 0 ? (
            <Empty>{tp.stakeholdersNone}</Empty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tp.stakeholdersIntro}</p>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {stakeholders.map((id) => (
                  <li key={id} className="flex flex-wrap items-baseline gap-x-2">
                    <Link to={`/stakeholders/${id}`} className={linkClass}>{name(id)}</Link>
                    <span className="font-mono text-xs text-muted-foreground">{id}</span>
                    <AlsoIn stakeholders={index.stakeholders} id={id} issueNumber={n} available={available} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Part>

        <Part id="solution-conflicts" title={tp.conflictsHeading}>
          {conflicts.length === 0 ? (
            <Empty>{tp.conflictsNone}</Empty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tp.conflictsIntro}</p>
              <ul className="mt-3 space-y-3">
                {conflicts.map(({ conflict: c, covered }) => (
                  <li key={c.id} className="rounded-md border p-3">
                    <p>
                      <span className="mr-2 font-mono font-semibold">{c.id}</span>
                      <CellText cell={c.text} />
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{tp.conflictCovered(covered)}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                <Link to={tabTo('conflicts')} className={linkClass}>{tp.conflictsLink(n)}</Link>
              </p>
            </>
          )}
        </Part>

        <Part id="solution-measures" title={tp.measuresHeading}>
          {sol.measures.length === 0 ? (
            <Empty>{tp.measuresNone}</Empty>
          ) : (
            <ul className="space-y-3">
              {sol.measures.map((m, i) => (
                <li key={i} className="rounded-md border p-3">
                  <h3 className="font-medium"><Markdown text={m.metric} /></h3>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    <Field label={tp.baseline}><CellText cell={m.baseline} /></Field>
                    <Field label={tp.source}><Markdown text={m.source} /></Field>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Part>

        <Part id="solution-detail" title={tp.detailHeading}>
          <p className="text-sm text-muted-foreground">{tp.detailIntro}</p>
          <section aria-labelledby="solution-overview" className="mt-4 rounded-md border p-3">
            <h3 id="solution-overview" className="font-semibold">{tp.overviewHeading}</h3>
            <dl className="mt-2 space-y-1.5">
              <Field label={tp.cost}><CellText cell={sol.overview.cost} /></Field>
              <Field label={tp.feasibility}><CellText cell={sol.overview.feasibility} /></Field>
              <Field label={tp.risk}><CellText cell={sol.overview.risk} /></Field>
              <Field label={tp.owner}><CellText cell={sol.overview.owner} /></Field>
            </dl>
          </section>
          <dl className="mt-4 space-y-4">
            {sol.detail.map((r) => (
              <div key={r.item}>
                <dt className="font-semibold">{r.item}</dt>
                <dd className="mt-1 leading-relaxed"><CellText cell={r.content} /></dd>
              </div>
            ))}
          </dl>
        </Part>

        {sol.ideas.length > 0 && (
          <Part id="solution-ideas" title={tp.ideasHeading}>
            <p className="text-sm text-muted-foreground">{tp.ideasIntro}</p>
            <ul className="mt-3 space-y-3">
              {sol.ideas.map((idea, i) => (
                <li key={i} className="rounded-md border p-3">
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-muted-foreground">{tp.idea}</dt>
                      <dd><CellText cell={idea.idea} /></dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">{tp.handling}</dt>
                      <dd><CellText cell={idea.handling} /></dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </Part>
        )}

        <Part id="solution-pending" title={tp.pendingHeading}>
          {pending.length === 0 ? (
            <Empty>{tp.pendingNone}</Empty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tp.pendingIntro}</p>
              {pending.map((g) => (
                <div key={g.section ?? ''} className="mt-4">
                  <h3 className="font-medium">{g.section ?? t.overview.noSection}</h3>
                  <ul className="mt-1 list-disc space-y-2 pl-5">
                    {g.items.map((item, i) => (
                      <li key={i}>
                        {item.context !== null && (
                          <span className="block text-sm text-muted-foreground"><Markdown text={item.context} /></span>
                        )}
                        <Markdown text={item.text} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </Part>

        <nav aria-labelledby="solution-more" className="border-t pt-6">
          <h2 id="solution-more" className="text-xl font-bold">{tp.moreHeading}</h2>
          <ul className="mt-3 space-y-1">
            <li><Link to={tabTo('solutions')} className={linkClass}>{tp.issueSolutionsLink(n)}</Link></li>
            <li><Link to="/solutions" className={linkClass}>{tp.allSolutionsLink}</Link></li>
          </ul>
        </nav>
      </div>
    </>
  )
}
