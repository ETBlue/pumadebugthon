import { useId, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { ConflictView } from '@/components/ConflictView'
import { LoadState } from '@/components/LoadState'
import { Markdown } from '@/components/Markdown'
import { PageTitle } from '@/components/PageTitle'
import { PriorityLegend } from '@/components/PriorityCounts'
import { SolutionCard } from '@/components/SolutionCard'
import { linkClass, proseClass } from '@/components/styles'
import { TagBadge } from '@/components/TagBadge'
import { useIndex, useIssue } from '@/data'
import { t } from '@/i18n/zh-TW'
import {
  movedStakeholderTarget, needFocusPath, stakeholderTabPath, wantFocusPath, type StakeholderTab,
} from '@/lib/entityPaths'
import { findIssue, tabPath } from '@/lib/issuePage'
import { opinionPickTo } from '@/lib/opinion'
import { storyPriority } from '@/lib/needs'
import { priorityLabel } from '@/lib/priority'
import { findStory, storyRedirectPath, storyView, type StoryGroup, type StoryView } from '@/lib/storyPage'
import { resolveId, stakeholderName } from '@/lib/stakeholders'
import type { AvailableIssueSummary, Group, IndexFile, IssueFile, NeedGroup, Stakeholder } from '@/types'

const ts = t.storyPage

/** Story page (design 3.15): #/stakeholders/:id/stories/:number/:storyId.
 * The breadcrumb, the h1, the story, its fields, then 訴求, 需求, 衝突,
 * 解法 and 更多. */
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
    // The story belongs to another stakeholder. The target uses the
    // stakeholder in the data, not the part of the ID before 「-」. It is
    // null when it would be this same page; then the page shows "not found".
    const target = storyRedirectPath(index.stakeholders, summary.number, id, storyId, result.stakeholderId)
    if (target !== null) return <Navigate replace to={{ pathname: target, search }} />
  }
  if (result.kind !== 'found' || stakeholder === null) {
    return <NotFound number={String(summary.number)} storyId={storyId} stakeholder={stakeholder} issue={summary} />
  }
  return (
    <StoryContent
      index={index}
      issue={issue.data}
      summary={summary}
      stakeholder={stakeholder}
      view={storyView(issue.data, result.story)}
    />
  )
}

function StoryContent({ index, issue, summary, stakeholder: s, view }: {
  index: IndexFile
  issue: IssueFile
  summary: AvailableIssueSummary
  stakeholder: Stakeholder
  view: StoryView
}) {
  const { story } = view
  const n = summary.number
  const priority = storyPriority(issue, story)
  const title = ts.title(n, story.id)
  const row = 'flex flex-col gap-0.5 sm:flex-row sm:gap-3'
  const label = 'shrink-0 text-muted-foreground sm:w-20'
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

      <Section heading={ts.storyHeading}>
        {/* Three labeled lines, so each tag stays next to its own text. */}
        <dl className={`mt-2 space-y-2 rounded-lg border p-3 md:p-4 ${proseClass}`}>
          <div className={row}>
            <dt className={label}>{ts.asA}</dt>
            <dd className="min-w-0">
              <Link to={stakeholderTabPath(s.id, 'overview')} className={linkClass}>{s.name}</Link>
              <span className="ml-1.5 font-mono text-sm text-muted-foreground">{s.id}</span>
            </dd>
          </div>
          <div className={row}>
            <dt className={label}>{ts.want}</dt>
            <dd className="min-w-0"><CellText cell={story.want} /></dd>
          </div>
          <div className={row}>
            <dt className={label}>{ts.soThat}</dt>
            <dd className="min-w-0"><CellText cell={story.soThat} /></dd>
          </div>
        </dl>
        <dl className="mt-3 space-y-2 text-sm">
          {story.source !== null && (
            <div className={row}>
              <dt className={label}>{ts.source}</dt>
              {/* A long URL in the source can break anywhere, so a narrow screen never scrolls sideways. */}
              <dd className="min-w-0 wrap-anywhere"><Markdown text={story.source} /></dd>
            </div>
          )}
          <div className={row}>
            <dt className={label}>{ts.priority}</dt>
            <dd className="min-w-0">
              <TagBadge kind={priority.tag} className="mr-1.5" />
              {priorityLabel(priority.priority)}
              <span className="mt-1 block text-muted-foreground">{ts.priorityNote}</span>
              <span className="mt-1 block"><PriorityLegend /></span>
            </dd>
          </div>
          <div className={row}>
            <dt className={label}>{ts.issue}</dt>
            <dd className="min-w-0">
              <Link to={tabPath(n, 'overview')} className={linkClass}>{t.issueCard.numberTitle(n, summary.title)}</Link>
            </dd>
          </div>
        </dl>
      </Section>

      <Section heading={ts.wantHeading}>
        <p className="mt-2">
          <Link to={wantFocusPath(n, view.wantKey)} className={linkClass}>{ts.wantLink(n, view.wantKey)}</Link>
        </p>
        <GroupPart
          group={view.wantGroup}
          groupLabel={ts.wantGroup}
          othersLabel={ts.wantOthers}
          othersNone={ts.wantOthersNone}
          noGroup={ts.wantNoGroup}
          tab="wants"
          stakeholders={index.stakeholders}
        />
      </Section>

      <Section heading={ts.needHeading}>
        <p className="mt-2">
          <Link to={needFocusPath(n, view.needKey)} className={linkClass}>{ts.needLink(n, view.needKey)}</Link>
        </p>
        <GroupPart
          group={view.needGroup}
          groupLabel={ts.needGroup}
          othersLabel={ts.needOthers}
          othersNone={ts.needOthersNone}
          noGroup={ts.needNoGroup}
          tab="needs"
          stakeholders={index.stakeholders}
        />
      </Section>

      <Section heading={ts.conflictsHeading}>
        {view.conflicts.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{ts.conflictsNone}</p>
        ) : (
          <ul className="mt-2 space-y-4">
            {view.conflicts.map((c) => (
              <li key={c.view.conflict.id}>
                <ConflictView
                  view={c.view}
                  issue={issue}
                  stakeholders={index.stakeholders}
                  headingLevel={3}
                  otherStories={c.otherStories}
                  focusTarget={false}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section heading={ts.solutionsHeading}>
        {view.solutions.length === 0 ? (
          <p className="mt-2 text-muted-foreground">
            {priority.priority === 'W' ? ts.solutionsWontDo : ts.solutionsNone}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">{ts.solutionsIntro}</p>
            <ul className="mt-2 space-y-2">
              {view.solutions.map((sol) => (
                <li key={sol.id}><SolutionCard variant="compact" solution={sol} issueNumber={n} /></li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section heading={ts.moreHeading}>
        <ul className="mt-2 space-y-1">
          <li><Link to={opinionPickTo(n, view.wantKey, false)} className={linkClass}>{ts.pickLink(n)}</Link></li>
          <li>
            <Link to={stakeholderTabPath(s.id, 'overview')} className={linkClass}>{ts.stakeholderLink(s.id, s.name)}</Link>
          </li>
        </ul>
      </Section>
    </>
  )
}

/** One part of the story page, with its h2. */
function Section({ heading, children }: { heading: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-xl font-semibold">{heading}</h2>
      {children}
    </section>
  )
}

/** The W group or the N group of the story: 「相同訴求群組 W08：<summary>」
 * and the other stakeholders, as links to their page on the same tab
 * (design 3.15, 3.16). A story in no group gets a short line instead. */
function GroupPart({ group, groupLabel, othersLabel, othersNone, noGroup, tab, stakeholders }: {
  group: StoryGroup<Group | NeedGroup> | null
  groupLabel: (id: string) => string
  othersLabel: string
  othersNone: string
  noGroup: string
  tab: StakeholderTab
  stakeholders: Stakeholder[]
}) {
  if (group === null) return <p className="mt-2 text-sm text-muted-foreground">{noGroup}</p>
  const { group: g, others } = group
  return (
    <dl className="mt-2 space-y-2 text-sm">
      <div>
        <dt className="inline text-muted-foreground">{groupLabel(g.id)}</dt>
        <dd className="inline"><CellText cell={{ text: g.summary, tag: g.tag, pending: false }} /></dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{othersLabel}</dt>
        <dd className="mt-1">
          {others.length === 0 ? (
            othersNone
          ) : (
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {others.map((id) => (
                <li key={id}>
                  <Link to={stakeholderTabPath(id, tab)} className={linkClass}>
                    <span className="font-mono">{id}</span> {stakeholderName(stakeholders, id)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </dd>
      </div>
    </dl>
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
