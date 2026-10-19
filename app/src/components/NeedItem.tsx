import { useId, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch, isDataBasisFilterOn } from '@/lib/dataBasis'
import { conflictFocusPath, needFocusPath, stakeholderTabPath, storyPath } from '@/lib/entityPaths'
import { stripMarkdown } from '@/lib/markdown'
import type { NeedItem as NeedData } from '@/lib/needs'
import { priorityLabel } from '@/lib/priority'
import { stakeholderName } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { Cell, Need, Stakeholder, Story } from '@/types'
import { CellText } from './CellText'
import { Field } from './Field'
import { focusTargetProps } from './FocusTarget'
import { Heading, type HeadingLevel } from './Heading'
import { SolutionTitleLink } from './SolutionCard'
import { focusTargetClass, linkClass } from './styles'
import { TagBadge } from './TagBadge'

const tn = t.need

/** A summary cell as a link to the need on the issue's 需求 tab (?focus=,
 * decision 57). The tag badge stays outside the link, next to the text. A
 * 【待補】 summary is gray, with no tag. The link keeps ?evidence=1. */
export function NeedSummaryLink({ summary, issueNumber, needKey }: { summary: Cell; issueNumber: number; needKey: string }) {
  const [params] = useSearchParams()
  return (
    <>
      {!summary.pending && summary.tag && <TagBadge kind={summary.tag} className="mr-1.5" />}
      <Link
        to={needFocusPath(issueNumber, needKey, isDataBasisFilterOn(params))}
        className={cn(linkClass, summary.pending && 'text-muted-foreground')}
      >
        {stripMarkdown(summary.text)}
      </Link>
    </>
  )
}

/** The priority label of a need with its tag, for example 「[AI模擬] 必須有」. */
export function NeedPriority({ need }: { need: Need }) {
  return (
    <>
      <TagBadge kind={need.priorityTag} className="mr-1.5" />
      {priorityLabel(need.priority)}
    </>
  )
}

/** The parts of a need that NeedItem can show. */
export type NeedPart = 'id' | 'priority' | 'reason' | 'stakeholders' | 'ownStories' | 'stories' | 'solutions' | 'conflicts'

/** The parts of the issue's 需求 tab (design 3.2). */
export const ISSUE_NEED_PARTS: readonly NeedPart[] = [
  'id', 'priority', 'reason', 'stakeholders', 'stories', 'solutions', 'conflicts',
]

export interface NeedItemProps {
  item: NeedData
  issueNumber: number
  /** All stakeholders from index.json, for the names. */
  stakeholders: Stakeholder[]
  /** Which parts show, in a fixed order. Default: the parts of the issue's
   * 需求 tab (ISSUE_NEED_PARTS). */
  parts?: readonly NeedPart[]
  /** The level of the summary heading. Default 4 (under the h3 of a priority group). */
  headingLevel?: HeadingLevel
  /** The summary links to the need on the issue's 需求 tab. Use it outside
   * that tab (stakeholder page, solution tab). */
  summaryLink?: boolean
  /** stakeholders part: false shows plain IDs instead of links (the issue's 解法 tab). */
  stakeholderLinks?: boolean
  /** stakeholders part: leave out this stakeholder, and use the label
   * 「同樣需要的人」 instead of 「誰需要」 (the stakeholder page). */
  others?: string
  /** ownStories part: the stakeholder's own stories of this need. Their
   * 以便… texts show when they differ from the summary. */
  ownStories?: Story[]
  /** solutions part: leave out this solution (by ID), and use the label
   * 「由其他解法涵蓋」 (the solution page). */
  otherSolutionsThan?: string
  /** Give the item the element ID focus-<need key> (design 3.16). Default
   * true. Set false where the same key can show twice on one page (the
   * stakeholder page has one list per issue). */
  focusTarget?: boolean
  /** Extra content for one page, at the end. */
  children?: ReactNode
}

/** One need (需求) in a list (design 3.2, 3.3, 3.16): the summary with its
 * tag, then the parts the page asks for. Stakeholders are in ID order and
 * solutions in letter order, as NeedItem in src/lib/needs.ts gives them. */
export function NeedItem({
  item, issueNumber, stakeholders, parts = ISSUE_NEED_PARTS, headingLevel = 4, summaryLink = false,
  stakeholderLinks = true, others, ownStories, otherSolutionsThan, focusTarget = true, children,
}: NeedItemProps) {
  const [params] = useSearchParams()
  const dataBasedOnly = isDataBasisFilterOn(params)
  const { need, summary } = item
  const has = (part: NeedPart) => parts.includes(part)
  const who = item.stakeholders.filter((id) => id !== others)
  const solutions = item.solutions.filter((s) => s.solution.id !== otherSolutionsThan)
  const ownTexts = (ownStories ?? []).filter((s) => s.soThat.text !== summary.text)
  const name = (id: string) => stakeholderName(stakeholders, id)
  const headingId = useId()

  return (
    <article
      {...(focusTarget ? focusTargetProps(need.id) : {})}
      aria-labelledby={headingId}
      className={cn('rounded-lg border p-3 md:p-4', focusTarget && focusTargetClass)}
    >
      <Heading level={headingLevel} id={headingId} className="font-semibold">
        {summaryLink ? (
          <NeedSummaryLink summary={summary} issueNumber={issueNumber} needKey={need.id} />
        ) : (
          <CellText cell={summary} />
        )}
      </Heading>
      {has('id') && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{need.id}</p>}

      <dl className="mt-2 space-y-1.5 text-sm">
        {has('priority') && (
          <Field label={tn.priority}><NeedPriority need={need} /></Field>
        )}
        {has('reason') && (
          <Field label={tn.reason}><CellText cell={need.reason} /></Field>
        )}
        {has('stakeholders') && (others === undefined || who.length > 0 ? (
          <Field label={others === undefined ? tn.who : tn.others}>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {who.map((id) => (
                <li key={id}>
                  {stakeholderLinks ? (
                    <Link
                      to={{ pathname: stakeholderTabPath(id, 'needs'), search: dataBasisFilterSearch(params) }}
                      className={linkClass}
                    >
                      <span className="font-mono">{id}</span> {name(id)}
                    </Link>
                  ) : (
                    <span className="font-mono">{id}</span>
                  )}
                </li>
              ))}
            </ul>
          </Field>
        ) : (
          <Field label={tn.others}>{tn.othersNone}</Field>
        ))}
        {has('ownStories') && ownTexts.length > 0 && (
          <Field label={tn.ownStories}>
            <ul className="space-y-1">
              {ownTexts.map((s) => (
                <li key={s.id}>
                  <Link to={storyPath(issueNumber, s.id)} className={cn(linkClass, 'mr-1.5 font-mono')}>{s.id}</Link>
                  <CellText cell={s.soThat} />
                </li>
              ))}
            </ul>
          </Field>
        )}
        {has('solutions') && (
          <Field label={otherSolutionsThan === undefined ? tn.solutions : tn.otherSolutions}>
            {solutions.length === 0 ? (
              <span className="text-muted-foreground">
                {otherSolutionsThan !== undefined
                  ? tn.otherSolutionsNone
                  : need.priority === 'W' ? tn.solutionsWontDo : tn.solutionsNone}
              </span>
            ) : (
              <ul className="space-y-1">
                {solutions.map(({ solution }) => (
                  <li key={solution.id}><SolutionTitleLink solution={solution} issueNumber={issueNumber} /></li>
                ))}
              </ul>
            )}
          </Field>
        )}
        {has('conflicts') && item.conflicts.length > 0 && (
          <Field label={tn.conflicts}>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {item.conflicts.map((c) => (
                <li key={c.id}>
                  <Link to={conflictFocusPath(issueNumber, c.id, dataBasedOnly)} className={cn(linkClass, 'font-mono')}>
                    {c.id}
                  </Link>
                </li>
              ))}
            </ul>
          </Field>
        )}
      </dl>

      {has('stories') && item.stories.length > 0 && (
        <Collapsible className="mt-2 text-sm">
          <CollapsibleTrigger className="group flex items-center gap-1 rounded-md py-1 text-left font-medium hover:bg-muted">
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
            {tn.stories(item.stories.length)}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1 space-y-2 border-l pl-3">
              {item.stories.map((s) => (
                <li key={s.id}>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <Link to={storyPath(issueNumber, s.id)} className={cn(linkClass, 'font-mono')}>{s.id}</Link>
                    <span className="text-muted-foreground">{name(s.stakeholder)}</span>
                  </p>
                  <p className="mt-0.5"><CellText cell={s.want} /></p>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      {children}
    </article>
  )
}
