import { ConflictView } from '@/components/ConflictView'
import { t } from '@/i18n/zh-TW'
import type { ConflictView as ConflictData } from '@/lib/wantList'
import type { IssueFile, Stakeholder } from '@/types'

const tw = t.wantsTab

/** The 「衝突」 part of the 訴求 tab (design 3.2): each conflict in file order,
 * as a ConflictView with the element ID focus-<conflict ID>. The list comes
 * from wantsTabView, so the stakeholder filter is already applied. */
export function ConflictsTab({ conflicts, issue, stakeholders, filtered, dataBasedOnly }: {
  conflicts: ConflictData[]
  issue: IssueFile
  /** All stakeholders from index.json, for the names. */
  stakeholders: Stakeholder[]
  /** True when the stakeholder filter is on, for the empty message. */
  filtered: boolean
  dataBasedOnly: boolean
}) {
  if (conflicts.length === 0) {
    return <p className="mt-2">{filtered && issue.conflicts.length > 0 ? tw.conflictsNoneFiltered : tw.conflictsNone}</p>
  }
  return (
    <ul className="mt-3 space-y-6">
      {conflicts.map((view) => (
        <li key={view.conflict.id}>
          <ConflictView view={view} issue={issue} stakeholders={stakeholders} headingLevel={4} dataBasedOnly={dataBasedOnly} />
        </li>
      ))}
    </ul>
  )
}
