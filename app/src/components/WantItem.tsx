import { useId, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { dataBasisFilterSearch, isDataBasisFilterOn } from '@/lib/dataBasis'
import { conflictFocusPath, stakeholderTabPath, wantFocusPath } from '@/lib/entityPaths'
import { stripMarkdown } from '@/lib/markdown'
import { opinionPickTo } from '@/lib/opinion'
import { stakeholderName } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { WantItem as WantData } from '@/lib/wantList'
import type { Stakeholder } from '@/types'
import { Field } from './Field'
import { focusTargetProps } from './FocusTarget'
import { Heading, type HeadingLevel } from './Heading'
import { PickLabel } from './PickLabel'
import { focusTargetClass, linkClass, targetLinkClass } from './styles'
import { TagBadge } from './TagBadge'
import { ItemKey } from './ItemKey'

const tw = t.want

/** The parts of a want that WantItem can show. */
export type WantPart = 'key' | 'stakeholders' | 'conflicts' | 'pickLink'

/** The parts of the issue's 訴求 tab (design 3.2). */
export const ISSUE_WANT_PARTS: readonly WantPart[] = ['key', 'stakeholders', 'conflicts']

export interface WantItemProps {
  item: WantData
  issueNumber: number
  /** All stakeholders from index.json, for the names. */
  stakeholders: Stakeholder[]
  /** Which parts show, in a fixed order. Default: ISSUE_WANT_PARTS. */
  parts?: readonly WantPart[]
  /** The level of the label heading. Default 4. */
  headingLevel?: HeadingLevel
  /** The label links to the want on the issue's 訴求 tab (?focus=, decision
   * 57). Use it outside that tab (the stakeholder page). */
  summaryLink?: boolean
  /** stakeholders part: leave out this stakeholder, and use the label
   * 「同樣想要的人」 instead of 「誰想要」 (the stakeholder page). */
  others?: string
  /** The opinion check on the issue's 訴求 tab: the label is a button with
   * aria-pressed that picks the item. Not used with summaryLink. */
  pick?: { pressed: boolean; onPick: () => void }
  /** Give the item the element ID focus-<want key> (design 3.16). Default
   * true. Set false where the same key can show twice on one page. */
  focusTarget?: boolean
  /** Extra content for one page, at the end. */
  children?: ReactNode
}

/** One want (訴求) in a list (design 3.2, 3.3, 3.16): the label with its
 * tag, then the parts the page asks for. Stakeholders are in ID order and
 * conflicts in file order, as WantItem in src/lib/wantList.ts gives them. */
export function WantItem({
  item, issueNumber, stakeholders, parts = ISSUE_WANT_PARTS, headingLevel = 4, summaryLink = false,
  others, pick, focusTarget = true, children,
}: WantItemProps) {
  const [params] = useSearchParams()
  const dataBasedOnly = isDataBasisFilterOn(params)
  const has = (part: WantPart) => parts.includes(part)
  const who = item.stakeholders.filter((id) => id !== others)
  const headingId = useId()

  let label: ReactNode = <PickLabel item={item} />
  if (summaryLink) {
    label = (
      <>
        {!item.pending && item.tag && <TagBadge kind={item.tag} className="mr-1.5" />}
        <Link
          to={wantFocusPath(issueNumber, item.key, dataBasedOnly)}
          className={cn(linkClass, item.pending && 'text-muted-foreground')}
        >
          {stripMarkdown(item.label)}
        </Link>
      </>
    )
  } else if (pick) {
    label = (
      <button
        type="button"
        aria-pressed={pick.pressed}
        onClick={pick.onPick}
        className={cn(
          'w-full rounded-md border px-2 py-1 text-left hover:bg-muted',
          pick.pressed ? 'border-foreground bg-muted font-semibold' : 'border-transparent font-normal',
        )}
      >
        {label}
      </button>
    )
  }

  return (
    <article
      {...(focusTarget ? focusTargetProps(item.key) : {})}
      aria-labelledby={headingId}
      className={cn('rounded-lg border p-3 md:p-4', focusTarget && focusTargetClass)}
    >
      <Heading level={headingLevel} id={headingId} className="font-semibold">{label}</Heading>
      {has('key') && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          <ItemKey issueNumber={issueNumber} value={item.key} />
          {' · '}
          {tw.storyCount(item.storyIds.length)}
        </p>
      )}

      <dl className="mt-2 space-y-1.5 text-sm">
        {has('stakeholders') && (others === undefined || who.length > 0 ? (
          <Field label={others === undefined ? tw.who : tw.others}>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {who.map((id) => (
                <li key={id}>
                  <Link
                    to={{ pathname: stakeholderTabPath(id, 'wants'), search: dataBasisFilterSearch(params) }}
                    className={targetLinkClass}
                  >
                    <span className="font-mono">{id}</span> {stakeholderName(stakeholders, id)}
                  </Link>
                </li>
              ))}
            </ul>
          </Field>
        ) : (
          <Field label={tw.others}>{tw.othersNone}</Field>
        ))}
        {has('conflicts') && item.conflicts.length > 0 && (
          <Field label={tw.conflicts}>
            <ul className="inline-flex flex-wrap gap-x-3 gap-y-1">
              {item.conflicts.map((c) => (
                <li key={c.id}>
                  <Link to={conflictFocusPath(issueNumber, c.id, params)} className={cn(targetLinkClass, 'font-mono')}>
                    {c.id}
                  </Link>
                </li>
              ))}
            </ul>
          </Field>
        )}
      </dl>

      {has('pickLink') && (
        <p className="mt-2 text-sm">
          <Link to={opinionPickTo(issueNumber, item.key, dataBasedOnly)} className={targetLinkClass}>
            {tw.pickLink(issueNumber)}
          </Link>
        </p>
      )}
      {children}
    </article>
  )
}
