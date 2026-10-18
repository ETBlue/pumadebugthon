import { Link } from 'react-router'
import { useTabTo } from '@/components/EvidenceToggle'
import { Field } from '@/components/Field'
import { METHOD_URL } from '@/components/links'
import { Markdown } from '@/components/Markdown'
import { linkClass } from '@/components/styles'
import { TagBadge, type TagKind } from '@/components/TagBadge'
import { t } from '@/i18n/zh-TW'
import { spaceTypeNames } from '@/lib/issues'
import { pendingBySection, tabPath } from '@/lib/issuePage'
import { sameSpaceIssues } from '@/lib/spaces'
import type { IssueTabProps } from './types'

const to = t.overview
const TAG_KINDS: TagKind[] = ['實證', 'AI模擬', 'pending']

/** 總覽 (design 3.2): counts, tag legend, 使用相同空間的議題 and 待補清單. */
export function OverviewTab({ index, summary, issue }: IssueTabProps) {
  const c = summary.counts
  const n = summary.number
  const sameSpace = sameSpaceIssues(index, n)
  const titles = new Map(index.issues.map((i) => [i.number, i.title]))
  const pending = pendingBySection(issue.pending)
  const tabTo = useTabTo()

  return (
    <div className="space-y-8">
      <section aria-labelledby="counts-heading">
        <h3 id="counts-heading" className="text-lg font-semibold">{to.countsHeading}</h3>
        <dl className="mt-2 space-y-1.5">
          <Field label={to.stakeholders}>
            <Link to={tabTo(n, 'stakeholders')} className={linkClass}>
              {to.stakeholdersValue(c.stakeholdersO, c.stakeholdersI)}
            </Link>
          </Field>
          <Field label={to.stories}>
            <Link to={tabTo(n, 'opinion')} className={linkClass}>{to.storiesValue(c.stories)}</Link>
          </Field>
          <Field label={to.conflicts}>
            <Link to={tabTo(n, 'conflicts')} className={linkClass}>{to.itemsValue(c.conflicts)}</Link>
          </Field>
          <Field label={to.solutions}>
            <Link to={tabTo(n, 'solutions')} className={linkClass}>{to.itemsValue(c.solutions)}</Link>
          </Field>
        </dl>
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
