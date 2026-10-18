import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { AlsoIn } from '@/components/issue/AlsoIn'
import { LoadState } from '@/components/LoadState'
import { Markdown } from '@/components/Markdown'
import { SpaceLinks } from '@/components/SpaceLinks'
import { linkClass } from '@/components/styles'
import { useIndex, useIssues } from '@/data'
import { t } from '@/i18n/zh-TW'
import { tabPath } from '@/lib/issuePage'
import { availableIssues } from '@/lib/issues'
import {
  findSpaceType, issuesBySpace, otherSpaces, solutionsBySpace, stakeholdersBySpace, stakeholdersInSeveralIssues,
} from '@/lib/spaces'
import { stakeholderName } from '@/lib/stakeholders'
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
      <h1 className="text-2xl font-bold md:text-3xl">{space.name}</h1>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">{tp.group}</dt>
          <dd>{space.group}</dd>
        </div>
        {space.description && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">{tp.description}</dt>
            <dd>{space.description}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 leading-relaxed">{tp.intro}</p>

      <div className="mt-8 space-y-10">
        <section aria-labelledby="space-issues">
          <h2 id="space-issues" className="text-xl font-bold">{tp.issuesHeading}</h2>
          {summaries.length === 0 ? (
            <p className="mt-2">{tp.issuesNone}</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {summaries.map((i) => (
                <li key={i.number}>
                  <Link to={tabPath(i.number, 'overview')} className={linkClass}>
                    {t.issueCard.numberTitle(i.number, i.title)}
                  </Link>
                </li>
              ))}
            </ul>
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
  const name = (id: string) => stakeholderName(index.stakeholders, id)

  return (
    <>
      <section aria-labelledby="space-solutions">
        <h2 id="space-solutions" className="text-xl font-bold">{tp.solutionsHeading}</h2>
        {solutions.length === 0 ? (
          <p className="mt-2">{tp.solutionsNone}</p>
        ) : (
          sorted
            .filter((issue) => solutions.some((s) => s.issueNumber === issue.number))
            .map((issue) => (
              <section key={issue.number} aria-labelledby={`space-solutions-${issue.number}`} className="mt-4">
                <h3 id={`space-solutions-${issue.number}`} className="font-semibold">{title(issue.number)}</h3>
                <ul className="mt-2 space-y-3">
                  {solutions
                    .filter((s) => s.issueNumber === issue.number)
                    .map(({ solution: sol }) => {
                      const others = otherSpaces(sol, code)
                      return (
                        <li key={sol.id} className="rounded-md border p-3">
                          <p className="font-medium">
                            <span className="mr-2 font-mono">{sol.id}</span>
                            <CellText cell={sol.name} />
                          </p>
                          <p className="mt-1 text-sm"><Markdown text={sol.summary} /></p>
                          {others.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-x-2 text-sm">
                              <span className="text-muted-foreground">{tp.otherSpaces}</span>
                              <SpaceLinks spaceTypes={index.spaceTypes} codes={others} />
                            </div>
                          )}
                          <p className="mt-1 text-sm">
                            <Link to={tabPath(issue.number, 'solutions')} className={linkClass}>
                              {tp.solutionLink(sol.id)}
                            </Link>
                          </p>
                        </li>
                      )
                    })}
                </ul>
              </section>
            ))
        )}
      </section>

      <section aria-labelledby="space-stakeholders">
        <h2 id="space-stakeholders" className="text-xl font-bold">{tp.stakeholdersHeading}</h2>
        {stakeholders.length === 0 ? (
          <p className="mt-2">{tp.stakeholdersNone}</p>
        ) : (
          <>
            <p className="mt-2 text-muted-foreground">{tp.stakeholdersIntro}</p>

            <section aria-labelledby="space-shared" className="mt-4 rounded-lg border-2 border-foreground/40 p-4">
              <h3 id="space-shared" className="font-semibold">{tp.sharedHeading}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tp.sharedIntro}</p>
              {shared.length === 0 ? (
                <p className="mt-2">{tp.sharedNone}</p>
              ) : (
                <ul className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {shared.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-baseline gap-x-2">
                      <Link to={`/stakeholders/${s.id}`} className={linkClass}>{name(s.id)}</Link>
                      <span className="text-sm text-muted-foreground">{tp.sharedIssues(s.issues)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <h3 className="mt-6 font-semibold">{tp.byIssueHeading}</h3>
            {stakeholders.map((entry) => (
              <section key={entry.issueNumber} aria-labelledby={`space-people-${entry.issueNumber}`} className="mt-3">
                <h4 id={`space-people-${entry.issueNumber}`} className="font-medium">{title(entry.issueNumber)}</h4>
                <ul className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {entry.stakeholders.map((id) => (
                    <li key={id} className="flex flex-wrap items-baseline gap-x-2">
                      <Link to={`/stakeholders/${id}`} className={linkClass}>{name(id)}</Link>
                      <AlsoIn stakeholders={index.stakeholders} id={id} issueNumber={entry.issueNumber} available={available} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </section>
    </>
  )
}
