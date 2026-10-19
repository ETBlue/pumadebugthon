import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTabTo } from '@/components/DataBasisToggle'
import { linkClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import type { IndexFile, IssueFile } from '@/types'

/** The props of each tab of the stakeholder page (design 3.3). */
export interface StakeholderTabProps {
  index: IndexFile
  /** The available issues of the stakeholder, in number order. */
  issues: IssueFile[]
  /** The stakeholder ID. */
  id: string
}

/** One issue in a tab of the stakeholder page: an h2 with a link to the
 * issue, then the content. The ID prefix makes the element IDs unique per
 * tab and issue. */
export function IssueSection({ issue, tab, children }: { issue: IssueFile; tab: string; children: ReactNode }) {
  const tabTo = useTabTo()
  const headingId = `stakeholder-${tab}-${issue.number}`
  return (
    <section aria-labelledby={headingId} className="space-y-6 border-t pt-6">
      <h2 id={headingId} className="text-xl font-bold">
        <Link to={tabTo(issue.number, 'overview')} className={linkClass}>
          {t.issueCard.numberTitle(issue.number, issue.title)}
        </Link>
      </h2>
      {children}
    </section>
  )
}

/** A part of an issue section with an h3. */
export function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-lg font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/** A gray line for an empty part. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>
}
