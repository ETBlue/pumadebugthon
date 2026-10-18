import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useIssues } from '@/data'
import { availableIssues } from '@/lib/issues'
import type { IndexFile } from '@/types'
import { LoadState } from './LoadState'
import { StakeholderList } from './StakeholderList'

/** The stakeholder list of every analyzed issue (design 3.9). The 只看跨議題
 * filter is in the URL (?cross=1), so an issue card can link to it. */
export function AllStakeholders({ index, headingLevel }: { index: IndexFile; headingLevel: 2 | 3 }) {
  const available = useMemo(() => availableIssues(index), [index])
  const folders = useMemo(() => available.map((i) => i.folder), [available])
  const issues = useIssues(folders)
  const [params, setParams] = useSearchParams()
  const crossIssueOnly = params.get('cross') === '1'
  const setCrossIssueOnly = (on: boolean) =>
    setParams(on ? { cross: '1' } : {}, { replace: true, preventScrollReset: true })

  if (issues.status !== 'ready') return <LoadState state={issues} />
  return (
    <StakeholderList
      stakeholders={index.stakeholders}
      pathLabels={index.pathLabels}
      issues={issues.data}
      showCrossIssueFilter={available.length >= 2}
      crossIssueOnly={crossIssueOnly}
      onCrossIssueOnlyChange={setCrossIssueOnly}
      headingLevel={headingLevel}
    />
  )
}
