import { useMemo, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { IssueCard } from '@/components/IssueCard'
import { SolutionCard } from '@/components/SolutionCard'
import { CrossSolutionCard } from '@/components/solution/CrossSolutionCard'
import { StakeholderCard } from '@/components/StakeholderCard'
import { containerClass, linkClass, proseClass } from '@/components/styles'
import { useCrossIssue, useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { availableIssues, sharedForCard } from '@/lib/issues'
import { HOME_ALL_PATHS } from '@/lib/listParams'
import { homeRedirect, recentIssues, recentSolutionItems, recentStakeholders, type RecentSolution } from '@/lib/recent'
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
          <div className={`mt-5 space-y-2 leading-relaxed ${proseClass}`}>
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
    <section aria-labelledby={id} className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-xl font-bold">{heading}</h2>
        {/* The visible text is the same in all 3 blocks, so the accessible
            name keeps the list name (for example 看全部議題). */}
        <Link to={allTo} aria-label={allLabel} className={`${linkClass} text-sm font-medium`}>{th.all}</Link>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function HomeBlocks({ index }: { index: IndexFile }) {
  const folders = useMemo(() => availableIssues(index).map((i) => i.folder), [index])
  const issueFiles = useIssues(folders)
  const cross = useCrossIssue()
  const issues = recentIssues(index.issues, BLOCK_SIZE)
  const stakeholders = recentStakeholders(index.stakeholders, BLOCK_SIZE)

  return (
    <div>
      <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
        <Block id="recent-issues" heading={th.issuesHeading} allTo={HOME_ALL_PATHS.issues} allLabel={th.issuesAll}>
          {issues.length === 0 ? (
            <p>{th.issuesNone}</p>
          ) : (
            <>
              <ul className="space-y-3">
                {issues.map((issue) => (
                  <li key={issue.number}>
                    <IssueCard variant="compact" issue={issue} spaceTypes={index.spaceTypes} shared={sharedForCard(index, issue)} />
                  </li>
                ))}
              </ul>
              {/* The 資料根據 explanation, once under the list (decision 72). */}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.basis.listNote('議題')}</p>
            </>
          )}
        </Block>

        <Block id="recent-stakeholders" heading={th.stakeholdersHeading} allTo={HOME_ALL_PATHS.stakeholders} allLabel={th.stakeholdersAll}>
          {stakeholders.length === 0 ? (
            <p>{th.stakeholdersNone}</p>
          ) : (
            <ul className="space-y-3">
              {stakeholders.map((s) => (
                <li key={s.id}>
                  <StakeholderCard variant="compact" stakeholder={s}>
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
                  </StakeholderCard>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block id="recent-solutions" heading={th.solutionsHeading} allTo={HOME_ALL_PATHS.solutions} allLabel={th.solutionsAll}>
          {issueFiles.status !== 'ready' ? (
            <LoadState state={issueFiles} />
          ) : cross.status === 'loading' ? (
            <LoadState state={cross} />
          ) : (
            // The cross-issue solutions are included because they have a date
            // (decision 51). A cross-issue file that fails to load is left out.
            <RecentSolutionList
              solutions={recentSolutionItems(issueFiles.data, cross.status === 'ready' ? cross.data : null, BLOCK_SIZE)}
            />
          )}
        </Block>
      </div>
    </div>
  )
}

function RecentSolutionList({ solutions }: { solutions: RecentSolution[] }) {
  if (solutions.length === 0) return <p>{th.solutionsNone}</p>
  const added = (date: string) => (
    <dl className="mt-1 text-sm">
      <Field label={th.solutionAdded}><time dateTime={date}>{date}</time></Field>
    </dl>
  )
  return (
    <ul className="space-y-3">
      {solutions.map((item) =>
        item.kind === 'cross' ? (
          <li key={item.solution.code}>
            <CrossSolutionCard solution={item.solution}>{added(item.solution.added)}</CrossSolutionCard>
          </li>
        ) : (
          <li key={`${item.issueNumber}-${item.solution.id}`}>
            <SolutionCard variant="compact" solution={item.solution} issueNumber={item.issueNumber} showIssue>
              {added(item.solution.added)}
            </SolutionCard>
          </li>
        ),
      )}
    </ul>
  )
}
