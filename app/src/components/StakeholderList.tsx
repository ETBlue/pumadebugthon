import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { dataBasedOnly as onlyDataBased } from '@/lib/dataBasis'
import { filteredSideMenuTree, groupKeys, groupStoryTotal, type SideMenuGroup } from '@/lib/sideMenu'
import { clearStakeholdersTabSearch, specialOptions } from '@/lib/stakeholderFilter'
import { storyCountsByStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { IssueFile, Stakeholder } from '@/types'
import { DataBasisToggle } from './DataBasisToggle'
import { FilterStatus } from './FilterStatus'
import { IssueMenuBar, MenuBarGroup } from './IssueMenuBar'
import { PriorityLegend } from './PriorityCounts'
import { StakeholderCard } from './StakeholderCard'
import { StoryLines } from './StoryLines'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const ts = t.stakeholderList

export interface StakeholderListProps {
  /** The stakeholders of one issue. */
  stakeholders: Stakeholder[]
  pathLabels: Record<string, string>
  /** The issues whose stories are counted and listed. */
  issues: IssueFile[]
  /** The picked 特別關注 groups (?special=, decision 121), in FOCUS_ORDER. */
  focus: string[]
  onFocusChange: (groups: string[]) => void
  /** Show the 只看跨議題 toggle. Design: only when 2 or more issues exist. */
  showCrossIssueFilter: boolean
  /** 只看跨議題 (?cross=1, decision 121). */
  crossIssueOnly: boolean
  onCrossIssueOnlyChange: (value: boolean) => void
  /** 只看有資料根據 (?evidence=1, the same setting as the other tabs). It
   * hides the stories with no data basis (dataBasedOnly in
   * src/lib/dataBasis.ts), and then the stakeholders and levels with no
   * story left (decision 116). */
  dataBasedOnly: boolean
}

/** The stakeholder list of the issue's 利害關係人 tab (design 3.2 and 3.9,
 * decisions 115 and 116). From top to bottom:
 * 1. The menu bar (IssueMenuBar), in three groups: 特別關注; 篩選 with
 *    只看跨議題 (only with 2 or more issues) and 只看有資料根據; 分類層級
 *    with 全部展開 and 全部收合.
 * 2. The filter status line with 「清除篩選」 (FilterStatus, decision 121):
 *    the filters that are on and the number of stakeholders shown. Empty
 *    when no filter is on.
 * 3. The count note and the priority legend.
 * 4. The tree: 組織 and 個人 in two columns from md (sideMenuTree, the same
 *    tree as the tree view of #/stakeholders). When a filter leaves only one
 *    of them, it takes the full width. Each level is a button that opens or
 *    closes it. Every level is open at the start, and opens again when a
 *    filter changes. Each stakeholder is a detailed StakeholderCard with its
 *    story counts by priority and its stories (StoryLines).
 * With 只看有資料根據, the stories, the counts and the totals count only the
 * stories with a data basis, and a stakeholder with no such story is not
 * shown. The filters are in the URL (decision 121); the page passes them
 * in. Which levels are closed is page state. Tree order, ID order and file order only. Nothing is sorted by a
 * count. */
export function StakeholderList(props: StakeholderListProps) {
  const {
    stakeholders, pathLabels, issues, focus, onFocusChange, showCrossIssueFilter, crossIssueOnly, onCrossIssueOnlyChange, dataBasedOnly,
  } = props
  // The levels the reader closed. Every other level is open.
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())

  const crossOnly = showCrossIssueFilter && crossIssueOnly
  // The filters are in the URL (decision 121). When one changes (also with
  // the back button), open every level again, so every match is visible.
  // This runs during render, not in an effect.
  const filterKey = `${dataBasedOnly}|${crossOnly}|${focus.join(',')}`
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey)
  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey)
    setClosed(new Set())
  }

  // The stories the tab shows: all, or only the ones with a data basis.
  const shownIssues = useMemo(
    () => (dataBasedOnly ? issues.map((i) => ({ ...i, stories: onlyDataBased(i.stories) })) : issues),
    [issues, dataBasedOnly],
  )
  const counts = useMemo(() => storyCountsByStakeholder(shownIssues), [shownIssues])
  // Only the groups of FOCUS_ORDER, because ?special= keeps only those.
  const options = useMemo(() => specialOptions(stakeholders), [stakeholders])
  // With the data filter, a stakeholder with no story left is not shown.
  const withStories = useMemo(
    () => (dataBasedOnly
      ? stakeholders.filter((s) => (counts.get(s.id) ?? []).some((e) => e.stories.length > 0))
      : stakeholders),
    [stakeholders, counts, dataBasedOnly],
  )
  const tree = useMemo(
    () => filteredSideMenuTree(withStories, pathLabels, { crossIssueOnly: crossOnly, focus }),
    [withStories, pathLabels, crossOnly, focus],
  )
  // The roots (組織, 個人) are headings, not buttons, so only the levels below them.
  const allKeys = useMemo(() => tree.flatMap((root) => groupKeys(root.children)), [tree])

  const shownCount = useMemo(() => tree.reduce((n, root) => n + stakeholderCount(root), 0), [tree])
  const setOpen = (key: string, on: boolean) => {
    const next = new Set(closed)
    if (on) next.delete(key)
    else next.add(key)
    setClosed(next)
  }

  const card = (s: Stakeholder) => {
    const entries = counts.get(s.id) ?? []
    return (
      <li key={s.id}>
        <StakeholderCard variant="detailed" stakeholder={s} entries={entries} issueTitles={issues}>
          {entries.map((e) => {
            const issue = shownIssues.find((i) => i.number === e.issueNumber)
            return issue === undefined ? null : (
              <StoryLines
                key={e.issueNumber}
                stories={e.stories}
                issue={issue}
                label={t.storyLine.listLabel(s.name)}
                className="mt-2"
              />
            )
          })}
        </StakeholderCard>
      </li>
    )
  }

  const level = (g: SideMenuGroup): ReactNode => (
    <li key={g.key}>
      <Collapsible open={!closed.has(g.key)} onOpenChange={(on) => setOpen(g.key, on)}>
        <CollapsibleTrigger className="group flex w-full items-start gap-2 rounded-md px-1 py-2 text-left hover:bg-muted">
          <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
          <span className="min-w-0 break-words font-medium">{g.label}</span>
          <span className="shrink-0 text-sm text-muted-foreground">{ts.storyTotal(groupStoryTotal(g, counts))}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-3 space-y-2 border-l pb-2 pl-3">
            {g.stakeholders.map(card)}
            {g.children.map(level)}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )

  const buttonClass = 'shrink-0 bg-background'

  return (
    <div className="space-y-4">
      <IssueMenuBar label={ts.menu}>
        {options.length > 0 && (
          <MenuBarGroup label={ts.focus}>
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={focus}
              onValueChange={onFocusChange}
              aria-label={ts.focus}
              className="min-w-0 flex-wrap"
            >
              {options.map((f) => (
                <ToggleGroupItem key={f} value={f} className={cn(toggleOnClass, 'bg-background')}>
                  <ToggleCheck />
                  {f}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </MenuBarGroup>
        )}
        <MenuBarGroup label={ts.filterGroup}>
          {showCrossIssueFilter && (
            <Toggle variant="outline" pressed={crossOnly} onPressedChange={onCrossIssueOnlyChange} className={cn(toggleOnClass, buttonClass)}>
              <ToggleCheck />
              {ts.crossIssueOnly}
            </Toggle>
          )}
          <DataBasisToggle variant="bar" />
        </MenuBarGroup>
        {allKeys.length > 0 && (
          <MenuBarGroup label={ts.levelGroup}>
            <Button variant="outline" className={buttonClass} onClick={() => setClosed(new Set())}>{ts.expandAll}</Button>
            <Button variant="outline" className={buttonClass} onClick={() => setClosed(new Set(allKeys))}>{ts.collapseAll}</Button>
          </MenuBarGroup>
        )}
      </IssueMenuBar>

      <div className="space-y-1">
        {/* Inside this block, so an empty status line adds almost no gap. */}
        <FilterStatus
          filters={{ dataBasedOnly, special: focus }}
          stakeholder={null}
          crossIssueOnly={crossOnly}
          shown={t.sideMenu.shownStakeholders(shownCount)}
          clearSearch={clearStakeholdersTabSearch}
        />
        <p className="text-sm text-muted-foreground">
          {ts.countNote}
          {dataBasedOnly && ts.countNoteDataBased}
        </p>
        <PriorityLegend />
      </div>

      {tree.length === 0 ? (
        <p>{ts.none}</p>
      ) : (
        // Two columns only when both 組織 and 個人 are left (decision 116).
        <div className={cn('grid gap-6 md:gap-8', tree.length > 1 && 'md:grid-cols-2')}>
          {tree.map((root) => (
            <section key={root.key} aria-labelledby={`stakeholders-root-${root.key}`} className="min-w-0">
              <h3 id={`stakeholders-root-${root.key}`} className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold">
                {root.root === 'O' ? ts.organizations : ts.individuals}
                <span className="text-sm font-normal text-muted-foreground">{ts.storyTotal(groupStoryTotal(root, counts))}</span>
              </h3>
              <ul className="mt-2 space-y-2">
                {root.stakeholders.map(card)}
                {root.children.map(level)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/** The number of stakeholders in a group and in all its levels below. */
function stakeholderCount(group: SideMenuGroup): number {
  return group.stakeholders.length + group.children.reduce((n, g) => n + stakeholderCount(g), 0)
}
