import { Link } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { basisTotal } from '@/lib/cellBasis'
import { sharePercent } from '@/lib/coverage'
import { withDataBasisFilter } from '@/lib/dataBasis'
import { needPath } from '@/lib/entityPaths'
import { tabPath } from '@/lib/issuePage'
import { stripMarkdown } from '@/lib/markdown'
import type { NeedListItem } from '@/lib/needList'
import { needShare } from '@/lib/needRecords'
import { cn } from '@/lib/utils'
import { CellBasis } from './CellBasis'
import { UpdatedField } from './DateFields'
import { Field } from './Field'
import { NeedPriority } from './NeedItem'
import { linkClass } from './styles'
import { TagBadge } from './TagBadge'

const tn = t.needsList

/** One need on #/needs (plan-needs.md, Task N3). The card shows:
 * - the summary with its tag, as a link to the need page #/needs/<key>.
 *   The code 「#1 N01」 is part of the link. dataBased: 只看有資料根據 is
 *   on in the list (basis=1), so the link carries ?evidence=1, the param
 *   the entity pages read.
 * - 優先順序 with its tag (NeedPriority). A W need says 這次不做 here, as
 *   the solution page does (decision 50).
 * - the issue, as a link to the issue page.
 * - 「使用者故事 3 則 · 解法 2 個」: plain facts, not a score.
 * - the X-N group, when the need is in one.
 * - 更新日期 only: a card never shows 新增日期 (decision 131).
 * - with shareOn (the 資料根據比例 sort): the counts of its story cells and
 *   the share as a percent next to them, never the percent alone (3.23.3). */
export function NeedCard({ item, issueTitle, shareOn, dataBased }: {
  item: NeedListItem
  issueTitle: string
  shareOn: boolean
  dataBased: boolean
}) {
  const search = withDataBasisFilter(new URLSearchParams(), dataBased).toString()
  const { summary, need } = item
  const share = shareOn ? needShare(item) : null
  return (
    <div className="h-full rounded-md border p-3">
      <p className="font-medium">
        {!summary.pending && summary.tag && <TagBadge kind={summary.tag} className="mr-1.5" />}
        <Link
          to={{ pathname: needPath(item.key), search: search ? `?${search}` : '' }}
          className={cn(linkClass, summary.pending && 'text-muted-foreground')}
        >
          <span className="mr-1 font-mono">{tn.code(item.issue, need.id)}</span>{' '}
          {stripMarkdown(summary.text)}
        </Link>
      </p>
      <dl className="mt-2 space-y-1 text-sm">
        <Field label={tn.priority}><NeedPriority need={need} /></Field>
        <Field label={tn.issue}>
          <Link to={tabPath(item.issue, 'overview')} className={linkClass}>{tn.issueValue(item.issue, issueTitle)}</Link>
        </Field>
        {item.crossGroups.length > 0 && <Field label={tn.crossGroup}>{item.crossGroups.join('、')}</Field>}
        <UpdatedField updated={need.updated} />
      </dl>
      <p className="mt-1 text-sm">{tn.facts(item.stories.length, item.solutions.length)}</p>
      {shareOn && (
        <dl className="mt-1 text-sm">
          <div>
            <dt className="text-muted-foreground">{tn.basis}</dt>
            <dd className="mt-0.5">
              {basisTotal(item.cells) > 0 && <CellBasis cells={item.cells} stories={0} compact inlineLabel={false} />}
              {share !== null && <p className="mt-0.5 font-medium">{tn.sharePercent(sharePercent(share))}</p>}
            </dd>
          </div>
        </dl>
      )}
    </div>
  )
}
