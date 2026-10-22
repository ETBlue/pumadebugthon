import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CellBasis } from '@/components/CellBasis'
import { CellText } from '@/components/CellText'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { FilterStatus } from '@/components/FilterStatus'
import { focusTargetProps } from '@/components/FocusTarget'
import { StakeholderList } from '@/components/StakeholderList'
import { focusTargetClass, linkClass, proseClass } from '@/components/styles'
import { t } from '@/i18n/zh-TW'
import { disadvantagedGroups, type DisadvantagedGroup } from '@/lib/focusGroups'
import { issueStakeholders } from '@/lib/stakeholders'
import { summaryItemsShown } from '@/lib/summary'
import type { IssueFile } from '@/types'
import { SummaryRefs } from './SummaryTab'
import type { IssueTabProps } from './types'

const ts = t.issue.stakeholdersTab

/** 利害關係人 (design 3.2, decision 109). From top to bottom:
 * 1. 受影響較大的弱勢族群: the 「只看有資料根據」 toggle, the filter status
 *    line, then one card per group in the fixed order (disadvantagedGroups).
 *    A card has the 分析摘要 row of the group (說明 with its tag and the
 *    「相關：」 links) and its 特別關注族群 check (stakeholders, stories,
 *    資料根據). A group that the issue has not included yet has a dashed
 *    border. With the filter on, a 說明 tagged [AI模擬] or 【待補】 is hidden
 *    (decision 108), but the card stays, because the check part is not an AI
 *    claim and a missing group must stay visible. A hidden [AI模擬] 說明
 *    leaves a short gray note in its place.
 * 2. 利害關係人 (element ID focus-stakeholders): the home page list, limited
 *    to this issue and its story counts (decision 38). */
export function StakeholdersTab({ index, issue, summary, available }: IssueTabProps) {
  const stakeholders = useMemo(() => issueStakeholders(index.stakeholders, issue), [index, issue])
  const issues = useMemo(() => [issue], [issue])
  const groups = useMemo(() => disadvantagedGroups(issue, index.stakeholders), [issue, index])
  const [crossIssueOnly, setCrossIssueOnly] = useState(false)
  const [dataBasedOnly] = useDataBasisFilter()
  const items = groups.flatMap((g) => (g.item ? [g.item] : []))
  const shown = new Set(summaryItemsShown(items, dataBasedOnly))

  return (
    <div className="space-y-8">
      <section aria-labelledby="groups-heading">
        <h3 id="groups-heading" className="text-lg font-semibold">{ts.groupsHeading}</h3>
        <p className={`mt-2 text-sm leading-relaxed text-muted-foreground ${proseClass}`}>{ts.groupsIntro}</p>
        <DataBasisToggle className="mt-4" />
        <FilterStatus
          filters={{ dataBasedOnly, special: [] }}
          stakeholder={null}
          shown={ts.shown(shown.size)}
          className="mt-3"
        />
        {groups.length === 0 ? (
          <p className="mt-4">{ts.none}</p>
        ) : (
          /* Always the fixed order (FOCUS_ORDER), never by count (design 13). */
          <ul aria-label={ts.groupsHeading} className="mt-4 grid gap-3 md:grid-cols-2">
            {groups.map((g) => (
              <GroupCard
                key={g.tag}
                group={g}
                itemShown={g.item !== null && shown.has(g.item)}
                issueNumber={summary.number}
                issue={issue}
                dataBasedOnly={dataBasedOnly}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ?focus=stakeholders scrolls here (the links from the stakeholder cards, decision 109). */}
      <section {...focusTargetProps('stakeholders')} aria-labelledby="stakeholders-heading" className={focusTargetClass}>
        <h3 id="stakeholders-heading" className="text-lg font-semibold">{ts.stakeholdersHeading}</h3>
        <div className="mt-2">
          <StakeholderList
            stakeholders={stakeholders}
            pathLabels={index.pathLabels}
            issues={issues}
            showCrossIssueFilter={available.length >= 2}
            crossIssueOnly={crossIssueOnly}
            onCrossIssueOnlyChange={setCrossIssueOnly}
          />
        </div>
      </section>
    </div>
  )
}

/** One group: the 分析摘要 row first, then the 特別關注族群 check. */
function GroupCard({ group: g, itemShown, issueNumber, issue, dataBasedOnly }: {
  group: DisadvantagedGroup
  itemShown: boolean
  issueNumber: number
  issue: IssueFile
  dataBasedOnly: boolean
}) {
  const f = g.focus
  // Not included: no stakeholder in the check, or (with no check row) a 【待補】 row.
  const missing = f ? !f.included : g.item?.text.pending === true
  // The check note of a missing group often has the same 【待補】 text as the
  // row. Then it is shown once.
  const note = f?.note && !(itemShown && f.note.text === g.item?.text.text) ? f.note : null
  return (
    <li
      className={
        missing
          ? 'min-w-0 rounded-lg border border-dashed border-muted-foreground bg-muted/40 p-3'
          : 'min-w-0 rounded-lg border p-3'
      }
    >
      <h4 className="font-medium">{g.tag}</h4>
      <div className={`mt-1 space-y-1.5 text-sm ${proseClass}`}>
        {missing && <p className="font-medium">{ts.groupNotIncluded}</p>}
        {g.item && (itemShown ? (
          <>
            <p><CellText cell={g.item.text} /></p>
            <SummaryRefs refs={g.item.refs} issueNumber={issueNumber} issue={issue} dataBasedOnly={dataBasedOnly} />
          </>
        ) : g.item.text.pending ? null : (
          // A hidden 【待補】 row needs no note: 「本議題尚未納入」 and the
          // check note already say what is missing.
          <p className="text-muted-foreground">{ts.itemHidden}</p>
        ))}
        {f && f.included && (
          <>
            <p className="flex flex-wrap gap-x-2">
              <span className="text-muted-foreground">{ts.groupStakeholders}</span>
              <span className="min-w-0">
                {f.stakeholders.map((s, i) => (
                  <span key={s.id}>
                    <Link to={`/stakeholders/${s.id}`} className={linkClass}>{ts.groupStakeholderLink(s.id, s.name)}</Link>
                    {i < f.stakeholders.length - 1 && t.listSeparator}
                  </span>
                ))}
              </span>
            </p>
            <p>{ts.groupStories(f.stories)}</p>
            <CellBasis cells={f.cells} stories={f.stories} compact />
          </>
        )}
        {note && <p><CellText cell={note} /></p>}
      </div>
    </li>
  )
}
