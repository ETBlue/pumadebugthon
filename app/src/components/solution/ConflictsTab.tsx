import { useMemo } from 'react'
import { Link } from 'react-router'
import { CellText } from '@/components/CellText'
import { ConflictView } from '@/components/ConflictView'
import { DataBasisEmpty, DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Heading } from '@/components/Heading'
import { ItemKey } from '@/components/ItemKey'
import { Markdown } from '@/components/Markdown'
import { NeedPriority, NeedSummaryLink } from '@/components/NeedItem'
import { StoryCard } from '@/components/StoryCard'
import { cardGridClass, linkClass, targetLinkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import {
  crossConflictView, crossRelatedConflicts, crossWayOutConflicts, findCrossSolution,
  type CrossConflictView, type CrossSideNeed, type CrossStory,
} from '@/lib/crossIssue'
import { hasDataBasis } from '@/lib/dataBasis'
import { conflictFocusPath, issueFocusPath } from '@/lib/entityPaths'
import { solutionRelatedConflicts, solutionWayOutConflicts } from '@/lib/solutionPage'
import { stakeholderName } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { CrossIssueFile, CrossSolution, IndexFile, IssueFile, Solution } from '@/types'
import { CrossSolutionLink } from './CrossSolutionCard'
import { PartEmpty, SolutionPart } from './Parts'

const tp = t.solutionPage
const tx = t.crossIssue
const tc = t.conflict

/** The stories of one side, each with its issue number. With the
 * 「只看有資料根據」 filter on, only the stories with a data basis. */
function SideStories({ stories, index, issues, dataBasedOnly }: {
  stories: CrossStory[]
  index: IndexFile
  /** The issue files, for the priority of each story's need. */
  issues: IssueFile[]
  dataBasedOnly: boolean
}) {
  const shown = dataBasedOnly ? stories.filter((s) => hasDataBasis(s.story)) : stories
  if (dataBasedOnly && shown.length === 0 && stories.length > 0) return <DataBasisEmpty />
  return (
    <ul className="mt-2 space-y-2">
      {shown.map(({ issueNumber, story }) => (
        <li key={`${issueNumber}-${story.id}`}>
          <p className="mb-1 text-xs text-muted-foreground">{tx.issueLink(issueNumber)}</p>
          <StoryCard
            story={story}
            issue={issues.find((i) => i.number === issueNumber) ?? { number: issueNumber, needs: [] }}
            stakeholderName={stakeholderName(index.stakeholders, story.stakeholder)}
            compact
          />
        </li>
      ))}
    </ul>
  )
}

/** The needs of one side: an issue need links to the issue's 需求 tab; an
 * X-N group has no page, so it is plain text. */
function SideNeeds({ label, needs }: { label: string; needs: CrossSideNeed[] }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      {needs.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{tc.needsNone}</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {needs.map((n) =>
            n.kind === 'group' ? (
              <li key={n.group.id}>
                <span className="mr-2 font-mono">{n.group.id}</span>
                <Markdown text={n.group.summary} />
              </li>
            ) : (
              <li key={`${n.issueNumber}-${n.need.need.id}`}>
                <span className="mr-1.5 text-muted-foreground">{tx.issueLink(n.issueNumber)}</span>
                <NeedSummaryLink summary={n.need.summary} issueNumber={n.issueNumber} needKey={n.need.need.id} />
                <ItemKey issueNumber={n.issueNumber} value={n.need.need.id} className="ml-2 text-xs" muted />
                <span className="mt-0.5 block text-sm"><NeedPriority need={n.need.need} /></span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}

/** One cross-issue conflict (design 3.18): the text, the two sides with
 * story links, 雙方的需求, 以需求為本的解方, the method, the result and the
 * issue conflicts as links. */
function CrossConflictCard({ view, data, index, issues, dataBasedOnly }: {
  view: CrossConflictView
  data: CrossIssueFile
  index: IndexFile
  issues: IssueFile[]
  dataBasedOnly: boolean
}) {
  const c = view.conflict
  const key = `cross-conflict-${c.id}`
  const wayOut = c.wayOutSolutions.flatMap((code) => findCrossSolution(data, code) ?? [])
  return (
    <article aria-labelledby={key} className="rounded-lg border p-3 md:p-4">
      <Heading level={4} id={key} className="text-lg font-semibold">
        <span className="mr-2 font-mono">{c.id}</span>
        <CellText cell={c.text} />
      </Heading>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <section className="min-w-0">
          <Heading level={5} className="font-medium">{tc.sideA}</Heading>
          <SideStories stories={view.sideA} index={index} issues={issues} dataBasedOnly={dataBasedOnly} />
        </section>
        <section className="min-w-0">
          <Heading level={5} className="font-medium">{tc.sideB}</Heading>
          <SideStories stories={view.sideB} index={index} issues={issues} dataBasedOnly={dataBasedOnly} />
        </section>
      </div>

      <section className="mt-4">
        <Heading level={5} className="font-medium">{tc.needs}</Heading>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <SideNeeds label={tc.needsA} needs={view.needsA} />
          <SideNeeds label={tc.needsB} needs={view.needsB} />
        </div>
      </section>

      <section className="mt-4">
        <Heading level={5} className="font-medium">{tc.wayOut}</Heading>
        <p className="mt-1"><CellText cell={c.wayOut} /></p>
        {wayOut.length > 0 && (
          <div className="mt-2 text-sm">
            <p className="text-muted-foreground">{tx.wayOutSolutions}</p>
            <ul className="mt-1 space-y-1">
              {wayOut.map((sol) => <li key={sol.code}><CrossSolutionLink solution={sol} /></li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-4">
        <Heading level={5} className="font-medium">{tc.methodFallback}</Heading>
        <p className="mt-1"><CellText cell={c.method} /></p>
        <p className="mt-2 text-sm text-muted-foreground">{tc.result}</p>
        <p className="mt-1"><CellText cell={c.result} /></p>
      </section>

      {c.issueConflicts.length > 0 && (
        <section className="mt-4">
          <Heading level={5} className="font-medium">{tx.issueConflicts}</Heading>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {c.issueConflicts.map((r) => (
              <li key={`${r.issue}-${r.id}`}>
                {r.issue === null ? (
                  <span className="font-mono">{r.id}</span>
                ) : (
                  <Link to={conflictFocusPath(r.issue, r.id, dataBasedOnly)} className={cn(targetLinkClass, 'font-mono')}>
                    {`#${r.issue} ${r.id}`}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

/** The 衝突 tab of an issue solution (design 3.12, decision 103): the
 * 「只看有資料根據」 toggle, then 解開的衝突 (each conflict whose way out lists
 * the solution, as ConflictView, with a link to the conflict on the issue's
 * 訴求 tab) and 相關的衝突 (the other conflicts with a covered story). Both
 * moved here from the 總覽 tab. The filter hides the stories with no data
 * basis in the sides of 解開的衝突, as before. */
export function ConflictsTab({ index, issue, solution: sol }: { index: IndexFile; issue: IssueFile; solution: Solution }) {
  const n = issue.number
  const [dataBasedOnly] = useDataBasisFilter()
  const wayOut = useMemo(() => solutionWayOutConflicts(issue, sol), [issue, sol])
  const related = useMemo(() => solutionRelatedConflicts(issue, sol), [issue, sol])
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <div className="space-y-10">
        <SolutionPart id="solution-way-out" title={tp.wayOutHeading}>
          {wayOut.length === 0 ? (
            <PartEmpty>{tp.wayOutNone}</PartEmpty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tp.wayOutIntro}</p>
              <ul className="mt-4 space-y-4">
                {wayOut.map((view) => (
                  <li key={view.conflict.id}>
                    {/* focusTarget off: the same conflict ID is on the issue's 訴求 tab, not here. */}
                    <ConflictView
                      view={view}
                      issue={issue}
                      stakeholders={index.stakeholders}
                      dataBasedOnly={dataBasedOnly}
                      focusTarget={false}
                    />
                    <p className="mt-2 text-sm">
                      <Link to={conflictFocusPath(n, view.conflict.id, dataBasedOnly)} className={targetLinkClass}>
                        {tp.wayOutLink(n, view.conflict.id)}
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SolutionPart>

        <SolutionPart id="solution-conflicts" title={tp.conflictsHeading}>
          {related.length === 0 ? (
            <PartEmpty>{tp.conflictsNone}</PartEmpty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tp.conflictsIntro}</p>
              <ul className={`mt-3 ${cardGridClass}`}>
                {related.map(({ conflict: c, covered }) => (
                  <li key={c.id} className="rounded-md border p-3">
                    <p>
                      <Link to={conflictFocusPath(n, c.id, dataBasedOnly)} className={`${linkClass} mr-2 font-mono font-semibold`}>
                        {c.id}
                      </Link>
                      <CellText cell={c.text} />
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{tp.conflictCovered(covered)}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3">
            <Link to={issueFocusPath(n, 'wants', 'conflicts', dataBasedOnly)} className={targetLinkClass}>{tp.conflictsLink(n)}</Link>
          </p>
        </SolutionPart>
      </div>
    </>
  )
}

/** The 衝突 tab of a cross-issue solution (decision 103): 解開的衝突 (moved
 * from the 總覽 tab) and 相關的衝突 (the other cross-issue conflicts with a
 * covered story, crossRelatedConflicts). A cross-issue conflict has no page,
 * so its ID is plain text. */
export function CrossConflictsTab({ data, index, issues, solution: sol }: {
  data: CrossIssueFile
  index: IndexFile
  issues: IssueFile[]
  solution: CrossSolution
}) {
  const [dataBasedOnly] = useDataBasisFilter()
  const wayOut = useMemo(
    () => crossWayOutConflicts(data, sol.code).map((c) => crossConflictView(data, c, issues)),
    [data, sol, issues],
  )
  const related = useMemo(() => crossRelatedConflicts(data, sol, issues), [data, sol, issues])
  return (
    <>
      <DataBasisToggle className="mb-6" />
      <div className="space-y-10">
        <SolutionPart id="cross-way-out" title={tp.wayOutHeading}>
          {wayOut.length === 0 ? (
            <PartEmpty>{tp.wayOutNone}</PartEmpty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tx.wayOutIntro}</p>
              <ul className="mt-4 space-y-4">
                {wayOut.map((view) => (
                  <li key={view.conflict.id}>
                    <CrossConflictCard view={view} data={data} index={index} issues={issues} dataBasedOnly={dataBasedOnly} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </SolutionPart>

        <SolutionPart id="cross-conflicts" title={tp.conflictsHeading}>
          {related.length === 0 ? (
            <PartEmpty>{tx.relatedConflictsNone}</PartEmpty>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{tx.relatedConflictsIntro}</p>
              <ul className={`mt-3 ${cardGridClass}`}>
                {related.map(({ conflict: c, covered }) => (
                  <li key={c.id} className="rounded-md border p-3">
                    <p>
                      <span className="mr-2 font-mono font-semibold">{c.id}</span>
                      <CellText cell={c.text} />
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {tp.conflictCovered(covered.map((r) => (r.issue === null ? r.id : `#${r.issue} ${r.id}`)))}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SolutionPart>
      </div>
    </>
  )
}
