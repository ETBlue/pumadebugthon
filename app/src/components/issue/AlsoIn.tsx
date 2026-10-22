import { Link } from 'react-router'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { issueNumberTitle } from '@/lib/issues'
import { alsoInIssues, alsoInLabel } from '@/lib/stakeholders'
import type { IndexFile } from '@/types'

/** Design 4.2: the small mark 「也出現在 #1 把三千棵樹種回來」 (with the
 * titles, decision 112) when the stakeholder appears in
 * other available issues. It links to the stakeholder page. Nothing when the
 * stakeholder is in this issue only. Many marks on one page have the same
 * text, so the link's accessible name also says who and which issues. */
export function AlsoIn(props: { index: IndexFile; id: string; issueNumber: number; available: number[] }) {
  const issues = alsoInIssues(props.index.stakeholders, props.id, props.issueNumber, props.available)
  if (issues.length === 0) return null
  return (
    <Link
      to={`/stakeholders/${props.id}`}
      className={`${linkClass} text-xs`}
      aria-label={alsoInLabel(props.index, props.id, issues)}
    >
      {t.opinion.alsoIn(issues.map((n) => issueNumberTitle(props.index.issues, n)))}
    </Link>
  )
}

/** AlsoIn on its own line, for the end of a StakeholderCard. Nothing when the
 * stakeholder is in this issue only, so the card gets no empty line. */
export function AlsoInLine(props: { index: IndexFile; id: string; issueNumber: number; available: number[] }) {
  const issues = alsoInIssues(props.index.stakeholders, props.id, props.issueNumber, props.available)
  if (issues.length === 0) return null
  return <p className="mt-1"><AlsoIn {...props} /></p>
}
