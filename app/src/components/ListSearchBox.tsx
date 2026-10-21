import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n/zh-TW'
import type { ListPage } from '@/lib/listParams'
import { cn } from '@/lib/utils'

const ts = t.listSearch

/** How the URL changes: push adds a history entry, replace does not. */
export type HistoryMode = 'push' | 'replace'

/** The wait after the last key press before the URL changes, in ms. */
export const SEARCH_DELAY_MS = 300

/** The search box of a list page (design 3.23.13, decisions 97 and 98).
 *
 * The box keeps its own text while the reader types. It calls onSearch
 * 300 ms after the last key press, or at once on Enter. The first call after
 * the box gets focus uses push. Later calls, until the box loses focus, use
 * replace. So one search is one step in the history.
 *
 * Escape and the clear button empty the box, call onSearch('') at once, and
 * keep the focus in the box.
 *
 * q: the search text in the URL (cleaned), or null. When q changes from
 * outside (「清除篩選」, the back button), the box shows the new value.
 * onSearch gets the text as typed. The caller trims it and cuts it. */
export function ListSearchBox({ page, q, onSearch, className }: {
  page: ListPage
  q: string | null
  onSearch: (text: string, mode: HistoryMode) => void
  className?: string
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(q ?? '')
  const timer = useRef<number | null>(null)
  /** The text waiting for the timer, or null. */
  const pending = useRef<string | null>(null)
  /** true after the first call since the box got focus. */
  const pushed = useRef(false)
  /** The cleaned text of the last call. When q comes back with this value,
   * it is our own change, so the box keeps the text as typed (for example
   * with a space at the end). */
  const lastSent = useRef<string | null>(q)
  const onSearchRef = useRef(onSearch)
  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  // A change of q from outside: show it in the box.
  useEffect(() => {
    if (q === lastSent.current) return
    lastSent.current = q
    pending.current = null
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    setText(q ?? '')
  }, [q])

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  function send(value: string) {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    pending.current = null
    const cleaned = value.trim() === '' ? null : value.trim()
    // Nothing changes in the URL: no call, so no empty history entry.
    if (cleaned === lastSent.current) return
    lastSent.current = cleaned
    const mode: HistoryMode = pushed.current ? 'replace' : 'push'
    pushed.current = true
    onSearchRef.current(value, mode)
  }

  function flush() {
    if (pending.current !== null) send(pending.current)
  }

  function change(value: string) {
    setText(value)
    pending.current = value
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SEARCH_DELAY_MS)
  }

  function clear() {
    setText('')
    send('')
    inputRef.current?.focus()
  }

  function keyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      send(text)
    } else if (e.key === 'Escape' && text !== '') {
      // Stop here, so Escape does not also close something around the box.
      e.preventDefault()
      e.stopPropagation()
      clear()
    }
  }

  return (
    <div role="search" className={cn('flex min-w-0 items-center gap-2', className)}>
      <label htmlFor={id} className="shrink-0 text-sm font-medium">
        {ts.label}
        <span className="sr-only">{ts.labelHidden[page]}</span>
      </label>
      <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
        <Input
          ref={inputRef}
          id={id}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={ts.placeholder[page]}
          value={text}
          onChange={(e) => change(e.target.value)}
          onKeyDown={keyDown}
          onFocus={() => {
            pushed.current = false
          }}
          onBlur={() => {
            flush()
            pushed.current = false
          }}
          // pr-9 leaves room for the clear button. The browser's own clear
          // button is hidden, so there is only one.
          className="bg-background pr-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {text !== '' && (
          <button
            type="button"
            aria-label={ts.clear}
            // Keep the focus in the box: no blur when the button is pressed.
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            className="absolute top-1/2 right-1 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
