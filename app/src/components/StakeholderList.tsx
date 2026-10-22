import { useId, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { focusOptions } from '@/lib/issues'
import {
  buildTree, filterStakeholders, storyCountsByStakeholder, type StoryCountsByStakeholder, type TreeNode,
} from '@/lib/stakeholders'
import type { IssueFile, Stakeholder } from '@/types'
import { PriorityLegend } from './PriorityCounts'
import { StakeholderCard } from './StakeholderCard'
import { toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const ts = t.stakeholderList

/** One stakeholder in the tree: a detailed card (design 3.9). */
function StakeholderRow({ stakeholder: s, counts, issues }: { stakeholder: Stakeholder; counts: StoryCountsByStakeholder; issues: IssueFile[] }) {
  return (
    <li>
      <StakeholderCard variant="detailed" stakeholder={s} entries={counts.get(s.id) ?? []} issueTitles={issues} />
    </li>
  )
}

function TreeLevel({ node, depth, openAll, counts, issues }: { node: TreeNode; depth: number; openAll: boolean; counts: StoryCountsByStakeholder; issues: IssueFile[] }) {
  return (
    <li>
      <Collapsible defaultOpen={openAll || depth === 0}>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md px-1 py-2 text-left hover:bg-muted">
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
          <span className="font-medium">{node.label}</span>
          <span className="text-sm text-muted-foreground">{ts.storyTotal(node.storyTotal)}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="ml-3 space-y-2 border-l pb-2 pl-3 md:ml-4 md:pl-4">
            {node.stakeholders.map((s) => <StakeholderRow key={s.id} stakeholder={s} counts={counts} issues={issues} />)}
            {node.children.map((c) => (
              <TreeLevel key={c.path} node={c} depth={depth + 1} openAll={openAll} counts={counts} issues={issues} />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

export interface StakeholderListProps {
  /** All stakeholders from index.json (or the ones of one issue). */
  stakeholders: Stakeholder[]
  pathLabels: Record<string, string>
  /** The issues whose stories are counted. */
  issues: IssueFile[]
  /** Show the 只看跨議題 toggle. Design: only when 2 or more issues exist. */
  showCrossIssueFilter: boolean
  crossIssueOnly: boolean
  onCrossIssueOnlyChange: (value: boolean) => void
  /** Level of the 組織 and 個人 headings. The 個人 groups are one level lower.
   * 3 under an h2 (the issue tab), 2 under an h1 (the list page). */
  headingLevel?: 2 | 3
}

/** The stakeholder list (design 3.9): the O tree, the I groups, the filters,
 * the count note and the priority legend. Tree order or ID order only. */
export function StakeholderList(props: StakeholderListProps) {
  const { stakeholders, pathLabels, issues, showCrossIssueFilter, crossIssueOnly, onCrossIssueOnlyChange, headingLevel = 3 } = props
  const H = `h${headingLevel}` as const
  const H2 = `h${headingLevel + 1}` as 'h3' | 'h4'
  const [focus, setFocus] = useState<string[]>([])
  const focusLabelId = useId()

  const counts = useMemo(() => storyCountsByStakeholder(issues), [issues])
  const options = useMemo(() => focusOptions(stakeholders), [stakeholders])
  const crossOnly = showCrossIssueFilter && crossIssueOnly
  const tree = useMemo(
    () => buildTree(filterStakeholders(stakeholders, { crossIssueOnly: crossOnly, focus }), pathLabels, counts),
    [stakeholders, pathLabels, counts, crossOnly, focus],
  )
  // With a filter on, open every level, so the matches are visible.
  const filtering = crossOnly || focus.length > 0
  const treeKey = `${crossOnly}:${focus.join(',')}`
  const empty = tree.organizations.length === 0 && tree.individuals.length === 0

  return (
    <div className="space-y-4">
      <div role="group" aria-label={ts.filters} className="space-y-3">
        {showCrossIssueFilter && (
          <Toggle variant="outline" pressed={crossOnly} onPressedChange={onCrossIssueOnlyChange} className={toggleOnClass}>
            <ToggleCheck />
            {ts.crossIssueOnly}
          </Toggle>
        )}
        {options.length > 0 && (
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <span id={focusLabelId} className="text-sm text-muted-foreground">{ts.focus}</span>
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={focus}
              onValueChange={setFocus}
              aria-labelledby={focusLabelId}
              className="flex-wrap"
            >
              {options.map((f) => (
                <ToggleGroupItem key={f} value={f} className={toggleOnClass}>
                  <ToggleCheck />
                  {f}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{ts.countNote}</p>
        <PriorityLegend />
      </div>

      {empty && <p>{ts.none}</p>}

      {tree.organizations.length > 0 && (
        <section>
          <H className="text-lg font-semibold">{ts.organizations}</H>
          <ul key={treeKey} className="mt-1">
            {tree.organizations.map((n) => (
              <TreeLevel key={n.path} node={n} depth={0} openAll={filtering} counts={counts} issues={issues} />
            ))}
          </ul>
        </section>
      )}

      {tree.individuals.length > 0 && (
        <section>
          <H className="text-lg font-semibold">{ts.individuals}</H>
          {tree.individuals.map((n) => (
            <div key={n.path} className="mt-3">
              <H2 className="flex flex-wrap items-baseline gap-x-2 font-medium">
                {n.label}
                <span className="text-sm font-normal text-muted-foreground">{ts.storyTotal(n.storyTotal)}</span>
              </H2>
              <ul className="mt-2 ml-1 space-y-2 border-l pl-3 md:pl-4">
                {n.stakeholders.map((s) => <StakeholderRow key={s.id} stakeholder={s} counts={counts} issues={issues} />)}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
