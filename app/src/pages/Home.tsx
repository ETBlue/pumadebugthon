import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BasisField } from '@/components/BasisField'
import { Field } from '@/components/Field'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { IssueCard } from '@/components/IssueCard'
import { IssueTitleLinks } from '@/components/IssueTitleLinks'
import { CoveredBasisField, SolutionCard } from '@/components/SolutionCard'
import { CrossSolutionCard } from '@/components/solution/CrossSolutionCard'
import { StakeholderCard } from '@/components/StakeholderCard'
import { containerClass, linkClass, proseClass } from '@/components/styles'
import { useCrossIssue, useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { crossSolutionCells, solutionCells, stakeholderCells } from '@/lib/coverage'
import { tabPath } from '@/lib/issuePage'
import { availableIssues, issueNumberTitle, sharedForCard } from '@/lib/issues'
import { HOME_ALL_PATHS } from '@/lib/listParams'
import { recentIssues, recentSolutionItems, recentStakeholders, type RecentSolution } from '@/lib/recent'
import type { CrossIssueFile, IndexFile, IssueFile } from '@/types'

const th = t.home

/** How many items each block shows. */
const BLOCK_SIZE = 5

/** Home page (design 3.1): a full-width hero, then three blocks of recent
 * items (3 columns from the lg breakpoint, 1 column below). Each block links
 * to its list page. The order is by date, never by a count. */
export default function Home() {
  const index = useIndex()
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
            <>
              <ul className="space-y-3">
                {stakeholders.map((s) => (
                  <li key={s.id}>
                    <StakeholderCard variant="compact" stakeholder={s}>
                      <dl className="mt-1 space-y-1 text-sm">
                        {s.issues.length > 0 && (
                          <Field label={th.issues}>
                            {/* With the titles, one per line (decision 112). */}
                            <IssueTitleLinks numbers={s.issues} titles={index.issues} to={(n) => `/issues/${n}`} />
                          </Field>
                        )}
                        {/* 資料根據 needs the issue files (decision 107). */}
                        <BasisField cells={issueFiles.status === 'ready' ? stakeholderCells(issueFiles.data, s.id) : null} />
                        <Field label={th.added}><time dateTime={s.added}>{s.added}</time></Field>
                      </dl>
                    </StakeholderCard>
                  </li>
                ))}
              </ul>
              {/* The 資料根據 explanation, once under the list (decision 107). */}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.basis.listNote('利害關係人')}</p>
            </>
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
              index={index}
              issues={issueFiles.data}
              cross={cross.status === 'ready' ? cross.data : null}
            />
          )}
        </Block>
      </div>
    </div>
  )
}

/** The recent solutions. Each card shows 「涵蓋需求的資料根據」 (the
 * cells of the needs it covers, decision 112) and 新增日期. An issue
 * solution also shows its issue with the title: its code 「#2 A」 has only
 * the number (decision 112). The cross-issue card shows its issues itself. */
function RecentSolutionList({ index, issues, cross }: {
  index: IndexFile
  issues: IssueFile[]
  cross: CrossIssueFile | null
}) {
  const solutions: RecentSolution[] = recentSolutionItems(issues, cross, BLOCK_SIZE)
  if (solutions.length === 0) return <p>{th.solutionsNone}</p>
  const added = (date: string) => <Field label={th.solutionAdded}><time dateTime={date}>{date}</time></Field>
  return (
    <>
      <ul className="space-y-3">
        {solutions.map((item) => {
          if (item.kind === 'cross') {
            const cells = cross === null ? null : crossSolutionCells(cross, item.solution, issues)
            return (
              <li key={item.solution.code}>
                <CrossSolutionCard solution={item.solution} issueTitles={index.issues}>
                  <dl className="mt-1 space-y-1 text-sm">
                    {cells && <CoveredBasisField basis={{ cells, percent: null }} />}
                    {added(item.solution.added)}
                  </dl>
                </CrossSolutionCard>
              </li>
            )
          }
          const issue = issues.find((i) => i.number === item.issueNumber)
          return (
            <li key={`${item.issueNumber}-${item.solution.id}`}>
              <SolutionCard variant="compact" solution={item.solution} issueNumber={item.issueNumber} showIssue>
                <dl className="mt-2 space-y-1 text-sm">
                  <Field label={th.solutionIssue}>
                    <Link to={tabPath(item.issueNumber, 'overview')} className={linkClass}>
                      {issueNumberTitle(index.issues, item.issueNumber)}
                    </Link>
                  </Field>
                  {issue && <CoveredBasisField basis={{ cells: solutionCells(issue, item.solution), percent: null }} />}
                  {added(item.solution.added)}
                </dl>
              </SolutionCard>
            </li>
          )
        })}
      </ul>
      {/* The 資料根據 explanation, once under the list (decision 112). */}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.basis.listNote('解法')}</p>
    </>
  )
}
