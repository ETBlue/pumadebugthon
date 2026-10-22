import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, LayoutGrid, ListTree, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { t } from '@/i18n/zh-TW'
import { DEFAULT_LIST_STATE, listUrlSearch, Q_MAX_LENGTH, type ListPage, type ListState } from '@/lib/listParams'
import type { ListSort } from '@/lib/listSort'
import { cn } from '@/lib/utils'
import { ListSearchBox, type HistoryMode } from './ListSearchBox'
import { containerClass, toggleOnClass } from './styles'
import { ToggleCheck } from './ToggleCheck'

const tb = t.listBar

/** One choice of a multi-choice filter. value is the URL value, as text. */
export interface ListBarChoice {
  value: string
  label: string
}

/** One filter of the bar (design 3.23.5). The bar does not know what a
 * filter means. Each filter gives its current value and a function that
 * returns the new page state for a new value. The bar turns that state into
 * a URL search string with listUrlSearch.
 *
 * - choices: a filter with many choices (議題, 空間類型). From md a popover
 *   button with checkboxes; in the phone sheet the checkboxes directly.
 *   none: the text for no pick, for example t.listBar.all (「議題：全部」).
 * - toggle: a filter with one on/off state (只看特別關注族群).
 * - slot: a control the page builds itself, for example the stakeholder
 *   picker (L4). render gets where it is shown: 'bar' (from md) or 'sheet'
 *   (the phone sheet, where a list shows inline). active: true when the
 *   filter is on, for the number on the phone 「篩選」 button. */
export type ListBarFilter =
  | {
      kind: 'choices'
      key: string
      label: string
      options: ListBarChoice[]
      value: string[]
      none?: string
      next: (value: string[]) => ListState
    }
  | {
      kind: 'toggle'
      key: string
      label: string
      pressed: boolean
      next: (pressed: boolean) => ListState
    }
  | {
      kind: 'slot'
      key: string
      active: boolean
      render: (place: 'bar' | 'sheet') => ReactNode
    }

function isOn(filter: ListBarFilter): boolean {
  switch (filter.kind) {
    case 'choices':
      return filter.value.length > 0
    case 'toggle':
      return filter.pressed
    case 'slot':
      return filter.active
  }
}

/** The search text for the URL: trimmed and at most 100 characters (not
 * cut in the middle of a character). null when empty. The same rule as
 * listParamsOf, so the page does not need a replace after a search. */
function cleanQuery(text: string): string | null {
  const cleaned = [...text.trim()].slice(0, Q_MAX_LENGTH).join('').trim()
  return cleaned === '' ? null : cleaned
}

/** The checkboxes of a choices filter, in a fieldset with a legend. */
function ChoiceList({ filter, onPick }: {
  filter: Extract<ListBarFilter, { kind: 'choices' }>
  onPick: (value: string[]) => void
}) {
  const id = useId()
  function toggle(value: string, checked: boolean) {
    // Keep the order of the options, so the URL does not depend on the
    // order of the clicks.
    const picked = new Set(filter.value)
    if (checked) picked.add(value)
    else picked.delete(value)
    onPick(filter.options.map((o) => o.value).filter((v) => picked.has(v)))
  }
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{filter.label}</legend>
      <ul className="space-y-0.5">
        {filter.options.map((o, i) => (
          <li key={o.value}>
            <label htmlFor={`${id}-${i}`} className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-1 text-sm hover:bg-muted">
              <input
                id={`${id}-${i}`}
                type="checkbox"
                checked={filter.value.includes(o.value)}
                onChange={(e) => toggle(o.value, e.target.checked)}
                className="size-4 shrink-0 accent-foreground"
              />
              {o.label}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

/** The sort and filter bar of a list page (design 3.23.2, decisions 80, 97
 * 98 and 114). Its name is 「搜尋、排序與篩選」.
 *
 * From md: one row (it wraps when it is too long) with the sort <select>,
 * the filters (popover buttons, toggles, slots), the view switch and then
 * the search box at the right end of the row (decision 114). Below md: a row
 * with the sort <select>, the view switch and the 「篩選」 button, which
 * opens a bottom sheet (a Radix dialog) with the filters, the result line,
 * 「清除篩選」 and 「完成」. The search box is its own full-width row under
 * that row. It is never in the sheet. The DOM order is the same as the
 * screen order, so the keyboard order is sort, filters, view switch, search.
 *
 * The bar is a full-width band right under the header. Its controls sit in
 * the page column (containerClass). The page route has handle.fullWidth, and
 * the page puts the rest of its content in listBodyClass (decision 106).
 *
 * The bar does not know the pages. It gets:
 * - page and state: the page and its cleaned URL state (listParamsOf).
 * - sorts: the sort options, in order (PAGE_SORTS[page]).
 * - filters: the filters, in the order of design 3.23.5.
 * - viewSwitch: true on #/stakeholders. In tree view the sort is disabled.
 * - sortNoteId: the id of the sort note under the result line, while a
 *   share sort is on (the <select> gets aria-describedby).
 * - resultLine: the result line for the sheet (a ResultLine with
 *   clearLink={false}). The page shows its own ResultLine under the bar.
 * - onNavigate: called with the new URL search string ("?…" or "") and the
 *   history mode. A sort, filter or view change uses push. The search box
 *   uses push for the first change after it gets focus, then replace. */
export function ListBar({ page, state, sorts, filters, viewSwitch = false, sortNoteId, resultLine, onNavigate, className }: {
  page: ListPage
  state: ListState
  sorts: readonly ListSort[]
  filters: ListBarFilter[]
  viewSwitch?: boolean
  sortNoteId?: string
  resultLine?: ReactNode
  onNavigate: (search: string, mode: HistoryMode) => void
  className?: string
}) {
  const sortId = useId()
  const treeNoteId = useId()
  const [sheetOpen, setSheetOpen] = useState(false)
  const go = (next: ListState, mode: HistoryMode = 'push') => onNavigate(listUrlSearch(page, next), mode)
  const onCount = filters.filter(isOn).length
  const tree = viewSwitch && state.view === 'tree'
  const describedBy = [tree ? treeNoteId : null, !tree ? sortNoteId : null].filter(Boolean).join(' ') || undefined

  function clearFilters() {
    const cleared: ListState = { ...DEFAULT_LIST_STATE, issues: [], spaces: [], sort: state.sort, view: state.view }
    if (listUrlSearch(page, cleared) !== listUrlSearch(page, state)) go(cleared)
  }

  return (
    <section
      aria-label={t.listSearch.barLabel}
      className={cn('border-b border-border bg-muted', className)}
    >
      {/* The band is full width. The controls use the page column, so they
          line up with the header content (decision 106). */}
      <div className={`${containerClass} flex flex-col gap-3 py-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4`}>
        {/* Below md this is one row. From md, md:contents puts its children
            straight into the bar row. */}
        <div className="flex items-center gap-2 md:contents">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
            <label htmlFor={sortId} className="shrink-0 text-sm font-medium">{tb.sortLabel}</label>
            <select
              id={sortId}
              value={state.sort}
              disabled={tree}
              aria-describedby={describedBy}
              onChange={(e) => go({ ...state, sort: e.target.value as ListSort })}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:flex-none"
            >
              {sorts.map((s) => (
                <option key={s} value={s}>{tb.sorts[s]}</option>
              ))}
            </select>
          </div>

          {/* The filters from md. Below md they are in the sheet. */}
          <div className="hidden md:contents">
            {filters.map((f) => (
              <BarFilter key={f.key} filter={f} onState={(s) => go(s)} />
            ))}
          </div>

          {viewSwitch && (
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={state.view}
              onValueChange={(v) => {
                // A click on the item that is on gives ''. Keep the view.
                if (v === 'cards' || v === 'tree') go({ ...state, view: v })
              }}
              aria-label={tb.view}
              className="shrink-0"
            >
              <ToggleGroupItem value="cards" className={cn(toggleOnClass, 'size-8 px-0 md:h-9 md:w-auto md:px-2.5')}>
                <LayoutGrid aria-hidden="true" />
                <span className="sr-only md:hidden">{tb.viewNames.cards}</span>
                <span className="hidden md:inline">{tb.views.cards}</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="tree" className={cn(toggleOnClass, 'size-8 px-0 md:h-9 md:w-auto md:px-2.5')}>
                <ListTree aria-hidden="true" />
                <span className="sr-only md:hidden">{tb.viewNames.tree}</span>
                <span className="hidden md:inline">{tb.views.tree}</span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {filters.length > 0 && (
            <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="shrink-0 md:hidden" aria-label={tb.filtersButtonName(onCount)}>
                  {tb.filtersButton(onCount)}
                </Button>
              </DialogTrigger>
              <DialogContent
                showCloseButton={false}
                aria-describedby={undefined}
                className="top-auto bottom-0 left-0 flex max-h-[85vh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-b-none p-0 sm:max-w-none data-open:zoom-in-100 data-closed:zoom-out-100"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <DialogTitle className="text-base font-bold">{tb.sheetTitle}</DialogTitle>
                  <DialogClose asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={tb.close}>
                      <X aria-hidden="true" />
                    </Button>
                  </DialogClose>
                </div>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
                  {filters.map((f) => (
                    <SheetFilter key={f.key} filter={f} onState={(s) => go(s)} />
                  ))}
                </div>
                <div className="space-y-3 border-t border-border px-4 py-3">
                  {resultLine}
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" onClick={clearFilters}>{tb.clear}</Button>
                    <DialogClose asChild>
                      <Button>{tb.done}</Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* The search box comes after the other controls, in the DOM and on
            the screen (decision 114). Below md it is its own full-width row
            under the sort row. From md it is a direct flex item of the bar
            row, and md:ml-auto pushes it to the right end of the row. */}
        <ListSearchBox
          page={page}
          q={state.q}
          onSearch={(text, mode) => go({ ...state, q: cleanQuery(text) }, mode)}
          className="w-full md:ml-auto md:w-auto"
        />

        {tree && (
          <p id={treeNoteId} className="text-sm text-muted-foreground md:basis-full">{tb.treeSortNote}</p>
        )}
      </div>
    </section>
  )
}

/** One filter in the bar row, from md. */
function BarFilter({ filter, onState }: { filter: ListBarFilter; onState: (s: ListState) => void }) {
  switch (filter.kind) {
    case 'choices':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="shrink-0 bg-background">
              {tb.choicesButton(filter.label, filter.value.length, filter.none)}
              <ChevronDown aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" aria-label={filter.label} className="max-h-[60vh] w-auto max-w-80 min-w-56 overflow-y-auto p-3">
            <ChoiceList filter={filter} onPick={(v) => onState(filter.next(v))} />
          </PopoverContent>
        </Popover>
      )
    case 'toggle':
      return (
        <Toggle
          variant="outline"
          pressed={filter.pressed}
          onPressedChange={(p) => onState(filter.next(p))}
          className={cn(toggleOnClass, 'shrink-0 bg-background')}
        >
          <ToggleCheck />
          {filter.label}
        </Toggle>
      )
    case 'slot':
      return <>{filter.render('bar')}</>
  }
}

/** One filter in the phone sheet: stacked, with its label. */
function SheetFilter({ filter, onState }: { filter: ListBarFilter; onState: (s: ListState) => void }) {
  switch (filter.kind) {
    case 'choices':
      return <ChoiceList filter={filter} onPick={(v) => onState(filter.next(v))} />
    case 'toggle':
      return (
        <Toggle
          variant="outline"
          pressed={filter.pressed}
          onPressedChange={(p) => onState(filter.next(p))}
          className={cn(toggleOnClass, 'bg-background')}
        >
          <ToggleCheck />
          {filter.label}
        </Toggle>
      )
    case 'slot':
      return <div>{filter.render('sheet')}</div>
  }
}
