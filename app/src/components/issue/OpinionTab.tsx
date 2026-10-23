import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BasisField } from '@/components/BasisField'
import { CellText } from '@/components/CellText'
import { PickLabel } from '@/components/PickLabel'
import { CoveredBasisField, SolutionCard } from '@/components/SolutionCard'
import { StakeholderCard } from '@/components/StakeholderCard'
import { StoryCard } from '@/components/StoryCard'
import { WantItem } from '@/components/WantItem'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n/zh-TW'
import { solutionCells, stakeholderCells } from '@/lib/coverage'
import { dataBasedCount, isDataBasisFilterOn } from '@/lib/dataBasis'
import { filterPickList, opinionResult, type PickItem } from '@/lib/opinion'
import { findStakeholder, stakeholderName } from '@/lib/stakeholders'
import { conflictFocusPath } from '@/lib/entityPaths'
import { targetLinkClass } from '@/components/styles'
import { cn } from '@/lib/utils'
import { issueWants, type WantItem as WantData } from '@/lib/wantList'
import { pickSearch } from '@/lib/wantsTab'
import type { Story } from '@/types'
import { AlsoIn, AlsoInLine } from './AlsoIn'
import type { IssueTabProps } from './types'
import { ItemKey } from '@/components/ItemKey'

const to = t.opinion
const tw = t.wantsTab

/** The opinion check (design 4) inside the 訴求 tab: search, the pick list
 * of wants, then the result (who wants the same, who may disagree, the
 * related solutions and who is not mentioned). The picked item is in the URL
 * (?pick=W08), so a result can be shared. wants is the list after the
 * stakeholder filter and the data filter (wantsTabView). A picked item is
 * found by its key in all wants, so it stays picked when a filter hides it. */
export function OpinionTab(props: IssueTabProps & { wants: WantData[]; filtered: boolean; specialOn: boolean }) {
  const { issue, index, summary, wants, filtered, specialOn } = props
  const all = useMemo(() => issueWants(issue), [issue])
  const [params, setParams] = useSearchParams()
  const dataBasedOnly = isDataBasisFilterOn(params)
  const [query, setQuery] = useState('')
  const shown = filterPickList(wants, query) as WantData[]
  const pickKey = params.get('pick')
  const picked = pickKey === null ? undefined : all.find((i) => i.key === pickKey)

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
    // Keep ?evidence=1 and ?stakeholder= with the pick.
    setParams(new URLSearchParams(pickSearch(params, key)), { replace: true, preventScrollReset: true })
  }

  const searchId = useId()
  const hintId = useId()
  const listLabelId = useId()
  const emptyText = wants.length > 0
    ? to.noMatch
    : specialOn ? tw.noWantsFiltered : dataBasedOnly ? t.dataBasisFilter.pickEmpty : filtered ? tw.noWants : to.noMatch

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor={searchId} className="block font-medium">{tw.searchLabel}</label>
        <p id={hintId} className="text-sm text-muted-foreground">{to.searchHint}</p>
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-describedby={hintId}
        />
        <p role="status" className="text-sm text-muted-foreground">{to.matchCount(shown.length, wants.length)}</p>
      </div>

      <div>
        {/* A label, not a heading: each want below is an h4 under the h3. */}
        <p id={listLabelId} className="font-medium">{tw.listLabel}</p>
        {shown.length === 0 ? (
          <p className="mt-2">{emptyText}</p>
        ) : (
          // The list has its own scroll, so the result below stays close.
          // The items are lighter than the default WantItem box: no border
          // and less padding, with a line between them.
          <ul
            aria-labelledby={listLabelId}
            className={cn(
              'mt-2 max-h-[36rem] divide-y overflow-y-auto rounded-md border p-1',
              '[&_article]:border-0 [&_article]:p-2 md:[&_article]:p-2',
            )}
          >
            {shown.map((item) => (
              <li key={item.key} className="py-1">
                <WantItem
                  item={item}
                  issueNumber={summary.number}
                  stakeholders={index.stakeholders}
                  headingLevel={4}
                  pick={{ pressed: item.key === picked?.key, onPick: () => select(item.key) }}
                >
                  {dataBasedOnly && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.dataBasisFilter.countInItem(dataBasedCount(item, issue.stories))}
                    </p>
                  )}
                </WantItem>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pickKey !== null && !picked && <p role="alert">{to.unknownPick}</p>}

      {picked && (
        <section aria-labelledby="opinion-result" className="space-y-8 border-t pt-6">
          <h4 id="opinion-result" ref={resultHeading} tabIndex={-1} className="text-lg font-semibold outline-none">
            {to.resultHeading}
            <span className="mt-1 block text-base font-normal">
              {to.picked}
              <ItemKey issueNumber={summary.number} value={picked.key} className="mx-1" />
              <PickLabel item={picked} />
            </span>
          </h4>
          <OpinionResult {...props} picked={picked} />
        </section>
      )}
    </div>
  )
}

function OpinionResult({ index, issue, summary, available, picked }: IssueTabProps & { picked: PickItem }) {
  const result = opinionResult(issue, picked.storyIds)
  const n = summary.number
  const [params] = useSearchParams()
  const alsoIn = (id: string) => (
    <AlsoIn index={index} id={id} issueNumber={n} available={available} />
  )
  const cards = (stories: Story[]) => (
    <ul className="mt-2 space-y-2">
      {stories.map((s) => (
        <li key={s.id}>
          <StoryCard
            story={s}
            issue={issue}
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
        <h5 id="opinion-same" className="font-semibold">{to.sameHeading}</h5>
        {result.same.length === 0 ? <p className="mt-2">{to.sameNone}</p> : cards(result.same)}
      </section>

      <section aria-labelledby="opinion-other">
        <h5 id="opinion-other" className="font-semibold">{to.otherHeading}</h5>
        {result.otherSide.length === 0 ? (
          <p className="mt-2">{to.otherNone}</p>
        ) : (
          <ul className="mt-2 space-y-4">
            {result.otherSide.map(({ conflict: c, otherStories }) => (
              <li key={c.id} className="rounded-lg border p-4">
                <h6 className="font-semibold">
                  {/* The ID links to the conflict on the 衝突 tab (decision 142). */}
                  <Link to={conflictFocusPath(n, c.id, params)} className={cn(targetLinkClass, 'mr-2 font-mono')}>{c.id}</Link>
                  <CellText cell={c.text} />
                </h6>
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
        <h5 id="opinion-solutions" className="font-semibold">{to.solutionsHeading}</h5>
        {result.solutions.length === 0 ? (
          <p className="mt-2">{to.solutionsNone}</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {result.solutions.map((sol) => (
              <li key={sol.id}>
                <SolutionCard variant="compact" solution={sol} issueNumber={n}>
                  {/* The cells of the needs it covers (decision 112). */}
                  <dl className="mt-2 text-sm">
                    <CoveredBasisField basis={{ cells: solutionCells(issue, sol), percent: null }} />
                  </dl>
                </SolutionCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="opinion-not-mentioned">
        <h5 id="opinion-not-mentioned" className="font-semibold">{to.notMentionedHeading}</h5>
        {result.notMentioned.length === 0 ? (
          <p className="mt-2">{to.notMentionedNone}</p>
        ) : (
          <>
            <p className="mt-2">{to.notMentionedPrompt}</p>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {result.notMentioned.map((id) => (
                <li key={id}>
                  <StakeholderCard variant="compact" stakeholder={findStakeholder(index.stakeholders, id)}>
                    <AlsoInLine index={index} id={id} issueNumber={n} available={available} />
                    {/* 資料根據 of the stakeholder in this issue (decision 112). */}
                    <dl className="mt-1 text-sm">
                      <BasisField cells={stakeholderCells([issue], id)} />
                    </dl>
                  </StakeholderCard>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  )
}
