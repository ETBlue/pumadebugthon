import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { linkClass } from '@/components/styles'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { keptSearch } from '@/lib/stakeholderFilter'
import { tabLabelText, type TabLabel } from '@/lib/tabLabel'
import { useFocusTarget } from './FocusTarget'

/** The tab list of an entity page (issue, stakeholder, solution; design 3.2,
 * 3.3, 3.12). The tab is in the URL. A tab change keeps only ?evidence= and
 * ?stakeholder= (keptSearch). It drops ?pick= and ?focus=. It also runs
 * useFocusTarget, so ?focus= works on every tab. */
export function PageTabs<T extends string>({
  label, tabs, current, nameOf, labelOf, pathOf, notFound, overviewPath, overviewLink, children,
}: {
  /** The accessible name of the tab list. */
  label: string
  tabs: readonly T[]
  /** null: the URL names an unknown tab. */
  current: T | null
  /** The plain tab name, for the hidden h2 of the tab content. */
  nameOf: (tab: T) => string
  /** The visible label, for example 「訴求 39」 and 「衝突 9」. */
  labelOf: (tab: T) => TabLabel
  pathOf: (tab: T) => string
  /** The text and link shown for an unknown tab. */
  notFound: string
  overviewPath: string
  overviewLink: string
  /** The content of the current tab. */
  children: (tab: T) => ReactNode
}) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // ?focus=<value>: scroll to that part of the tab and focus it (design 3.2).
  useFocusTarget()

  // A new history entry per tab, so the back button returns to the tab
  // before. activationMode="manual": with automatic activation, Radix calls
  // onValueChange on mouse down and again on focus, which adds two history
  // entries. Arrow keys move the focus; Enter or Space opens the tab.
  const onTabChange = (value: string) => {
    const next = tabs.find((name) => name === value)
    if (next) navigate({ pathname: pathOf(next), search: keptSearch(params) }, { preventScrollReset: true })
  }

  return (
    <Tabs value={current ?? ''} onValueChange={onTabChange} activationMode="manual" className="mt-6">
      {/* On a phone the tab list wraps onto two rows. It never scrolls sideways. */}
      <TabsList aria-label={label} className="h-auto w-full flex-wrap items-stretch justify-start group-data-horizontal/tabs:h-auto">
        {tabs.map((name) => {
          const l = labelOf(name)
          // On a phone the second part (the counts) is on its own line, in
          // smaller text, so a label never breaks in the middle of a word or
          // a number. From md it is one line: 「訴求 39・衝突 9」. The
          // aria-label is the one-line text, so the counts stay in the
          // accessible name.
          return (
            <TabsTrigger
              key={name}
              value={name}
              aria-label={tabLabelText(l)}
              className="h-auto flex-1 whitespace-normal px-2 py-1.5 md:px-3"
            >
              <span className="flex flex-col items-center leading-tight md:flex-row md:leading-normal">
                <span className="whitespace-nowrap">{l.main}</span>
                {l.sub !== undefined && (
                  <>
                    <span className="hidden md:inline">{l.sep}</span>
                    <span className="whitespace-nowrap text-xs md:text-sm">{l.sub}</span>
                  </>
                )}
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>
      {current === null ? (
        <div className="mt-4 text-base">
          <p>{notFound}</p>
          <p className="mt-3">
            <Link to={{ pathname: overviewPath, search: keptSearch(params) }} className={linkClass}>{overviewLink}</Link>
          </p>
        </div>
      ) : (
        tabs.map((name) => (
          <TabsContent key={name} value={name} className="mt-4 text-base">
            <h2 className="sr-only">{nameOf(name)}</h2>
            {name === current && children(name)}
          </TabsContent>
        ))
      )}
    </Tabs>
  )
}
