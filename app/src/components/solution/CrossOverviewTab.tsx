import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { DataBasisEmpty, DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { Heading } from '@/components/Heading'
import { ItemKey } from '@/components/ItemKey'
import { Markdown } from '@/components/Markdown'
import { NeedPriority, NeedSummaryLink } from '@/components/NeedItem'
import { SolutionTitleLink } from '@/components/SolutionCard'
import { StoryCard } from '@/components/StoryCard'
import { targetLinkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import {
  crossConflictView, crossSolutionFocus, crossWayOutConflicts, findCrossSolution,
  type CrossConflictView, type CrossSideNeed, type CrossStory,
} from '@/lib/crossIssue'
import { dataBasisFilterSearch, hasDataBasis } from '@/lib/dataBasis'
import { conflictFocusPath, solutionPath } from '@/lib/entityPaths'
import { stakeholderName } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { CrossIssueFile, CrossSolution, IndexFile, IssueFile } from '@/types'
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

/** The 總覽 tab of a cross-issue solution (design 3.18), in this order:
 * 合併的解法, 解開的衝突, 特別關注族群, 成效衡量, 主責單位、法規、隱私與風險,
 * 更多. issues are the files of the issues in parts. */
export function CrossOverviewTab({ data, index, issues, solution: sol }: {
  data: CrossIssueFile
  index: IndexFile
  issues: IssueFile[]
  solution: CrossSolution
}) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const [dataBasedOnly] = useDataBasisFilter()
  const wayOut = useMemo(
    () => crossWayOutConflicts(data, sol.code).map((c) => crossConflictView(data, c, issues)),
    [data, sol, issues],
  )
  const focus = crossSolutionFocus(data, sol.code)
  const issueSolution = (n: number, code: string) => issues.find((i) => i.number === n)?.solutions.find((s) => s.id === code)
  const partLink = (n: number, code: string) => {
    const found = issueSolution(n, code)
    return found ? (
      <SolutionTitleLink solution={found} issueNumber={n} showIssue />
    ) : (
      <Link to={{ pathname: solutionPath(n, code), search }} className={cn(targetLinkClass, 'font-mono')}>{t.solutionId(n, code)}</Link>
    )
  }

  return (
    <div className="space-y-10">
      <SolutionPart id="cross-parts" title={tx.partsHeading}>
        <p className="text-sm text-muted-foreground">{tx.partsIntro}</p>
        <ul className="mt-3 space-y-3">
          {sol.parts.map((p) => {
            const found = issueSolution(p.issue, p.code)
            return (
              <li key={`${p.issue}-${p.code}`} className="rounded-md border p-3">
                <p className="font-medium">{partLink(p.issue, p.code)}</p>
                {found && <p className="mt-1 text-sm"><Markdown text={found.summary} /></p>}
              </li>
            )
          })}
        </ul>
      </SolutionPart>

      {wayOut.length > 0 && (
        <SolutionPart id="cross-way-out" title={tp.wayOutHeading}>
          <p className="text-sm text-muted-foreground">{tx.wayOutIntro}</p>
          <DataBasisToggle className="mt-3" />
          <ul className="mt-4 space-y-4">
            {wayOut.map((view) => (
              <li key={view.conflict.id}>
                <CrossConflictCard view={view} data={data} index={index} issues={issues} dataBasedOnly={dataBasedOnly} />
              </li>
            ))}
          </ul>
        </SolutionPart>
      )}

      <SolutionPart id="cross-focus" title={tx.focusHeading}>
        {focus.length === 0 ? (
          <PartEmpty>{tx.focusNone}</PartEmpty>
        ) : (
          <dl className="space-y-3">
            {focus.map((f) => (
              <div key={f.tag} className="rounded-md border p-3">
                <dt className="font-semibold">{f.tag}</dt>
                <dd className="mt-1"><CellText cell={f.note} /></dd>
              </div>
            ))}
          </dl>
        )}
      </SolutionPart>

      <SolutionPart id="cross-measures" title={tp.measuresHeading}>
        {sol.measures.length === 0 ? (
          <PartEmpty>{tp.measuresNone}</PartEmpty>
        ) : (
          <ul className="space-y-3">
            {sol.measures.map((m, i) => (
              <li key={i} className="rounded-md border p-3">
                <h4 className="font-medium">
                  <Markdown text={m.indicator} />
                  {m.isNew && (
                    <span className="ml-2 rounded-sm border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {tx.measureNew}
                    </span>
                  )}
                </h4>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <Field label={tp.baseline}><CellText cell={m.baseline} /></Field>
                  <Field label={tp.source}><Markdown text={m.source} /></Field>
                  {m.from.length > 0 && (
                    <Field label={tx.measureFrom}>
                      {m.from.map((f, j) => (
                        <span key={`${f.issue}-${f.code}`}>
                          {j > 0 && t.listSeparator}
                          <Link to={{ pathname: solutionPath(f.issue, f.code), search }} className={cn(targetLinkClass, 'font-mono')}>
                            {t.solutionId(f.issue, f.code)}
                          </Link>
                        </span>
                      ))}
                    </Field>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </SolutionPart>

      <SolutionPart id="cross-detail" title={tx.detailHeading}>
        <p className="text-sm text-muted-foreground">{tp.detailIntro}</p>
        <dl className="mt-4 space-y-4">
          {([
            [tx.owner, sol.detail.owner],
            [tx.laws, sol.detail.laws],
            [tx.privacy, sol.detail.privacy],
            [tx.risks, sol.detail.risks],
          ] as const).map(([label, cell]) => (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="mt-1 leading-relaxed"><CellText cell={cell} /></dd>
            </div>
          ))}
        </dl>
      </SolutionPart>

      <nav aria-labelledby="cross-more" className="border-t pt-6">
        <h3 id="cross-more" className="text-xl font-bold">{tp.moreHeading}</h3>
        <ul className="mt-3 space-y-1">
          <li><Link to={{ pathname: '/solutions', search }} className={targetLinkClass}>{tp.allSolutionsLink}</Link></li>
        </ul>
      </nav>
    </div>
  )
}
