import { Link, useSearchParams } from 'react-router'
import { CellParts } from '@/components/CellParts'
import { CellText } from '@/components/CellText'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { Markdown } from '@/components/Markdown'
import { cardGridClass, targetLinkClass } from '@/components/styles'
import { useCrossIssueOrNull } from '@/data'
import { t } from '@/i18n/zh-TW'
import { crossSolutionsOfSolution } from '@/lib/crossIssue'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { pendingBySection, tabPath } from '@/lib/issuePage'
import { step7Rows } from '@/lib/solutionPage'
import type { IssueFile, Solution } from '@/types'
import { CrossSolutionLink } from './CrossSolutionCard'
import { PartEmpty, SolutionPart } from './Parts'
import { Step7Tables } from './Step7Tables'

const tp = t.solutionPage

/** The 總覽 tab of an issue solution (design 3.12, decision 103), in this
 * order: 資源、法規、隱私與風險, 題目或研究中的構想, 跨議題解法 (only when the
 * solution is in the parts of a cross-issue solution, design 3.18), 待補,
 * 更多. The conflicts, the groups and the measures have their own tabs.
 * The step 7 cells follow the 「只看有資料根據」 filter (decision 105). */
export function OverviewTab({ issue, solution: sol }: { issue: IssueFile; solution: Solution }) {
  const n = issue.number
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const [dataBasedOnly] = useDataBasisFilter()
  const pending = pendingBySection(sol.pending)
  const crossList = crossSolutionsOfSolution(useCrossIssueOrNull(), n, sol.id)

  return (
    <div className="space-y-10">
      <SolutionPart id="solution-detail" title={tp.detailHeading}>
        <p className="text-sm text-muted-foreground">{tp.detailIntro}</p>
        <DataBasisToggle className="mt-3" />
        {/* Not an entity, so no card box (decision 137). */}
        <section aria-labelledby="solution-overview" className="mt-6">
          <h4 id="solution-overview" className="text-lg font-semibold">{tp.overviewHeading}</h4>
          <dl className="mt-2 space-y-1.5">
            <Field label={tp.cost}><CellParts parts={[sol.overview.cost]} dataBasedOnly={dataBasedOnly} /></Field>
            <Field label={tp.feasibility}><CellParts parts={[sol.overview.feasibility]} dataBasedOnly={dataBasedOnly} /></Field>
            <Field label={tp.risk}><CellParts parts={[sol.overview.risk]} dataBasedOnly={dataBasedOnly} /></Field>
            <Field label={tp.owner}><CellParts parts={[sol.overview.owner]} dataBasedOnly={dataBasedOnly} /></Field>
          </dl>
        </section>
        <Step7Tables rows={step7Rows(sol, { evaluation: tp.evaluationLabels, plan: tp.planLabels })} dataBasedOnly={dataBasedOnly} />
      </SolutionPart>

      {sol.ideas.length > 0 && (
        <SolutionPart id="solution-ideas" title={tp.ideasHeading}>
          <p className="text-sm text-muted-foreground">{tp.ideasIntro}</p>
          {/* An idea has no ID and no page: article style, not a card (decision 137). */}
          <ul className="mt-4 space-y-6">
            {sol.ideas.map((idea, i) => (
              <li key={i} className={idea.idea.pending ? 'min-w-0 text-muted-foreground' : 'min-w-0'}>
                <h4 className="text-lg font-semibold text-foreground">
                  <span className="sr-only">{tp.idea}：</span>
                  <CellText cell={idea.idea} />
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">{tp.handling}</p>
                <p className="leading-relaxed"><CellText cell={idea.handling} /></p>
              </li>
            ))}
          </ul>
        </SolutionPart>
      )}

      {crossList.length > 0 && (
        <SolutionPart id="solution-cross" title={t.crossIssue.solutionPartHeading}>
          <p className="text-sm text-muted-foreground">{t.crossIssue.solutionPartIntro}</p>
          <ul className={`mt-3 ${cardGridClass}`}>
            {crossList.map((x) => (
              <li key={x.code} className="rounded-md border p-3">
                <p className="font-medium"><CrossSolutionLink solution={x} /></p>
                <p className="mt-1 text-sm"><Markdown text={x.summary} /></p>
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
          <li><Link to={{ pathname: tabPath(n, 'solutions'), search }} className={targetLinkClass}>{tp.issueSolutionsLink(n)}</Link></li>
          <li><Link to="/solutions" className={targetLinkClass}>{tp.allSolutionsLink}</Link></li>
        </ul>
      </nav>
    </div>
  )
}
