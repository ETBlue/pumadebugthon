import { useId, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { focusOptions } from '@/lib/issues'
import { filteredSideMenuTree, groupKeys, groupStoryTotal, type SideMenuGroup } from '@/lib/sideMenu'
import { storyCountsByStakeholder } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { IssueFile, Stakeholder } from '@/types'
import { PriorityLegend } from './PriorityCounts'
import { StakeholderCard } from './StakeholderCard'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const ts = t.stakeholderList

export interface StakeholderListProps {
  /** The stakeholders of one issue. */
  stakeholders: Stakeholder[]
  pathLabels: Record<string, string>
  /** The issues whose stories are counted. */
  issues: IssueFile[]
  /** Show the 只看跨議題 toggle. Design: only when 2 or more issues exist. */
  showCrossIssueFilter: boolean
  crossIssueOnly: boolean
  onCrossIssueOnlyChange: (value: boolean) => void
}

/** The stakeholder list of the issue's 利害關係人 tab (design 3.2 and 3.9,
 * decision 115). From top to bottom:
 * 1. The menu box: the 特別關注 filter, 只看跨議題 (only with 2 or more
 *    issues), 全部展開 and 全部收合. It has the look of the list bar
 *    controls (ListBar), but it is a box in the content column.
 * 2. The count note and the priority legend.
 * 3. The tree in two columns from md: 組織 on the left, 個人 on the right
 *    (sideMenuTree, the same tree as the tree view of #/stakeholders). Each
 *    level is a button that opens or closes it. Every level is open at the
 *    start, and opens again when a filter changes. Each stakeholder is a
 *    detailed StakeholderCard with its story counts by priority.
 * Tree order and ID order only. Nothing is sorted by a count. */
export function StakeholderList(props: StakeholderListProps) {
  const { stakeholders, pathLabels, issues, showCrossIssueFilter, crossIssueOnly, onCrossIssueOnlyChange } = props
  const [focus, setFocus] = useState<string[]>([])
  // The levels the reader closed. Every other level is open.
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const focusLabelId = useId()

  const counts = useMemo(() => storyCountsByStakeholder(issues), [issues])
  const options = useMemo(() => focusOptions(stakeholders), [stakeholders])
  const crossOnly = showCrossIssueFilter && crossIssueOnly
  const tree = useMemo(
    () => filteredSideMenuTree(stakeholders, pathLabels, { crossIssueOnly: crossOnly, focus }),
    [stakeholders, pathLabels, crossOnly, focus],
  )
  // The roots (組織, 個人) are headings, not buttons, so only the levels below them.
  const allKeys = useMemo(() => tree.flatMap((root) => groupKeys(root.children)), [tree])

  // A filter change opens every level again, so every match is visible.
  const changeFocus = (value: string[]) => {
    setFocus(value)
    setClosed(new Set())
  }
  const changeCrossOnly = (value: boolean) => {
    onCrossIssueOnlyChange(value)
    setClosed(new Set())
  }
  const setOpen = (key: string, on: boolean) => {
    const next = new Set(closed)
    if (on) next.delete(key)
    else next.add(key)
    setClosed(next)
  }

  const card = (s: Stakeholder) => (
    <li key={s.id}>
      <StakeholderCard variant="detailed" stakeholder={s} entries={counts.get(s.id) ?? []} issueTitles={issues} />
    </li>
  )

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
      <div
        role="group"
        aria-label={ts.menu}
        className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-muted p-3"
      >
        {options.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span id={focusLabelId} className="text-sm font-medium">{ts.focus}</span>
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={focus}
              onValueChange={changeFocus}
              aria-labelledby={focusLabelId}
              className="min-w-0 flex-wrap"
            >
              {options.map((f) => (
                <ToggleGroupItem key={f} value={f} className={cn(toggleOnClass, 'bg-background')}>
                  <ToggleCheck />
                  {f}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
        {showCrossIssueFilter && (
          <Toggle variant="outline" pressed={crossOnly} onPressedChange={changeCrossOnly} className={cn(toggleOnClass, buttonClass)}>
            <ToggleCheck />
            {ts.crossIssueOnly}
          </Toggle>
        )}
        {allKeys.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className={buttonClass} onClick={() => setClosed(new Set())}>{ts.expandAll}</Button>
            <Button variant="outline" className={buttonClass} onClick={() => setClosed(new Set(allKeys))}>{ts.collapseAll}</Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{ts.countNote}</p>
        <PriorityLegend />
      </div>

      {tree.length === 0 ? (
        <p>{ts.none}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
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
