import { useMemo, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { availableIssues, filterIssuesBySpace, sharedStakeholders, usedSpaceTypes } from '@/lib/issues'
import type { IndexFile } from '@/types'
import { IssueCard } from './IssueCard'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const th = t.issueList

/** The issue cards with the space type filter (design 3.9). Issue number
 * order. headingLevel is the level of each card title. */
export function IssueList({ index, headingLevel }: { index: IndexFile; headingLevel: 2 | 3 }) {
  const spaceOptions = useMemo(() => usedSpaceTypes(index), [index])
  const [spaces, setSpaces] = useState<string[]>([])
  const shownIssues = filterIssuesBySpace(index.issues, spaces)
  const multi = availableIssues(index).length >= 2
  const spaceLabelId = 'space-filter-label'
  return (
    <>
      {spaceOptions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p id={spaceLabelId} className="text-sm text-muted-foreground">
            {th.spaceFilter}
            <span className="block text-xs">{th.spaceFilterHint}</span>
          </p>
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={spaces}
            onValueChange={setSpaces}
            aria-labelledby={spaceLabelId}
            className="flex-wrap"
          >
            {spaceOptions.map((s) => (
              <ToggleGroupItem key={s.code} value={s.code} className={toggleOnClass}>
                <ToggleCheck />
                {s.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
      {shownIssues.length === 0 ? (
        <p className="mt-4">{th.noIssues}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {shownIssues.map((issue) => (
            <li key={issue.number}>
              <IssueCard
                variant="detailed"
                issue={issue}
                spaceTypes={index.spaceTypes}
                shared={multi && issue.available ? sharedStakeholders(index.stakeholders, issue.number) : null}
                headingLevel={headingLevel}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
