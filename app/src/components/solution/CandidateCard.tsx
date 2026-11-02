import { Link, useSearchParams } from 'react-router'
import { Field } from '@/components/Field'
import { Markdown } from '@/components/Markdown'
import { SolutionTitleLink } from '@/components/SolutionCard'
import { linkClass } from '@/components/styles'
import { TypeLinks, type TypeLists } from '@/components/TypeLinks'
import { t } from '@/i18n/zh-TW'
import { candidateNeeds, type SolutionCandidate } from '@/lib/candidates'
import { findCrossSolution } from '@/lib/crossIssue'
import { dataBasisFilterSearch } from '@/lib/dataBasis'
import { solutionPath } from '@/lib/entityPaths'
import type { CrossIssueFile, Solution } from '@/types'
import { CrossSolutionLink } from './CrossSolutionCard'

const tc = t.candidates

/** One card of the 可能合併 tab (Task U6 of plan-types-ui.md): the other
 * solution of a pair, and the rows of its candidates.csv row:
 * 共同解法類型, 共同領域, 共同空間類型, 共同需求 and 已在跨議題解法, in this
 * order. An empty 共同領域 or 共同空間類型 row is left out. The card shows
 * no score and no count of the shared things.
 *
 * solution: the other solution from its issue file, for its name. null when
 * the file is not there: the link then shows only 「#n Sk」. */
export function CandidateCard({ item, solution, types, data }: {
  item: SolutionCandidate
  solution: Solution | null
  types: TypeLists
  data: CrossIssueFile
}) {
  const [params] = useSearchParams()
  const search = dataBasisFilterSearch(params)
  const c = item.candidate
  return (
    <div className="h-full rounded-md border p-3">
      <p className="font-medium">
        {solution ? (
          <SolutionTitleLink solution={solution} issueNumber={item.issueNumber} showIssue />
        ) : (
          <Link to={{ pathname: solutionPath(item.issueNumber, item.code), search }} className={linkClass}>
            <span className="font-mono">{t.solutionId(item.issueNumber, item.code)}</span>
          </Link>
        )}
      </p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <Field label={tc.solutionTypes}>
          <TypeLinks kind="solutionType" types={types.solutionTypes} codes={c.solutionTypes} />
        </Field>
        {c.domains.length > 0 && (
          <Field label={tc.domains}>
            <TypeLinks kind="domain" types={types.domainTypes} codes={c.domains} />
          </Field>
        )}
        {c.spaces.length > 0 && (
          <Field label={tc.spaces}>
            <TypeLinks kind="space" types={types.spaceTypes} codes={c.spaces} />
          </Field>
        )}
        <Field label={tc.needs}>
          {/* An X-N group and a 1.2 row have no page, so they are text, as
              on the 衝突 tab of a cross-issue solution. */}
          <ul className="space-y-1">
            {candidateNeeds(data, c.needs).map((n) =>
              n.kind === 'group' ? (
                <li key={n.id}>
                  <span className="mr-2 font-mono">{n.id}</span>
                  {n.group && <Markdown text={n.group.summary} />}
                </li>
              ) : (
                <li key={n.text}>{n.text}</li>
              ))}
          </ul>
        </Field>
        <Field label={tc.crossSolutions}>
          {c.crossSolutions.length === 0 ? (
            tc.notMerged
          ) : (
            <ul className="space-y-1">
              {c.crossSolutions.map((code) => {
                const x = findCrossSolution(data, code)
                return <li key={code}>{x ? <CrossSolutionLink solution={x} /> : code}</li>
              })}
            </ul>
          )}
        </Field>
      </dl>
    </div>
  )
}
