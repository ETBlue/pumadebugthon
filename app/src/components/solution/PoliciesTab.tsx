import { Link, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { Field } from '@/components/Field'
import { targetLinkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { tabPath } from '@/lib/issuePage'
import { practiceSides } from '@/lib/solutionPage'
import type { SolutionPractice } from '@/types'
import { PartEmpty, SolutionPart, TwoColumns } from './Parts'

const tp = t.solutionPage

/** One item: the kind (相關做法 or 相依與現行政策), the place and the name,
 * the content with its tag, 本文件怎麼用 when present, and where it comes from.
 * An item has no ID and no page, so it is in article style, not a card
 * (decision 137): no border box, an h4 heading, the text, then the source
 * line. A 【待補】 item is in muted text. */
function PracticeItem({ practice: p, issueNumber }: { practice: SolutionPractice; issueNumber: number | null }) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const dependency = p.source === 'dependency'
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
      <p className="mt-1 text-sm text-muted-foreground">
        {!dependency && issueNumber !== null && tp.practiceSource(issueNumber)}
        {dependency && issueNumber === null && tp.crossDependencySource}
        {dependency && issueNumber !== null && (
          <>
            {tp.dependencySource}
            {'　'}
            <Link to={{ pathname: tabPath(issueNumber, 'dependencies'), search }} className={targetLinkClass}>
              {tp.dependencyLink(issueNumber)}
            </Link>
          </>
        )}
      </p>
    </li>
  )
}

function Side({ id, title, items, none, issueNumber }: {
  id: string
  title: string
  items: SolutionPractice[]
  none: string
  issueNumber: number | null
}) {
  return (
    <SolutionPart id={id} title={`${title} ${items.length}`}>
      {items.length === 0 ? (
        <PartEmpty>{none}</PartEmpty>
      ) : (
        <ul className="space-y-6">
          {items.map((p, i) => <PracticeItem key={i} practice={p} issueNumber={issueNumber} />)}
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
 * 「只看有資料根據」 filter does not change this tab, the same as the issue's
 * 相依與現行政策 tab (decision 102). */
export function PoliciesTab({ practices, issueNumber }: { practices: SolutionPractice[]; issueNumber: number | null }) {
  if (practices.length === 0) return <PartEmpty>{tp.policiesNone}</PartEmpty>
  const sides = practiceSides(practices)
  const hasPractice = practices.some((p) => p.source === 'practice')
  return (
    <>
      <p className="text-sm text-muted-foreground">{tp.policiesIntro}</p>
      {hasPractice && <p className="mt-1 text-sm text-muted-foreground">{tp.practiceNote}</p>}
      <div className="mt-6">
        <TwoColumns>
          <Side id="policies-domestic" title={tp.policiesDomestic} items={sides.domestic} none={tp.policiesDomesticNone} issueNumber={issueNumber} />
          <Side id="policies-foreign" title={tp.policiesForeign} items={sides.foreign} none={tp.policiesForeignNone} issueNumber={issueNumber} />
        </TwoColumns>
      </div>
    </>
  )
}
