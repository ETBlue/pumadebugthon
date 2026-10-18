import { useMemo, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { IssueCard } from '@/components/IssueCard'
import { SolutionCard } from '@/components/SolutionCard'
import { containerClass, linkClass } from '@/components/styles'
import { Badge } from '@/components/ui/badge'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { availableIssues } from '@/lib/issues'
import { homeRedirect, recentIssues, recentSolutions, recentStakeholders } from '@/lib/recent'
import type { IndexFile } from '@/types'

const th = t.home

/** How many items each block shows. */
const BLOCK_SIZE = 5

/** Home page (design 3.1): a full-width hero, then three blocks of recent
 * items (3 columns from the lg breakpoint, 1 column below). Each block links
 * to its list page. The order is by date, never by a count. */
export default function Home() {
  const { search } = useLocation()
  const index = useIndex()
  // Old links to the stakeholder filter on the home page (#/?cross=1).
  const redirect = homeRedirect(search)
  if (redirect) return <Navigate to={redirect} replace />
  return (
    <>
      <PageTitle />
      {/* The hero colors are tokens in index.css (.hero-bg). No disclaimer
          here: it is in the footer. */}
      <div className="hero-bg border-b">
        <div className={`${containerClass} py-10 md:py-16`}>
          <h1 className="text-3xl font-bold md:text-4xl">{t.appTitle}</h1>
          <p className="mt-2 text-lg font-medium md:text-xl">{t.appSubtitle}</p>
          <div className="mt-5 max-w-3xl space-y-2 leading-relaxed">
            <p>{th.intro}</p>
            <p>{th.audience}</p>
          </div>
        </div>
      </div>
      <div className={`${containerClass} py-8`}>
        {index.status === 'ready' ? <HomeBlocks index={index.data} /> : <LoadState state={index} />}
      </div>
    </>
  )
}

/** One block: an h2, the items, and a link to the list page. */
function Block({ id, heading, allTo, allLabel, children }: {
  id: string
  heading: string
  allTo: string
  allLabel: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="min-w-0 border-t pt-5">
      <h2 id={id} className="text-xl font-bold">{heading}</h2>
      <div className="mt-3">{children}</div>
      <p className="mt-4">
        <Link to={allTo} className={`${linkClass} font-medium`}>{allLabel}</Link>
      </p>
    </section>
  )
}

function HomeBlocks({ index }: { index: IndexFile }) {
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issueFiles = useIssues(folders)
  const issues = recentIssues(index.issues, BLOCK_SIZE)
  const stakeholders = recentStakeholders(index.stakeholders, BLOCK_SIZE)

  return (
    <div>
      <p className="text-sm text-muted-foreground">{th.sortNote}</p>
      <div className="mt-6 grid gap-10 lg:grid-cols-3 lg:gap-8">
        <Block id="recent-issues" heading={th.issuesHeading} allTo="/issues" allLabel={th.issuesAll}>
          {issues.length === 0 ? (
            <p>{th.issuesNone}</p>
          ) : (
            <ul className="space-y-3">
              {issues.map((issue) => (
                <li key={issue.number}>
                  <IssueCard variant="compact" issue={issue} spaceTypes={index.spaceTypes} />
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block id="recent-stakeholders" heading={th.stakeholdersHeading} allTo="/stakeholders" allLabel={th.stakeholdersAll}>
          {stakeholders.length === 0 ? (
            <p>{th.stakeholdersNone}</p>
          ) : (
            <ul className="divide-y">
              {stakeholders.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link to={`/stakeholders/${s.id}`} className={`${linkClass} font-medium`}>{s.name}</Link>
                    <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                    {s.focus.length > 0 && (
                      <span className="inline-flex flex-wrap gap-1">
                        <span className="sr-only">{th.focusLabel}</span>
                        {s.focus.map((f) => (
                          <Badge key={f} variant="secondary" className="rounded-sm">{f}</Badge>
                        ))}
                      </span>
                    )}
                  </div>
                  <dl className="mt-1 space-y-1 text-sm">
                    {s.issues.length > 0 && (
                      <Field label={th.issues}>
                        <ul className="flex flex-wrap gap-x-3">
                          {s.issues.map((n) => (
                            <li key={n}><Link to={`/issues/${n}`} className={linkClass}>{th.issueLink(n)}</Link></li>
                          ))}
                        </ul>
                      </Field>
                    )}
                    <Field label={th.added}><time dateTime={s.added}>{s.added}</time></Field>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block id="recent-solutions" heading={th.solutionsHeading} allTo="/solutions" allLabel={th.solutionsAll}>
          {issueFiles.status !== 'ready' ? (
            <LoadState state={issueFiles} />
          ) : (
            <RecentSolutionList solutions={recentSolutions(issueFiles.data, BLOCK_SIZE)} />
          )}
        </Block>
      </div>
    </div>
  )
}

function RecentSolutionList({ solutions }: { solutions: ReturnType<typeof recentSolutions> }) {
  if (solutions.length === 0) return <p>{th.solutionsNone}</p>
  return (
    <ul className="space-y-3">
      {solutions.map(({ issueNumber: n, solution: sol }) => (
        <li key={`${n}-${sol.id}`}>
          <SolutionCard variant="compact" solution={sol} issueNumber={n} showIssue>
            <dl className="mt-1 text-sm">
              <Field label={th.solutionAdded}><time dateTime={sol.added}>{sol.added}</time></Field>
            </dl>
          </SolutionCard>
        </li>
      ))}
    </ul>
  )
}
