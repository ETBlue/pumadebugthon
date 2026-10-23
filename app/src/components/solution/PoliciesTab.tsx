import { CellText } from '@/components/CellText'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { Field } from '@/components/Field'
import { RefLine } from '@/components/RefLine'
import { t } from '@/i18n/zh-TW'
import { practiceSides } from '@/lib/solutionPage'
import type { RefTarget } from '@/lib/summary'
import type { SolutionPractice } from '@/types'
import { PartEmpty, SolutionPart, TwoColumns } from './Parts'

const tp = t.solutionPage

/** The link of a reference of a dependency row (summaryRefTo or crossSummaryRefTo). */
type RefTargetOf = (ref: string, dataBasedOnly: boolean) => RefTarget | null

/** One item: the kind (相關做法 or 相依與現行政策), the place and the name,
 * the content with its tag, 本文件怎麼用 when present, the 「相關：」 line of a
 * dependency row (decision 140), and where it comes from.
 * An item has no ID and no page, so it is in article style, not a card
 * (decision 137): no border box, an h4 heading, the text, then the source
 * line. A 【待補】 item is in muted text. */
function PracticeItem({ practice: p, issueNumber, targetOf }: {
  practice: SolutionPractice
  issueNumber: number | null
  targetOf: RefTargetOf
}) {
  const dependency = p.source === 'dependency'
  const [dataBasedOnly] = useDataBasisFilter()
  return (
    <li className={p.content.pending ? 'min-w-0 text-muted-foreground' : 'min-w-0'}>
      <h4 className="text-lg font-semibold text-foreground">
        <span className="mr-2 rounded-sm border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
          {dependency ? tp.dependencyKind : tp.practiceKind}
        </span>
        {p.place !== null && <span className="mr-1.5">{p.place}：</span>}
        {p.name}
      </h4>
      <p className="mt-1 leading-relaxed"><CellText cell={p.content} /></p>
      {p.use !== null && (
        <dl className="mt-1 text-sm">
          <Field label={tp.practiceUse}><CellText cell={p.use} /></Field>
        </dl>
      )}
      <RefLine refs={p.refs} targetOf={(ref) => targetOf(ref, dataBasedOnly)} className="mt-1 text-sm" />
      <p className="mt-1 text-sm text-muted-foreground">
        {!dependency && issueNumber !== null && tp.practiceSource(issueNumber)}
        {dependency && issueNumber === null && tp.crossDependencySource}
        {/* Since 2026-10-23 the row is in the solution's own step 7 section,
            not on the issue's 分析摘要 tab, so there is no link to that tab. */}
        {dependency && issueNumber !== null && tp.dependencySource}
      </p>
    </li>
  )
}

function Side({ id, title, items, none, issueNumber, targetOf }: {
  id: string
  title: string
  items: SolutionPractice[]
  none: string
  issueNumber: number | null
  targetOf: RefTargetOf
}) {
  return (
    <SolutionPart id={id} title={`${title} ${items.length}`}>
      {items.length === 0 ? (
        <PartEmpty>{none}</PartEmpty>
      ) : (
        <ul className="space-y-6">
          {items.map((p, i) => <PracticeItem key={i} practice={p} issueNumber={issueNumber} targetOf={targetOf} />)}
        </ul>
      )}
    </SolutionPart>
  )
}

/** The 相關政策 tab (design 3.12, decisions 103 and 104): 相關或類似的政策與
 * 做法, in two groups, 國內 and 國外, side by side from `lg` (decision 136),
 * each in file order. issueNumber is the
 * issue of an issue solution, or null for a cross-issue solution (it has only
 * dependency rows, from the cross-issue file, which has no page). The
 * 「只看有資料根據」 filter does not hide items on this tab (decision 102);
 * the reference links keep ?evidence=1. The dependency rows come from the
 * solution's step 7 section (decision 140). */
export function PoliciesTab({ practices, issueNumber, targetOf }: {
  practices: SolutionPractice[]
  issueNumber: number | null
  targetOf: RefTargetOf
}) {
  if (practices.length === 0) return <PartEmpty>{tp.policiesNone}</PartEmpty>
  const sides = practiceSides(practices)
  const hasPractice = practices.some((p) => p.source === 'practice')
  return (
    <>
      <p className="text-sm text-muted-foreground">{tp.policiesIntro}</p>
      {hasPractice && <p className="mt-1 text-sm text-muted-foreground">{tp.practiceNote}</p>}
      <div className="mt-6">
        <TwoColumns>
          <Side id="policies-domestic" title={tp.policiesDomestic} items={sides.domestic} none={tp.policiesDomesticNone} issueNumber={issueNumber} targetOf={targetOf} />
          <Side id="policies-foreign" title={tp.policiesForeign} items={sides.foreign} none={tp.policiesForeignNone} issueNumber={issueNumber} targetOf={targetOf} />
        </TwoColumns>
      </div>
    </>
  )
}
