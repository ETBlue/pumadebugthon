import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { ConflictView } from '@/components/ConflictView'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { Markdown } from '@/components/Markdown'
import { linkClass } from '@/components/styles'
import { TagBadge } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { conflictFocusPath, issueFocusPath, stakeholderTabPath } from '@/lib/entityPaths'
import { pendingBySection, tabPath } from '@/lib/issuePage'
import { solutionGroupCoverage, solutionRelatedConflicts, solutionWayOutConflicts } from '@/lib/solutionPage'
import { stakeholderName } from '@/lib/stakeholders'
import type { ConflictView as ConflictData } from '@/lib/wantList'
import type { IndexFile, IssueFile, Solution } from '@/types'
import { PartEmpty, SolutionPart } from './Parts'

const tp = t.solutionPage

/** 解開的衝突 (design 3.12): each conflict whose way out lists the solution,
 * as ConflictView, with a link to the conflict on the issue's 訴求 tab.
 * Nothing when the list is empty. The 「只看有資料根據」 toggle filters the
 * story lists of the conflicts. */
export function WayOutConflicts({ views, issue, index }: { views: ConflictData[]; issue: IssueFile; index: IndexFile }) {
  const [dataBasedOnly] = useDataBasisFilter()
  if (views.length === 0) return null
  return (
    <SolutionPart id="solution-way-out" title={tp.wayOutHeading}>
      <p className="text-sm text-muted-foreground">{tp.wayOutIntro}</p>
      <DataBasisToggle className="mt-3" />
      <ul className="mt-4 space-y-4">
        {views.map((view) => (
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
              <Link to={conflictFocusPath(issue.number, view.conflict.id, dataBasedOnly)} className={linkClass}>
                {tp.wayOutLink(issue.number, view.conflict.id)}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </SolutionPart>
  )
}

/** The 總覽 tab of an issue solution (design 3.12), in this order: 解開的衝突,
 * 相關的衝突, 涵蓋的相同訴求群組, 成效衡量, 資源、法規、隱私與風險,
 * 題目或研究中的構想, 待補, 更多. The 跨議題解法 part comes with Task N11. */
export function OverviewTab({ index, issue, solution: sol }: { index: IndexFile; issue: IssueFile; solution: Solution }) {
  const n = issue.number
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const [dataBasedOnly] = useDataBasisFilter()
  const name = (id: string) => stakeholderName(index.stakeholders, id)
  const wayOut = useMemo(() => solutionWayOutConflicts(issue, sol), [issue, sol])
  const related = useMemo(() => solutionRelatedConflicts(issue, sol), [issue, sol])
  const groups = useMemo(() => solutionGroupCoverage(issue, sol), [issue, sol])
  const pending = pendingBySection(sol.pending)

  return (
    <div className="space-y-10">
      <WayOutConflicts views={wayOut} issue={issue} index={index} />

      <SolutionPart id="solution-conflicts" title={tp.conflictsHeading}>
        {related.length === 0 ? (
          <PartEmpty>{tp.conflictsNone}</PartEmpty>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{tp.conflictsIntro}</p>
            <ul className="mt-3 space-y-3">
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
          <Link to={issueFocusPath(n, 'wants', 'conflicts', dataBasedOnly)} className={linkClass}>{tp.conflictsLink(n)}</Link>
        </p>
      </SolutionPart>

      <SolutionPart id="solution-groups" title={tp.groupsHeading}>
        {groups.length === 0 ? (
          <PartEmpty>{tp.groupsNone}</PartEmpty>
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
                    {!full && <span className="ml-2 break-words text-muted-foreground">{tp.groupCovered(covered)}</span>}
                  </p>
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">{tp.groupMembers}</span>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {members.map((id) => (
                        <li key={id}>
                          <Link to={{ pathname: stakeholderTabPath(id, 'wants'), search }} className={linkClass}>
                            {name(id)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </SolutionPart>

      <SolutionPart id="solution-measures" title={tp.measuresHeading}>
        {sol.measures.length === 0 ? (
          <PartEmpty>{tp.measuresNone}</PartEmpty>
        ) : (
          <ul className="space-y-3">
            {sol.measures.map((m, i) => (
              <li key={i} className="rounded-md border p-3">
                <h4 className="font-medium"><Markdown text={m.metric} /></h4>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <Field label={tp.baseline}><CellText cell={m.baseline} /></Field>
                  <Field label={tp.source}><Markdown text={m.source} /></Field>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </SolutionPart>

      <SolutionPart id="solution-detail" title={tp.detailHeading}>
        <p className="text-sm text-muted-foreground">{tp.detailIntro}</p>
        <section aria-labelledby="solution-overview" className="mt-4 rounded-md border p-3">
          <h4 id="solution-overview" className="font-semibold">{tp.overviewHeading}</h4>
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
      </SolutionPart>

      {sol.ideas.length > 0 && (
        <SolutionPart id="solution-ideas" title={tp.ideasHeading}>
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
        </SolutionPart>
      )}

      <SolutionPart id="solution-pending" title={tp.pendingHeading}>
        {pending.length === 0 ? (
          <PartEmpty>{tp.pendingNone}</PartEmpty>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{tp.pendingIntro}</p>
            {pending.map((g) => (
              <div key={g.section ?? ''} className="mt-4">
                <h4 className="font-medium">{g.section ?? t.overview.noSection}</h4>
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
      </SolutionPart>

      <nav aria-labelledby="solution-more" className="border-t pt-6">
        <h3 id="solution-more" className="text-xl font-bold">{tp.moreHeading}</h3>
        <ul className="mt-3 space-y-1">
          <li><Link to={{ pathname: tabPath(n, 'solutions'), search }} className={linkClass}>{tp.issueSolutionsLink(n)}</Link></li>
          <li><Link to={{ pathname: '/solutions', search }} className={linkClass}>{tp.allSolutionsLink}</Link></li>
        </ul>
      </nav>
    </div>
  )
}
