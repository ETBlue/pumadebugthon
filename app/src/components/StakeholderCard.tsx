import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n/zh-TW'
import { issueFocusPath } from '@/lib/entityPaths'
import { issueNumberTitle, type IssueTitles } from '@/lib/issues'
import type { StakeholderIssueStories } from '@/lib/stakeholders'
import type { CellCounts, Stakeholder } from '@/types'
import { CellBasis } from './CellBasis'
import { UpdatedField } from './DateFields'
import { Field } from './Field'
import { IssueTitleLinks } from './IssueTitleLinks'
import { PriorityCounts } from './PriorityCounts'
import { linkClass } from './styles'

const tc = t.stakeholderCard
const tl = t.stakeholdersList

/** The fields of a card on #/stakeholders (design 3.23.9, decision 92). The
 * page computes them. The card only shows them. */
export interface StakeholderListFields {
  /** 分類路徑 as names, the root first: 「個人 › 用路人」. */
  path: string
  /** The analyzed issues of the stakeholder, by number. */
  issues: number[]
  /** The titles of the issues (index.issues), for 「#1 把三千棵樹種回來」
   * (decision 112). */
  issueTitles: IssueTitles
  /** The cells of all its stories, in every analyzed issue (stakeholderCells). */
  cells: CellCounts
  /** 「實證＋AI整理 8%」 next to the counts, only while 資料根據比例 is on.
   * null: not shown. */
  evidencePercent: number | null
  /** Its needs and the needs that a solution covers
   * (stakeholderSolutionCoverage). */
  needs: { covered: number; total: number }
  /** 「（60%）」 after the coverage, only while 解法涵蓋比例 is on. null: not
   * shown. */
  solutionsPercent: number | null
}

interface CommonProps {
  stakeholder: Stakeholder
  /** Extra content for one page, shown at the end of the card. For example
   * the issues and 資料根據 on the home page, or 「也出現在 #1」. */
  children?: ReactNode
}

/** The props of StakeholderCard. Each variant has its own props.
 * - detailed: the larger box. With entries (the issue's 利害關係人 tab): the
 *   stories of the stakeholder per issue, from storyCountsByStakeholder.
 *   With listFields (#/stakeholders): 分類路徑, the issues, 資料根據,
 *   解法涵蓋 and 更新日期 (design 3.23.9).
 * - compact: short lists (home page, solution page, space page, opinion
 *   check). A small card, so it shows no date (decision 132).
 * The detailed variants show 更新日期 and never 新增日期 (decision 131). */
export type StakeholderCardProps =
  | (CommonProps & {
      variant: 'detailed'
      entries: StakeholderIssueStories[]
      /** The titles of the issues of entries, for 「#1 把三千棵樹種回來」
       * (decision 112). Without them, only 「#1」. */
      issueTitles?: IssueTitles
      listFields?: undefined
    })
  | (CommonProps & { variant: 'detailed'; listFields: StakeholderListFields; entries?: undefined })
  | (CommonProps & { variant: 'compact' })

/** One stakeholder in a list (design 3.9). Both variants show the name as a
 * link to the stakeholder page, the ID and the 特別關注 badges. The detailed
 * variant also shows the story counts by priority for each issue, or the
 * list fields of #/stakeholders. children come last. The detailed box is
 * larger, like IssueCard and SolutionCard. */
export function StakeholderCard(props: StakeholderCardProps) {
  const { stakeholder: s, children } = props
  const detailed = props.variant === 'detailed'
  return (
    <article className={detailed ? 'h-full rounded-lg border p-3 md:p-4' : 'h-full rounded-md border p-3'}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link to={`/stakeholders/${s.id}`} className={`${linkClass} font-medium`}>{s.name}</Link>
        <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
        <FocusBadges stakeholder={s} />
      </p>
      {props.variant === 'detailed' && props.entries !== undefined && props.entries.length > 0 && (
        <ul className="mt-1 space-y-1 text-sm">
          {props.entries.map((e) => (
            <li key={e.issueNumber} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 font-medium break-words">{issueNumberTitle(props.issueTitles ?? [], e.issueNumber)}</span>
              <PriorityCounts counts={e.counts} />
            </li>
          ))}
        </ul>
      )}
      {props.variant === 'detailed' && props.listFields !== undefined && (
        <ListFields stakeholder={s} fields={props.listFields} />
      )}
      {children}
      {/* The detailed card with entries shows 更新日期 last, after children
          (decision 131). The compact card is small and shows no date (decision 132). */}
      {props.variant === 'detailed' && props.entries !== undefined && s.updated && (
        <dl className="mt-1 text-sm"><UpdatedField updated={s.updated} /></dl>
      )}
    </article>
  )
}

/** The 特別關注 badges, with a hidden 「特別關注：」 before them. Nothing when
 * the stakeholder has no group. */
export function FocusBadges({ stakeholder: s }: { stakeholder: Stakeholder }) {
  if (s.focus.length === 0) return null
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className="sr-only">{tc.focusLabel}</span>
      {s.focus.map((f) => (
        <Badge key={f} variant="secondary" className="rounded-sm">{f}</Badge>
      ))}
    </span>
  )
}

/** The fields of a card on #/stakeholders (design 3.23.9). */
function ListFields({ stakeholder: s, fields: f }: { stakeholder: Stakeholder; fields: StakeholderListFields }) {
  const { covered, total } = f.needs
  return (
    <dl className="mt-2 space-y-1 text-sm">
      {f.path !== '' && <Field label={tl.path}>{f.path}</Field>}
      {f.issues.length > 0 && (
        <Field label={tl.issues}>
          <IssueTitleLinks
            numbers={f.issues}
            titles={f.issueTitles}
            to={(n) => issueFocusPath(n, 'stakeholders', 'stakeholders')}
          />
        </Field>
      )}
      <div>
        <dt className="text-muted-foreground">{tl.basis}</dt>
        <dd>
          <CellBasis cells={f.cells} stories={0} compact inlineLabel={false} />
          {/* The share is shown next to the counts it comes from, never alone. */}
          {f.evidencePercent !== null && <p className="mt-0.5 font-medium">{tl.evidencePercent(f.evidencePercent)}</p>}
        </dd>
      </div>
      <Field label={tl.coverage}>
        {total === 0 ? tl.noNeeds : tl.coverageValue(total, covered)}
        {total > 0 && f.solutionsPercent !== null && <span className="font-medium">{tl.coveragePercent(f.solutionsPercent)}</span>}
      </Field>
      {/* A card shows only 更新日期 (decision 131). */}
      <UpdatedField updated={s.updated} />
    </dl>
  )
}
