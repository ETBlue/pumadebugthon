import { Link } from 'react-router'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { alsoInIssues } from '@/lib/stakeholders'
import type { Stakeholder } from '@/types'

/** Design 4.2: the small mark 「也出現在 #1」 when the stakeholder appears in
 * other available issues. It links to the stakeholder page. Nothing when the
 * stakeholder is in this issue only. */
export function AlsoIn(props: { stakeholders: Stakeholder[]; id: string; issueNumber: number; available: number[] }) {
  const issues = alsoInIssues(props.stakeholders, props.id, props.issueNumber, props.available)
  if (issues.length === 0) return null
  return (
    <Link to={`/stakeholders/${props.id}`} className={`${linkClass} text-xs`}>
      {t.opinion.alsoIn(issues)}
    </Link>
  )
}
