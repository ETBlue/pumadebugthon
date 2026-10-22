import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { XIcon } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams, type To } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n/zh-TW'
import { sideMenuTree } from '@/lib/sideMenu'
import {
  CLOSED_PICKER, PICKER_KEYS, pickerKey, pickerOptionIds, pickerOptions, whoSearch, type PickerKey, type PickerState,
} from '@/lib/stakeholderPicker'
import { findStakeholder, isListed } from '@/lib/stakeholders'
import { cn } from '@/lib/utils'
import type { Stakeholder } from '@/types'
import { StakeholderTree } from './StakeholderTree'

const tp = t.stakeholderPicker
const tm = t.sideMenu

export interface StakeholderPickerProps {
  /** All stakeholders from index.json. Only the listed ones (isListed) are
   * options. */
  stakeholders: Stakeholder[]
  /** index.json pathLabels, for the level names of the tree. */
  pathLabels: Record<string, string>
  /** The picked stakeholder: `who` from listParamsOf (already cleaned and
   * resolved), or null. */
  value: string | null
  /** Where the picker is shown (the slot filter of ListBar). 'bar': the bar
   * row from md, with the label left of the box and a floating list.
   * 'sheet': the phone sheet, with the label above the box and the list
   * inline under the box, in the page flow. Default 'bar'. */
  place?: 'bar' | 'sheet'
  /** Only these stakeholders are options, in the list and in the tree of
   * the dialog. Default: every listed stakeholder. The issue tabs pass the
   * stakeholders of the issue (decision 116). */
  ids?: string[]
  /** The search part of the URL after a pick (null: 「全部利害關係人」 or the
   * clear button). Default whoSearch (who=<id>, the list pages). The issue
   * tabs pass stakeholderMenuSearch (?stakeholder=<id>, decision 116). */
  searchOf?: (params: URLSearchParams, id: string | null) => string
  /** The count next to each option and each stakeholder of the tree
   * (decision 66, sideMenuCounts), or null for no counts. */
  counts?: Map<string, number> | null
  /** Hidden text before a count, for screen readers (「，訴求 」). */
  countUnit?: string
  /** One line in the dialog, under its intro, that says what the counts
   * mean (「數字：在本議題的訴求數」). */
  countNote?: string
  className?: string
}

/** The 利害關係人 filter of #/issues and #/solutions (design 3.23.7, decision
 * 86), and of the 訴求, 需求 and 解法 tabs of the issue page (decision 116,
 * with ids, searchOf and counts). A search box with a list (the ARIA 1.2 combobox pattern, list
 * autocomplete), a clear button, a hidden live count, and the 「瀏覽」 button
 * that opens a dialog with the stakeholder tree. A pick sets who=<id> in the
 * URL with a new history entry and keeps every other param. The component
 * reads and writes the URL itself, so the bar only places it. */
export function StakeholderPicker({
  stakeholders, pathLabels, value, place = 'bar', ids, searchOf = whoSearch, counts = null, countUnit = '', countNote, className,
}: StakeholderPickerProps) {
  const inline = place === 'sheet'
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogBodyRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const inputId = `${baseId}-input`
  const labelId = `${baseId}-label`
  const listId = `${baseId}-list`
  const optionId = (id: string) => `${baseId}-option-${id}`

  const labelOf = (id: string | null) => {
    if (id === null) return ''
    const s = findStakeholder(stakeholders, id)
    return tm.item(s.id, s.name)
  }
  const pickedLabel = labelOf(value)

  const [state, setState] = useState<PickerState>({ ...CLOSED_PICKER, text: pickedLabel })
  const [dialogOpen, setDialogOpen] = useState(false)

  // When `who` changes (a pick, 「清除篩選」, the back button), the box shows
  // the new pick. This runs during render, as in the side menu.
  const [seenValue, setSeenValue] = useState(value)
  if (seenValue !== value) {
    setSeenValue(value)
    setState({ ...CLOSED_PICKER, text: pickedLabel })
  }

  // The box shows the picked label. Then the list shows every option.
  const query = state.text === pickedLabel ? '' : state.text
  const groups = useMemo(() => pickerOptions(stakeholders, query, ids), [stakeholders, query, ids])
  const optionIds = useMemo(() => pickerOptionIds(groups), [groups])

  const tree = useMemo(
    () => sideMenuTree(ids ?? stakeholders.filter(isListed).map((s) => s.id), stakeholders, pathLabels),
    [stakeholders, pathLabels, ids],
  )

  const targetOf = (id: string | null): To => ({ pathname, search: searchOf(params, id) })
  const pick = (id: string | null) => {
    setState({ ...CLOSED_PICKER, text: labelOf(id) })
    // The same pick again: no new history entry.
    if (id === value) return
    navigate(targetOf(id), { preventScrollReset: true })
  }

  const applyKey = (key: PickerKey) => {
    const step = pickerKey(state, key, optionIds)
    if (step.pick !== null) pick(step.pick)
    else setState(step.state)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Escape is handled in the capture listener below.
    if (!PICKER_KEYS.includes(e.key) || e.key === 'Escape') return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || (e.key === 'Enter' && state.open)) e.preventDefault()
    applyKey(e.key as PickerKey)
  }

  // Escape: when it closes the list or clears the text, it must not also
  // close a dialog around the picker (the phone sheet). Radix listens for
  // Escape on the document in the capture phase, so this listener is on the
  // window in the capture phase, which runs first. When there is nothing to
  // close or clear, Escape goes on as usual.
  const escapeRef = useRef<(e: globalThis.KeyboardEvent) => void>(() => {})
  escapeRef.current = (e) => {
    if (e.key !== 'Escape' || e.target !== inputRef.current) return
    if (!state.open && state.text === '') return
    e.stopPropagation()
    e.preventDefault()
    applyKey('Escape')
  }
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => escapeRef.current(e)
    window.addEventListener('keydown', listener, true)
    return () => window.removeEventListener('keydown', listener, true)
  }, [])

  // Keep the active option in view when the list scrolls.
  useEffect(() => {
    if (state.active === null) return
    document.getElementById(`${baseId}-option-${state.active}`)?.scrollIntoView({ block: 'nearest' })
  }, [baseId, state.active])

  const clear = () => {
    pick(null)
    inputRef.current?.focus()
  }

  // A live count after typing. Empty when the reader has not typed.
  const status = state.open && query.trim() !== ''
    ? (optionIds.length === 0 ? tp.noMatch : tp.found(optionIds.length))
    : ''

  // On open, focus goes to the current item: the picked stakeholder, or
  // 「全部利害關係人」 (both have aria-current).
  const focusCurrent = (e: Event) => {
    e.preventDefault()
    const body = dialogBodyRef.current
    const target = body?.querySelector<HTMLElement>('[aria-current]') ?? body?.querySelector<HTMLElement>('a')
    target?.focus()
  }

  return (
    <div className={cn(inline ? 'flex flex-col gap-1' : 'flex min-w-0 items-center gap-2', className)}>
      <label id={labelId} htmlFor={inputId} className="shrink-0 text-sm font-medium">{tp.label}</label>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
          <Input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={state.open}
            aria-controls={listId}
            aria-activedescendant={state.active === null ? undefined : optionId(state.active)}
            placeholder={tp.placeholder}
            value={state.text}
            onChange={(e) => setState({ open: true, active: null, text: e.target.value })}
            onClick={() => { if (!state.open) setState({ ...state, open: true }) }}
            onKeyDown={onKeyDown}
            onBlur={() => setState({ ...CLOSED_PICKER, text: pickedLabel })}
            className={cn('bg-background', value !== null && 'pr-8')}
          />
          {value !== null && (
            <button
              type="button"
              aria-label={tp.clear}
              onClick={clear}
              className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          )}
          {/* A mouse down in the list must not take the focus from the box. */}
          {/* axe reports scrollable-region-focusable here. We keep it so on
              purpose: the options are reached with the arrow keys in the box
              (aria-activedescendant), as in the ARIA combobox pattern, and the
              active option scrolls into view. A Tab stop on the list would
              lose the focus when the list closes on blur (L9). */}
          <div
            hidden={!state.open}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              'max-h-72 overflow-y-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground',
              inline ? 'mt-1' : 'absolute top-full left-0 z-20 mt-1 w-full max-w-sm shadow-md md:min-w-64',
            )}
          >
            <div id={listId} role="listbox" aria-labelledby={labelId}>
              {groups.map((g) => (
                <div key={g.root} role="group" aria-labelledby={`${baseId}-group-${g.root}`}>
                  <div id={`${baseId}-group-${g.root}`} role="presentation" className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">
                    {tm.roots[g.root]}
                  </div>
                  {g.options.map((s) => {
                    const active = s.id === state.active
                    const count = counts === null ? undefined : (counts.get(s.id) ?? 0)
                    return (
                      <div
                        key={s.id}
                        id={optionId(s.id)}
                        role="option"
                        aria-selected={active}
                        onClick={() => pick(s.id)}
                        className={cn(
                          'flex min-h-8 cursor-pointer items-start gap-1 rounded-sm px-2 py-1.5 break-words hover:bg-muted',
                          active && 'bg-muted outline-2 outline-ring',
                          s.id === value && 'font-semibold',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-mono">{s.id}</span> {s.name}
                        </span>
                        {count !== undefined && (
                          <>
                            <span className="sr-only">{countUnit}</span>
                            <span className={cn('shrink-0 font-normal tabular-nums', count === 0 && 'text-muted-foreground')}>{count}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            {optionIds.length === 0 && <p className="px-2 py-1.5 text-muted-foreground">{tp.noMatch}</p>}
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" aria-label={tp.browseName} className="shrink-0 bg-background">{tp.browse}</Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            onOpenAutoFocus={focusCurrent}
            className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-4 rounded-none p-4 md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-xl md:p-6"
          >
            <DialogHeader className="pr-10">
              <DialogTitle>{tp.dialogTitle}</DialogTitle>
              <DialogDescription>{tp.dialogIntro}</DialogDescription>
              {countNote !== undefined && <p className="text-sm text-muted-foreground">{countNote}</p>}
            </DialogHeader>
            <div ref={dialogBodyRef} className="min-h-0 flex-1 overflow-y-auto">
              <nav aria-label={tp.treeLabel}>
                <StakeholderTree
                  tree={tree}
                  targetOf={targetOf}
                  current={value}
                  ariaCurrent="true"
                  counts={counts}
                  countUnit={countUnit}
                  onPick={() => setDialogOpen(false)}
                />
              </nav>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="absolute top-3 right-3 md:top-4 md:right-4">
                <XIcon aria-hidden="true" />
                <span className="sr-only">{tp.close}</span>
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
      <div role="status" className="sr-only">{status}</div>
    </div>
  )
}
