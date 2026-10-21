import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { Field } from '@/components/Field'
import { LabelledSection } from '@/components/LabelledSection'
import { AlsoInLine } from '@/components/issue/AlsoIn'
import { IssueCard } from '@/components/IssueCard'
import { LoadState } from '@/components/LoadState'
import { SolutionCard } from '@/components/SolutionCard'
import { SpaceLinks } from '@/components/SpaceLinks'
import { StakeholderCard } from '@/components/StakeholderCard'
import { linkClass, proseClass } from '@/components/styles'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { PageTitle } from '@/components/PageTitle'
import { availableIssues, sharedForCard } from '@/lib/issues'
import {
  findSpaceType, issuesBySpace, otherSpaces, solutionsBySpace, stakeholdersBySpace, stakeholdersInSeveralIssues,
} from '@/lib/spaces'
import { findStakeholder } from '@/lib/stakeholders'
import type { IndexFile, IssueFile, SpaceType } from '@/types'

const tp = t.spacePage

/** Space page (design 3.6): #/spaces/:code. City space is limited, so this
 * page lists what competes for the same space. */
export default function Space() {
  const index = useIndex()
  const { code = '' } = useParams()
  if (index.status !== 'ready') return <LoadState state={index} />

  const space = findSpaceType(index.data.spaceTypes, code)
  if (!space) {
    return (
      <>
        <PageTitle parts={[tp.notFoundTitle]} />
        <h1 className="text-2xl font-bold">{tp.notFoundTitle}</h1>
        <p className="mt-3">{tp.notFoundBody(code)}</p>
        <p className="mt-3">
          <Link to="/" className={linkClass}>{tp.backHome}</Link>
        </p>
      </>
    )
  }
  return <SpaceContent key={code} index={index.data} space={space} />
}

function SpaceContent({ index, space }: { index: IndexFile; space: SpaceType }) {
  const summaries = useMemo(() => issuesBySpace(index, space.code), [index, space.code])
  const folders = useMemo(() => summaries.map((i) => i.folder), [summaries])
  const issues = useIssues(folders)

  return (
    <>
      <PageTitle parts={[space.name]} />
      <h1 className="text-2xl font-bold md:text-3xl">{space.name}</h1>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Field label={tp.group}>{space.group}</Field>
        {space.description && <Field label={tp.description}>{space.description}</Field>}
      </dl>
      <p className={`mt-4 leading-relaxed ${proseClass}`}>{tp.intro}</p>

      <div className="mt-8 space-y-10">
        <section aria-labelledby="space-issues">
          <h2 id="space-issues" className="text-xl font-bold">{tp.issuesHeading}</h2>
          {summaries.length === 0 ? (
            <p className="mt-2">{tp.issuesNone}</p>
          ) : (
            <>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summaries.map((i) => (
                  <li key={i.number}>
                    <IssueCard variant="compact" issue={i} spaceTypes={index.spaceTypes} shared={sharedForCard(index, i)} />
                  </li>
                ))}
              </ul>
              {/* The 資料根據 explanation, once under the list (decision 72). */}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.basis.listNote('議題')}</p>
            </>
          )}
        </section>

        {summaries.length > 0 &&
          (issues.status === 'ready' ? (
            <SpaceDetails index={index} code={space.code} issues={issues.data} />
          ) : (
            <LoadState state={issues} />
          ))}
      </div>
    </>
  )
}

function SpaceDetails({ index, code, issues }: { index: IndexFile; code: string; issues: IssueFile[] }) {
  const solutions = solutionsBySpace(issues, code)
  const stakeholders = stakeholdersBySpace(issues, code)
  const shared = stakeholdersInSeveralIssues(stakeholders)
  const available = availableIssues(index).map((i) => i.number)
  const sorted = [...issues].sort((a, b) => a.number - b.number)
  const title = (n: number) => t.issueCard.numberTitle(n, sorted.find((i) => i.number === n)?.title ?? '')

  return (
    <>
      <LabelledSection headingId="space-solutions">
        <h2 id="space-solutions" className="text-xl font-bold">{tp.solutionsHeading}</h2>
        {solutions.length === 0 ? (
          <p className="mt-2">{tp.solutionsNone}</p>
        ) : (
          sorted
            .filter((issue) => solutions.some((s) => s.issueNumber === issue.number))
            .map((issue) => (
              <LabelledSection key={issue.number} headingId={`space-solutions-${issue.number}`} className="mt-4">
                <h3 id={`space-solutions-${issue.number}`} className="font-semibold">{title(issue.number)}</h3>
                <ul className="mt-2 space-y-3">
                  {solutions
                    .filter((s) => s.issueNumber === issue.number)
                    .map(({ solution: sol }) => {
                      const others = otherSpaces(sol, code)
                      return (
                        <li key={sol.id}>
                          <SolutionCard
                            variant="compact"
                            solution={sol}
                            issueNumber={issue.number}
                          >
                            {others.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-x-2 text-sm">
                                <span className="text-muted-foreground">{tp.otherSpaces}</span>
                                <SpaceLinks spaceTypes={index.spaceTypes} codes={others} />
                              </div>
                            )}
                          </SolutionCard>
                        </li>
                      )
                    })}
                </ul>
              </LabelledSection>
            ))
        )}
      </LabelledSection>

      <LabelledSection headingId="space-stakeholders">
        <h2 id="space-stakeholders" className="text-xl font-bold">{tp.stakeholdersHeading}</h2>
        {stakeholders.length === 0 ? (
          <p className="mt-2">{tp.stakeholdersNone}</p>
        ) : (
          <>
            <p className="mt-2 text-muted-foreground">{tp.stakeholdersIntro}</p>

            <LabelledSection headingId="space-shared" className="mt-4 rounded-lg border-2 border-foreground/40 p-4">
              <h3 id="space-shared" className="font-semibold">{tp.sharedHeading}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tp.sharedIntro}</p>
              {shared.length === 0 ? (
                <p className="mt-2">{tp.sharedNone}</p>
              ) : (
                <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                  {shared.map((s) => (
                    <li key={s.id}>
                      <StakeholderCard variant="compact" stakeholder={findStakeholder(index.stakeholders, s.id)}>
                        <p className="mt-1 text-sm text-muted-foreground">{tp.sharedIssues(s.issues)}</p>
                      </StakeholderCard>
                    </li>
                  ))}
                </ul>
              )}
            </LabelledSection>

            <h3 className="mt-6 font-semibold">{tp.byIssueHeading}</h3>
            {stakeholders.map((entry) => (
              <LabelledSection key={entry.issueNumber} headingId={`space-people-${entry.issueNumber}`} className="mt-3">
                <h4 id={`space-people-${entry.issueNumber}`} className="font-medium">{title(entry.issueNumber)}</h4>
                <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                  {entry.stakeholders.map((id) => (
                    <li key={id}>
                      <StakeholderCard variant="compact" stakeholder={findStakeholder(index.stakeholders, id)}>
                        <AlsoInLine index={index} id={id} issueNumber={entry.issueNumber} available={available} />
                      </StakeholderCard>
                    </li>
                  ))}
                </ul>
              </LabelledSection>
            ))}
          </>
        )}
      </LabelledSection>
    </>
  )
}
