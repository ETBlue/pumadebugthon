import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { linkClass } from '@/components/styles'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { keptSearch } from '@/lib/stakeholderFilter'
import { tabLabelText, type TabLabel } from '@/lib/tabLabel'
import { useFocusTarget } from './FocusTarget'

/** The classes of a tab list that scrolls sideways below md (decision 102):
 * one row, as wide as the screen (it cancels the px-4 of the page column and
 * puts the same padding inside), no rounded corners at the screen edges, no
 * up and down scroll, and a hidden scrollbar. */
export const PHONE_SCROLL_CLASS =
  '-mx-4 w-[calc(100%+2rem)] max-w-none rounded-none px-4 flex-nowrap overflow-x-auto overflow-y-hidden ' +
  '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:w-full md:rounded-lg md:px-[3px]'

/** The tab list of an entity page (issue, stakeholder, solution; design 3.2,
 * 3.3, 3.12). The tab is in the URL. A tab change keeps only ?evidence= and
 * ?stakeholder= (keptSearch). It drops ?pick= and ?focus=. It also runs
 * useFocusTarget, so ?focus= works on every tab. */
export function PageTabs<T extends string>({
  label, tabs, current, nameOf, labelOf, pathOf, notFound, overviewPath, overviewLink, scrollOnPhone = false, children,
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
  /** true: below md the tab list is one row that scrolls sideways (the
   * issue page with nine tabs, decision 102). false: it wraps. */
  scrollOnPhone?: boolean
  /** The content of the current tab. */
  children: (tab: T) => ReactNode
}) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // ?focus=<value>: scroll to that part of the tab and focus it (design 3.2).
  useFocusTarget()
  const listRef = useRef<HTMLDivElement>(null)

  // A list that scrolls sideways shows the current tab: when it is outside
  // the visible part, the list (not the page) scrolls to put it in the middle.
  // It runs again when the labels change, because the counts come in after
  // the issue loads and make the tabs wider.
  const labels = tabs.map((name) => tabLabelText(labelOf(name))).join('|')
  useEffect(() => {
    const list = listRef.current
    if (!scrollOnPhone || !list || list.scrollWidth <= list.clientWidth) return
    const active = list.querySelector<HTMLElement>('[data-state="active"]')
    if (!active) return
    const l = list.getBoundingClientRect()
    const a = active.getBoundingClientRect()
    if (a.left < l.left || a.right > l.right) list.scrollLeft += a.left - l.left - (l.width - a.width) / 2
  }, [scrollOnPhone, current, labels])

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
      {/* On a phone the tab list wraps onto two rows. With scrollOnPhone it is
          one row that scrolls sideways inside itself; the page does not. It
          is as wide as the screen: the negative margin cancels the side
          padding of the page column (px-4 below md, containerClass), and the
          same padding inside keeps the first tab in line with the page
          content. It never scrolls up and down, and its scrollbar is hidden;
          touch, a trackpad and the arrow keys still scroll it. From md it
          wraps, inside the column. */}
      <TabsList
        ref={listRef}
        aria-label={label}
        className={`h-auto w-full items-stretch justify-start group-data-horizontal/tabs:h-auto ${
          scrollOnPhone ? `${PHONE_SCROLL_CLASS} md:flex-wrap md:overflow-visible` : 'flex-wrap'
        }`}
      >
        {tabs.map((name) => {
          const l = labelOf(name)
          // On a phone the second part (the counts) is on its own line, in
          // smaller text, so a label never breaks in the middle of a word or
          // a number. In a list that scrolls sideways there is room, so the
          // label is one line there too: 「訴求 39・衝突 9」. From md it is
          // one line. The aria-label is the one-line text, so the counts
          // stay in the accessible name.
          return (
            <TabsTrigger
              key={name}
              value={name}
              aria-label={tabLabelText(l)}
              className={`h-auto px-2 py-1.5 md:flex-1 md:px-3 ${scrollOnPhone ? 'flex-none whitespace-nowrap' : 'flex-1 whitespace-normal'}`}
            >
              <span
                className={
                  scrollOnPhone
                    ? 'flex flex-row items-center'
                    : 'flex flex-col items-center leading-tight md:flex-row md:leading-normal'
                }
              >
                <span className="whitespace-nowrap">{l.main}</span>
                {l.sub !== undefined && (
                  <>
                    <span className={scrollOnPhone ? 'whitespace-pre' : 'hidden md:inline'}>{l.sep}</span>
                    <span className={`whitespace-nowrap ${scrollOnPhone ? 'text-sm' : 'text-xs md:text-sm'}`}>{l.sub}</span>
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
