import { Link, Navigate, useLocation, useParams } from 'react-router'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { linkClass } from '@/components/styles'
import { useIndex, useIssue } from '@/data'
import { t } from '@/i18n/zh-TW'
import { movedStakeholderTarget, stakeholderTabPath, storyPath } from '@/lib/entityPaths'
import { findIssue, tabPath } from '@/lib/issuePage'
import { findStory } from '@/lib/storyPage'
import { resolveId } from '@/lib/stakeholders'
import type { AvailableIssueSummary, IndexFile, Stakeholder, Story } from '@/types'

const ts = t.storyPage

/** Story page (design 3.15): #/stakeholders/:id/stories/:number/:storyId.
 * For now (plan Task N3) it shows the breadcrumb and the h1. Task N8 adds
 * the parts of the story. */
export default function StakeholderStory() {
  const index = useIndex()
  const { id = '', number = '', storyId = '' } = useParams()
  const location = useLocation()
  if (index.status !== 'ready') return <LoadState state={index} />

  const resolved = resolveId(index.data.stakeholders, id)
  if (resolved !== null && resolved !== id) {
    // A moved ID (design 3.3): the new ID, with the story ID changed too.
    const target = movedStakeholderTarget(location.pathname, location.search, id, resolved)
    if (target) return <Navigate replace to={target} />
  }
  const stakeholder = resolved === null ? null : index.data.stakeholders.find((s) => s.id === resolved) ?? null
  const found = findIssue(index.data, number)
  if (found.kind !== 'available') {
    return <NotFound number={number} storyId={storyId} stakeholder={stakeholder} />
  }
  return <StoryLoader index={index.data} summary={found.issue} stakeholder={stakeholder} id={id} storyId={storyId} />
}

function StoryLoader({ index, summary, stakeholder, id, storyId }: {
  index: IndexFile
  summary: AvailableIssueSummary
  stakeholder: Stakeholder | null
  id: string
  storyId: string
}) {
  const issue = useIssue(summary.folder)
  const { search } = useLocation()
  if (issue.status !== 'ready') return <LoadState state={issue} />
  const result = findStory(issue.data, id, storyId)
  if (result.kind === 'redirect') {
    // The story belongs to another stakeholder (the part of the ID before 「-」).
    return <Navigate replace to={{ pathname: storyPath(summary.number, storyId), search }} />
  }
  if (result.kind === 'notFound' || stakeholder === null) {
    return <NotFound number={String(summary.number)} storyId={storyId} stakeholder={stakeholder} issue={summary} />
  }
  return <StoryContent index={index} summary={summary} stakeholder={stakeholder} story={result.story} />
}

function StoryContent({ summary, stakeholder: s, story }: {
  index: IndexFile
  summary: AvailableIssueSummary
  stakeholder: Stakeholder
  story: Story
}) {
  const title = ts.title(summary.number, story.id)
  return (
    <>
      <PageTitle parts={[title, s.name]} />
      <nav aria-label={ts.breadcrumb}>
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <li><Link to="/" className={linkClass}>{ts.home}</Link></li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li><Link to="/stakeholders" className={linkClass}>{ts.stakeholders}</Link></li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li>
            <Link to={stakeholderTabPath(s.id, 'overview')} className={linkClass}>{`${s.id} ${s.name}`}</Link>
          </li>
          <li aria-hidden="true" className="text-muted-foreground">›</li>
          <li aria-current="page" className="font-mono">{title}</li>
        </ol>
      </nav>
      <h1 className="mt-4 text-2xl font-bold md:text-3xl font-mono">{title}</h1>
    </>
  )
}

/** The short message for an unknown issue, an issue with no analysis, or an
 * unknown story, with links to the stakeholder page and the issue. */
function NotFound({ number, storyId, stakeholder, issue }: {
  number: string
  storyId: string
  stakeholder: Stakeholder | null
  issue?: AvailableIssueSummary
}) {
  return (
    <>
      <PageTitle parts={[ts.notFoundTitle]} />
      <h1 className="text-2xl font-bold">{ts.notFoundTitle}</h1>
      <p className="mt-3">{ts.notFoundBody(number, storyId)}</p>
      <ul className="mt-3 space-y-1">
        {stakeholder && (
          <li>
            <Link to={stakeholderTabPath(stakeholder.id, 'overview')} className={linkClass}>
              {ts.stakeholderLink(stakeholder.id, stakeholder.name)}
            </Link>
          </li>
        )}
        {issue && (
          <li>
            <Link to={tabPath(issue.number, 'overview')} className={linkClass}>
              {ts.issueLink(t.issueCard.numberTitle(issue.number, issue.title))}
            </Link>
          </li>
        )}
        <li><Link to="/" className={linkClass}>{ts.backHome}</Link></li>
      </ul>
    </>
  )
}
