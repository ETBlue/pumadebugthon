import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Field } from '@/components/Field'
import { FilterStatus } from '@/components/FilterStatus'
import { LabelledSection } from '@/components/LabelledSection'
import { LoadState } from '@/components/LoadState'
import { PageTitle } from '@/components/PageTitle'
import { useStakeholdersOutlet } from '@/components/stakeholder/StakeholdersLayout'
import { linkClass, proseClass } from '@/components/styles'
import { useIndex } from '@/data'
import { t } from '@/i18n/zh-TW'
import { FILTER_PARAM, isDataBasisFilterOn } from '@/lib/dataBasis'
import { stakeholderTabPath } from '@/lib/entityPaths'
import { tabPath } from '@/lib/issuePage'
import { sideBarFiltersOf, sideMenuLinkSearch, withCrossIssueFilter } from '@/lib/stakeholderFilter'
import { stakeholderStats, type StakeholderStats } from '@/lib/stakeholderStats'
import type { IndexFile, IssueFile } from '@/types'

const ts = t.stakeholderStats

/** #/stakeholders (design 3.20): the h1, the intro line, the note on counts,
 * the filter status line and the statistics. The side bar with the tree is
 * in the layout route (StakeholdersLayout). Every list is in a fixed order,
 * never by a count. */
export default function Stakeholders() {
  const index = useIndex()
  const { allIssues, menuIds } = useStakeholdersOutlet()
  const [params] = useSearchParams()
  const filters = sideBarFiltersOf(params)
  const filtersOn = filters.crossIssueOnly || filters.special.length > 0
  return (
    <>
      <PageTitle parts={[t.lists.stakeholdersTitle]} />
      <h1 className="text-2xl font-bold md:text-3xl">{t.lists.stakeholdersTitle}</h1>
      <p className={`mt-2 leading-relaxed ${proseClass}`}>{t.lists.stakeholdersIntro}</p>
      <p className={`mt-1 text-sm text-muted-foreground ${proseClass}`}>{t.lists.stakeholdersCountNote}</p>
      <FilterStatus
        className="mt-3"
        filters={filters}
        stakeholder={null}
        shown={filtersOn ? t.sideMenu.shownMenu(menuIds.length) : undefined}
      />
      <div className="mt-6">
        {index.status !== 'ready' ? (
          <LoadState state={index} />
        ) : allIssues.status !== 'ready' ? (
          <LoadState state={allIssues} />
        ) : (
          <Statistics index={index.data} issues={allIssues.data} />
        )}
      </div>
    </>
  )
}

function Statistics({ index, issues }: { index: IndexFile; issues: IssueFile[] }) {
  const [params] = useSearchParams()
  const filters = sideBarFiltersOf(params)
  const stats: StakeholderStats = useMemo(
    () => stakeholderStats(index.stakeholders, issues, filters, index.pathLabels),
    // filters is a new object on each render; its parts are the real inputs.
    [index, issues, filters.dataBasedOnly, filters.crossIssueOnly, filters.special.join(',')],
  )
  const { totals } = stats
  // A stakeholder link keeps the side bar filters, as the side menu does.
  const linkSearch = sideMenuLinkSearch(params)
  // The issue link opens the 「利害關係人」 section of the 總覽 tab.
  const issueSearch = (() => {
    const next = new URLSearchParams({ focus: 'stakeholders' })
    if (isDataBasisFilterOn(params)) next.set(FILTER_PARAM, '1')
    return `?${next.toString()}`
  })()

  return (
    <div className="space-y-8">
      <LabelledSection headingId="stats-totals">
        <h2 id="stats-totals" className="text-xl font-bold">{ts.totals}</h2>
        <dl className="mt-3 space-y-1.5">
          <Field label={ts.stakeholdersLabel}>{ts.stakeholders(totals.stakeholders, totals.organizations, totals.individuals)}</Field>
          {totals.crossIssue !== null && (
            <Field label={ts.crossIssueLabel}>
              {filters.crossIssueOnly ? (
                ts.crossIssue(totals.crossIssue)
              ) : (
                // Turns on 只看跨議題 in the side bar.
                <Link
                  to={{ search: `?${withCrossIssueFilter(params, true).toString()}` }}
                  preventScrollReset
                  className={linkClass}
                >
                  {ts.crossIssue(totals.crossIssue)}
                </Link>
              )}
            </Field>
          )}
          <Field label={ts.storiesLabel}>{ts.stories(totals.stories)}</Field>
        </dl>
      </LabelledSection>

      <LabelledSection headingId="stats-category">
        <h2 id="stats-category" className="text-xl font-bold">{ts.byCategory}</h2>
        {stats.byCategory.length === 0 ? (
          <p className="mt-3 text-muted-foreground">{ts.none}</p>
        ) : (
          <table className="mt-3 w-full max-w-xl border-collapse text-sm">
            <caption className="sr-only">{ts.categoryCaption}</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-2 pr-3 text-left font-medium">{ts.categoryColumn}</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">{ts.stakeholdersColumn}</th>
                <th scope="col" className="py-2 text-right font-medium">{ts.storiesColumn}</th>
              </tr>
            </thead>
            {(['O', 'I'] as const).map((root) => {
              const rows = stats.byCategory.filter((r) => r.root === root)
              if (rows.length === 0) return null
              return (
                <tbody key={root}>
                  <tr>
                    <th scope="rowgroup" colSpan={3} className="pt-3 pb-1 text-left font-semibold">{ts.roots[root]}</th>
                  </tr>
                  {rows.map((r) => (
                    <tr key={r.path} className="border-b">
                      <th scope="row" className="py-1.5 pr-3 pl-3 text-left font-normal">{r.label}</th>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{r.stakeholders}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.stories}</td>
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </table>
        )}
      </LabelledSection>

      <LabelledSection headingId="stats-focus">
        <h2 id="stats-focus" className="text-xl font-bold">{ts.byFocusGroup}</h2>
        <ul className="mt-3 space-y-3">
          {stats.byFocusGroup.map((row) => (
            <li key={row.group}>
              <p>
                <span className="font-medium">{row.group}</span>{' '}
                {row.stakeholders.length === 0 ? (
                  <span className="text-muted-foreground">{ts.focusNone}</span>
                ) : (
                  <span className="tabular-nums">{ts.focusCount(row.stakeholders.length)}</span>
                )}
              </p>
              {row.stakeholders.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {row.stakeholders.map((s) => (
                    <li key={s.id} className="min-w-0 break-words">
                      <Link to={{ pathname: stakeholderTabPath(s.id, 'overview'), search: linkSearch }} className={linkClass}>
                        <span className="font-mono">{s.id}</span> {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </LabelledSection>

      <LabelledSection headingId="stats-issues">
        <h2 id="stats-issues" className="text-xl font-bold">{ts.byIssue}</h2>
        <ul className="mt-3 space-y-2">
          {stats.byIssue.map((row) => (
            <li key={row.issueNumber} className="flex flex-wrap gap-x-3">
              <Link to={{ pathname: tabPath(row.issueNumber, 'overview'), search: issueSearch }} className={linkClass}>
                {ts.issueLink(row.issueNumber, row.title)}
              </Link>
              <span className="tabular-nums">{ts.issueStakeholders(row.stakeholders, row.organizations, row.individuals)}</span>
            </li>
          ))}
        </ul>
      </LabelledSection>
    </div>
  )
}
