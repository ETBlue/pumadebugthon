import { Link, useSearchParams } from 'react-router'
import { CellParts } from '@/components/CellParts'
import { CellText } from '@/components/CellText'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { Markdown } from '@/components/Markdown'
import { SolutionTitleLink } from '@/components/SolutionCard'
import { targetLinkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { crossSolutionFocus } from '@/lib/crossIssue'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { solutionPath } from '@/lib/entityPaths'
import { cn } from '@/lib/utils'
import type { CrossIssueFile, CrossSolution, IndexFile, IssueFile } from '@/types'
import { PartEmpty, SolutionPart } from './Parts'

const tp = t.solutionPage
const tx = t.crossIssue

/** The 總覽 tab of a cross-issue solution (design 3.18, decision 103), in
 * this order: 合併的解法, 特別關注族群, 主責單位、法規、隱私與風險, 更多.
 * 解開的衝突 and 成效衡量 have their own tabs. The 主責單位、法規、隱私與風險
 * cells follow the 「只看有資料根據」 filter, as the step 7 cells of an issue
 * solution do (decision 105). issues are the files of the issues in parts. */
export function CrossOverviewTab({ data, issues, solution: sol }: {
  data: CrossIssueFile
  /** Not used here; the tabs share one set of props. */
  index?: IndexFile
  issues: IssueFile[]
  solution: CrossSolution
}) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const [dataBasedOnly] = useDataBasisFilter()
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

      <SolutionPart id="cross-focus" title={tx.focusHeading}>
        {focus.length === 0 ? (
          <PartEmpty>{tx.focusNone}</PartEmpty>
        ) : (
          // A focus row has no ID and no page: article style, not a card (decision 137).
          <dl className="space-y-6">
            {focus.map((f) => (
              <div key={f.tag} className={f.note.pending ? 'min-w-0 text-muted-foreground' : 'min-w-0'}>
                <dt className="text-lg font-semibold text-foreground">{f.tag}</dt>
                <dd className="mt-1 leading-relaxed"><CellText cell={f.note} /></dd>
              </div>
            ))}
          </dl>
        )}
      </SolutionPart>

      <SolutionPart id="cross-detail" title={tx.detailHeading}>
        <p className="text-sm text-muted-foreground">{tp.detailIntro}</p>
        <DataBasisToggle className="mt-3" />
        <dl className="mt-4 space-y-4">
          {([
            [tx.owner, sol.detail.owner],
            [tx.laws, sol.detail.laws],
            [tx.privacy, sol.detail.privacy],
            [tx.risks, sol.detail.risks],
          ] as const).map(([label, cell]) => (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="mt-1 leading-relaxed"><CellParts parts={[cell]} dataBasedOnly={dataBasedOnly} /></dd>
            </div>
          ))}
        </dl>
      </SolutionPart>

      <nav aria-labelledby="cross-more" className="border-t pt-6">
        <h3 id="cross-more" className="text-xl font-bold">{tp.moreHeading}</h3>
        <ul className="mt-3 space-y-1">
          <li><Link to="/solutions" className={targetLinkClass}>{tp.allSolutionsLink}</Link></li>
        </ul>
      </nav>
    </div>
  )
}
