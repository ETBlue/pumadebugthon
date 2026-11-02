import { useMemo } from 'react'
import { LoadState } from '@/components/LoadState'
import { METHOD_CROSS_ISSUE_URL } from '@/components/links'
import { cardGridClass, linkClass } from '@/components/styles'
import { useIssues, type DataState } from '@/data'
import { t } from '@/i18n/zh-TW'
import { solutionCandidates, type SolutionCandidate } from '@/lib/candidates'
import type { CrossIssueFile, IndexFile } from '@/types'
import { CandidateCard } from './CandidateCard'
import { PartEmpty } from './Parts'

const tc = t.candidates

/** The 可能合併 tab of an issue solution (Task U6 of plan-types-ui.md,
 * decision 4): the other solution of each candidate pair, in issue number
 * then ID order (solutionCandidates). With no pair, the tab shows only a
 * short gray note, like the other solution tabs with no content (for
 * example 成效衡量 and 相關政策). Without cross-issue.json it has no pair. */
export function CandidatesTab({ index, issueNumber, code, cross }: {
  index: IndexFile
  issueNumber: number
  code: string
  cross: DataState<CrossIssueFile | null>
}) {
  if (cross.status !== 'ready') return <LoadState state={cross} />
  const list = solutionCandidates(cross.data, issueNumber, code)
  if (cross.data === null || list.length === 0) return <PartEmpty>{tc.none}</PartEmpty>
  return <CandidateList index={index} data={cross.data} list={list} />
}

/** The intro, the rule link and the cards. It loads the issue files of the
 * other solutions, for their names. */
function CandidateList({ index, data, list }: { index: IndexFile; data: CrossIssueFile; list: SolutionCandidate[] }) {
  const folders = useMemo(
    () =>
      [...new Set(list.map((c) => c.issueNumber))].flatMap(
        (n) => index.issues.find((i) => i.number === n && i.available)?.folder ?? [],
      ),
    [index, list],
  )
  const issues = useIssues(folders)
  if (issues.status !== 'ready') return <LoadState state={issues} />
  const solutionOf = (c: SolutionCandidate) =>
    issues.data.find((i) => i.number === c.issueNumber)?.solutions.find((s) => s.id === c.code) ?? null
  return (
    <>
      <p className="text-sm text-muted-foreground">
        {tc.intro}
        <a href={METHOD_CROSS_ISSUE_URL} rel="noopener noreferrer" className={`ml-1 ${linkClass}`}>{tc.methodLink}</a>
      </p>
      <ul className={`mt-6 ${cardGridClass}`}>
        {list.map((c) => (
          <li key={`${c.issueNumber}-${c.code}`} className="min-w-0">
            <CandidateCard item={c} solution={solutionOf(c)} types={index} data={data} />
          </li>
        ))}
      </ul>
    </>
  )
}
