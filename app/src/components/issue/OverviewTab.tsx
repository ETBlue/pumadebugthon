import { Link } from 'react-router'
import { CellBasis } from '@/components/CellBasis'
import { CellText } from '@/components/CellText'
import { useDataBasisFilter } from '@/components/DataBasisToggle'
import { METHOD_URL } from '@/components/links'
import { Markdown } from '@/components/Markdown'
import { TagBadge, type TagKind } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { spaceTypeNames } from '@/lib/issues'
import { pendingBySection, tabPath } from '@/lib/issuePage'
import { sameSpaceIssues } from '@/lib/spaces'
import { unlinkedSummaryTopics } from '@/lib/summary'
import { linkClass } from '@/components/styles'
import { SummaryRefs } from './SummaryTab'
import type { IssueTabProps } from './types'

const to = t.overview
const TAG_KINDS: TagKind[] = ['實證', 'AI整理', 'AI模擬', 'pending']

/** 總覽 (design 3.2): 資料根據, tag legend, 使用相同空間的議題, 沒有對應解法的
 * 分析摘要 (decision 140) and 待補清單. The counts are in the tab labels,
 * 難以取捨 has its own tab (decision 102), and 特別關注族群 and 利害關係人
 * are on the 利害關係人 tab (decision 109). */
export function OverviewTab({ index, summary, issue }: IssueTabProps) {
  const c = summary.counts
  const n = summary.number
  const sameSpace = sameSpaceIssues(index, n)
  const titles = new Map(index.issues.map((i) => [i.number, i.title]))
  const pending = pendingBySection(issue.pending)
  const unlinked = unlinkedSummaryTopics(issue)
  // 總覽 has no filter, but the reference links keep ?evidence=1 when the
  // reader came with it, as on the other tabs.
  const [dataBasedOnly] = useDataBasisFilter()

  return (
    <div className="space-y-8">
      <section aria-labelledby="basis-heading">
        <h3 id="basis-heading" className="text-lg font-semibold">{t.basis.label}</h3>
        <div className="mt-2">
          <CellBasis cells={c.cells} stories={c.stories} />
        </div>
      </section>

      <section aria-labelledby="legend-heading">
        <h3 id="legend-heading" className="text-lg font-semibold">{to.legendHeading}</h3>
        <dl className="mt-2 space-y-2">
          {TAG_KINDS.map((kind) => (
            <div key={kind} className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
              <dt className="shrink-0 md:w-20"><TagBadge kind={kind} /></dt>
              <dd>{to.legend[kind]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2">
          <a href={METHOD_URL} rel="noopener noreferrer" className={linkClass}>{to.methodLink}</a>
        </p>
      </section>

      <section aria-labelledby="same-space-heading">
        <h3 id="same-space-heading" className="text-lg font-semibold">{to.sameSpaceHeading}</h3>
        {sameSpace.length === 0 ? (
          <p className="mt-2">{to.sameSpaceNone}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sameSpace.map((s) => (
              <li key={s.code} className="flex flex-wrap gap-x-1">
                <span>
                  <Link to={`/spaces/${s.code}`} className={linkClass}>
                    {spaceTypeNames(index.spaceTypes, [s.code])[0].name}
                  </Link>
                  {to.sameSpaceSeparator}
                </span>
                <ul className="flex flex-wrap gap-x-3">
                  {s.issues.map((other) => (
                    <li key={other}>
                      <Link to={tabPath(other, 'overview')} className={linkClass}>
                        {t.issueCard.numberTitle(other, titles.get(other) ?? '')}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The 分析摘要 rows that name no solution (decision 140). Article
          style, as the 分析摘要 tabs (decision 134). No filter here. */}
      <section aria-labelledby="unlinked-heading">
        <h3 id="unlinked-heading" className="text-lg font-semibold">{to.unlinkedHeading}</h3>
        {unlinked.length === 0 ? (
          <p className="mt-2">{to.unlinkedNone}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">{to.unlinkedIntro}</p>
            {unlinked.map((topic) => (
              <section key={topic.key} aria-labelledby={`unlinked-${topic.key}`} className="mt-4">
                <h4 id={`unlinked-${topic.key}`} className="font-medium">{topic.topic}</h4>
                <ul aria-label={topic.topic} className="mt-2 space-y-4">
                  {topic.items.map((item) => (
                    <li key={item.item} className={item.text.pending ? 'min-w-0 text-muted-foreground' : 'min-w-0'}>
                      <h5 className="font-semibold text-foreground">{item.item}</h5>
                      <p className="mt-1 leading-relaxed"><CellText cell={item.text} /></p>
                      <SummaryRefs refs={item.refs} issueNumber={n} issue={issue} dataBasedOnly={dataBasedOnly} className="mt-1 text-sm" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </section>

      <section aria-labelledby="pending-heading">
        <h3 id="pending-heading" className="text-lg font-semibold">{to.pendingHeading}</h3>
        {pending.length === 0 ? (
          <p className="mt-2">{to.pendingNone}</p>
        ) : (
          <>
            <p className="mt-2 text-muted-foreground">{to.pendingIntro}</p>
            {pending.map((g) => (
              <div key={g.section ?? ''} className="mt-4">
                <h4 className="font-medium">{g.section ?? to.noSection}</h4>
                <ul className="mt-1 list-disc space-y-2 pl-5">
                  {g.items.map((item, i) => (
                    <li key={i}>
                      {item.context !== null && (
                        <span className="block text-sm text-muted-foreground"><Markdown text={item.context} /></span>
                      )}
                      <Markdown text={item.text} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>

    </div>
  )
}
