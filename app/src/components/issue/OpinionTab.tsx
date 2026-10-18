import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CellText } from '@/components/CellText'
import { PickLabel } from '@/components/PickLabel'
import { DataBasisToggle, useDataBasisFilter } from '@/components/DataBasisToggle'
import { SolutionSummary } from '@/components/SolutionSummary'
import { StoryCard } from '@/components/StoryCard'
import { linkClass } from '@/components/styles'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n/zh-TW'
import { dataBasedCount, dataBasedPickList, isDataBasisFilterOn, withDataBasisFilter } from '@/lib/dataBasis'
import { filterPickList, opinionResult, pickList, type PickItem } from '@/lib/opinion'
import { stakeholderName } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { Story } from '@/types'
import { AlsoIn } from './AlsoIn'
import type { IssueTabProps } from './types'

const to = t.opinion

/** 你的意見 (design 4): pick what you want, then see who wants the same,
 * who may disagree, the related solutions and who is not mentioned. The
 * picked item is in the URL (?pick=W08), so a result can be shared. */
export function OpinionTab(props: IssueTabProps) {
  const { issue } = props
  const items = useMemo(() => pickList(issue), [issue])
  const [dataBasedOnly] = useDataBasisFilter()
  // 「只看有資料根據」 hides pick items; a picked item stays found by its key.
  const listed = dataBasedOnly ? dataBasedPickList(items, issue.stories) : items
  const [query, setQuery] = useState('')
  const shown = filterPickList(listed, query)
  const [params, setParams] = useSearchParams()
  const pickKey = params.get('pick')
  const picked = pickKey === null ? undefined : items.find((i) => i.key === pickKey)

  // After a click, move focus to the result, so keyboard and screen reader
  // users find it. Not on page load from a shared URL.
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const focusResult = useRef(false)
  useEffect(() => {
    if (focusResult.current && picked) {
      focusResult.current = false
      resultHeading.current?.focus()
      resultHeading.current?.scrollIntoView({ block: 'start' })
    }
  }, [picked])

  const select = (key: string) => {
    focusResult.current = true
    // Keep the 「只看有資料根據」 setting (?evidence=1) with the pick.
    setParams((prev) => withDataBasisFilter(new URLSearchParams({ pick: key }), isDataBasisFilterOn(prev)), {
      replace: true,
      preventScrollReset: true,
    })
  }

  const searchId = useId()
  const hintId = useId()
  const listLabelId = useId()

  return (
    <div className="space-y-6">
      <p className="leading-relaxed">{to.intro}</p>

      <DataBasisToggle />

      <div className="space-y-2">
        <label htmlFor={searchId} className="block font-medium">{to.searchLabel}</label>
        <p id={hintId} className="text-sm text-muted-foreground">{to.searchHint}</p>
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby={hintId}
        />
        <p role="status" className="text-sm text-muted-foreground">{to.matchCount(shown.length, listed.length)}</p>
      </div>

      <section aria-labelledby={listLabelId}>
        <h3 id={listLabelId} className="font-medium">{to.listLabel}</h3>
        {shown.length === 0 ? (
          <p className="mt-2">{listed.length === 0 ? t.dataBasisFilter.pickEmpty : to.noMatch}</p>
        ) : (
          <ul className="mt-2 max-h-96 space-y-1 overflow-y-auto rounded-md border p-1">
            {shown.map((item) => {
              const on = item.key === picked?.key
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => select(item.key)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left text-sm outline-none hover:bg-muted',
                      'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                      on ? 'border-foreground bg-muted font-semibold' : 'border-transparent',
                    )}
                  >
                    <span className="block"><PickLabel item={item} /></span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      <span className="font-mono">{item.key}</span>
                      {' · '}
                      {to.storyCount(item.storyIds.length)}
                      {dataBasedOnly && (
                        <>
                          {' · '}
                          {t.dataBasisFilter.countInItem(dataBasedCount(item, issue.stories))}
                        </>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {pickKey !== null && !picked && <p role="alert">{to.unknownPick}</p>}

      {picked && (
        <section aria-labelledby="opinion-result" className="space-y-8 border-t pt-6">
          <h3 id="opinion-result" ref={resultHeading} tabIndex={-1} className="text-lg font-semibold outline-none">
            {to.resultHeading}
            <span className="mt-1 block text-base font-normal">
              {to.picked}
              <span className="mx-1 font-mono">{picked.key}</span>
              <PickLabel item={picked} />
            </span>
          </h3>
          <OpinionResult {...props} picked={picked} />
        </section>
      )}
    </div>
  )
}

function OpinionResult({ index, issue, summary, available, picked }: IssueTabProps & { picked: PickItem }) {
  const result = opinionResult(issue, picked.storyIds)
  const n = summary.number
  const alsoIn = (id: string) => (
    <AlsoIn stakeholders={index.stakeholders} id={id} issueNumber={n} available={available} />
  )
  const cards = (stories: Story[]) => (
    <ul className="mt-2 space-y-2">
      {stories.map((s) => (
        <li key={s.id}>
          <StoryCard
            story={s}
            stakeholderName={stakeholderName(index.stakeholders, s.stakeholder)}
            stakeholderNote={alsoIn(s.stakeholder)}
            compact
          />
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <section aria-labelledby="opinion-same">
        <h4 id="opinion-same" className="font-semibold">{to.sameHeading}</h4>
        {result.same.length === 0 ? <p className="mt-2">{to.sameNone}</p> : cards(result.same)}
      </section>

      <section aria-labelledby="opinion-other">
        <h4 id="opinion-other" className="font-semibold">{to.otherHeading}</h4>
        {result.otherSide.length === 0 ? (
          <p className="mt-2">{to.otherNone}</p>
        ) : (
          <ul className="mt-2 space-y-4">
            {result.otherSide.map(({ conflict: c, otherStories }) => (
              <li key={c.id} className="rounded-lg border p-4">
                <h5 className="font-semibold">
                  <span className="mr-2 font-mono">{c.id}</span>
                  <CellText cell={c.text} />
                </h5>
                <p className="mt-3 text-sm text-muted-foreground">{to.otherStories}</p>
                {cards(otherStories)}
                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="text-sm text-muted-foreground">{to.method}</dt>
                    <dd><CellText cell={c.method} /></dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">{to.result}</dt>
                    <dd><CellText cell={c.result} /></dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="opinion-solutions">
        <h4 id="opinion-solutions" className="font-semibold">{to.solutionsHeading}</h4>
        {result.solutions.length === 0 ? (
          <p className="mt-2">{to.solutionsNone}</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {result.solutions.map((sol) => (
              <li key={sol.id}>
                <SolutionSummary solution={sol} issueNumber={n} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="opinion-not-mentioned">
        <h4 id="opinion-not-mentioned" className="font-semibold">{to.notMentionedHeading}</h4>
        {result.notMentioned.length === 0 ? (
          <p className="mt-2">{to.notMentionedNone}</p>
        ) : (
          <>
            <p className="mt-2">{to.notMentionedPrompt}</p>
            <ul className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {result.notMentioned.map((id) => (
                <li key={id} className="flex flex-wrap items-baseline gap-x-2">
                  <Link to={`/stakeholders/${id}`} className={linkClass}>
                    {stakeholderName(index.stakeholders, id)}
                  </Link>
                  {alsoIn(id)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  )
}
