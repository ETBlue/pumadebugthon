import { useId } from 'react'
import { t } from '@/i18n/zh-TW'
import { needSummaryOf } from '@/lib/needs'
import { cn } from '@/lib/utils'
import type { ConflictView as ConflictData } from '@/lib/wantList'
import type { IssueFile, Need, Stakeholder, Story } from '@/types'
import { CellText } from './CellText'
import { focusTargetProps } from './FocusTarget'
import { Heading, subLevel, type HeadingLevel } from './Heading'
import { NeedPriority, NeedSummaryLink } from './NeedItem'
import { SolutionTitleLink } from './SolutionCard'
import { StoryList } from './StoryList'
import { focusTargetClass } from './styles'
import { ItemKey } from './ItemKey'

const tc = t.conflict

export interface ConflictViewProps {
  /** The conflict with its stories, needs and way out (conflictView in src/lib/wantList.ts). */
  view: ConflictData
  /** The issue of the conflict, for the need summaries and the links. */
  issue: IssueFile
  /** All stakeholders from index.json, for the names. */
  stakeholders: Stakeholder[]
  /** The level of the conflict heading. Default 4 (under the h3 「衝突」). */
  headingLevel?: HeadingLevel
  /** When given, show only these stories, under 「另一方的故事」, in place of
   * both sides (the stakeholder page and the story page). */
  otherStories?: Story[]
  /** The 「只看有資料根據」 filter for the story lists. */
  dataBasedOnly?: boolean
  /** Give the conflict the element ID focus-<conflict ID>. Default true. Set
   * false where the same ID can show twice on one page. */
  focusTarget?: boolean
}

/** One conflict (design 3.2): the text with its tag, the stories of each
 * side, 雙方的需求, 以需求為本的解方, then the method and the simulated
 * result. With a way out, the method heading is 「備案：審議方法」, because the
 * method is only for places where the way out does not work. */
export function ConflictView({
  view, issue, stakeholders, headingLevel = 4, otherStories, dataBasedOnly = false, focusTarget = true,
}: ConflictViewProps) {
  const { conflict: c } = view
  const n = issue.number
  const sub = subLevel(headingLevel)
  const headingId = useId()
  const stories = (list: Story[]) => (
    <StoryList stories={list} issueNumber={n} stakeholders={stakeholders} dataBasedOnly={dataBasedOnly} />
  )
  const needs = (label: string, list: Need[]) => (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      {list.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{tc.needsNone}</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {list.map((need) => (
            <li key={need.id}>
              <NeedSummaryLink summary={needSummaryOf(issue, need)} issueNumber={n} needKey={need.id} />
              <ItemKey issueNumber={n} value={need.id} className="ml-2 text-xs" muted />
              <span className="mt-0.5 block text-sm"><NeedPriority need={need} /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <article
      {...(focusTarget ? focusTargetProps(c.id) : {})}
      aria-labelledby={headingId}
      className={cn('rounded-lg border p-3 md:p-4', focusTarget && focusTargetClass)}
    >
      <Heading level={headingLevel} id={headingId} className="text-lg font-semibold">
        <span className="mr-2 font-mono">{c.id}</span>
        <CellText cell={c.text} />
      </Heading>

      {otherStories ? (
        <section className="mt-3">
          <Heading level={sub} className="font-medium">{tc.otherSide}</Heading>
          {stories(otherStories)}
        </section>
      ) : (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <section className="min-w-0">
            <Heading level={sub} className="font-medium">{tc.sideA}</Heading>
            {stories(view.storiesA)}
          </section>
          <section className="min-w-0">
            <Heading level={sub} className="font-medium">{tc.sideB}</Heading>
            {stories(view.storiesB)}
          </section>
        </div>
      )}

      {(view.needsA.length > 0 || view.needsB.length > 0) && (
        <section className="mt-4">
          <Heading level={sub} className="font-medium">{tc.needs}</Heading>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            {needs(tc.needsA, view.needsA)}
            {needs(tc.needsB, view.needsB)}
          </div>
        </section>
      )}

      {view.wayOut !== null && (
        <section className="mt-4">
          <Heading level={sub} className="font-medium">{tc.wayOut}</Heading>
          <p className="mt-1"><CellText cell={view.wayOut} /></p>
          {view.wayOutSolutions.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="text-muted-foreground">{tc.wayOutSolutions}</p>
              <ul className="mt-1 space-y-1">
                {view.wayOutSolutions.map((sol) => (
                  <li key={sol.id}><SolutionTitleLink solution={sol} issueNumber={n} /></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-4">
        <Heading level={sub} className="font-medium">{view.hasWayOut ? tc.methodFallback : tc.method}</Heading>
        <p className="mt-1"><CellText cell={c.method} /></p>
        <p className="mt-2 text-sm text-muted-foreground">{tc.result}</p>
        <p className="mt-1"><CellText cell={c.result} /></p>
      </section>
    </article>
  )
}
