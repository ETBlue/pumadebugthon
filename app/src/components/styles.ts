// Shared class names, so links and chips look the same on every page.

/** A text link in the accent color. Underlined, so it is not shown by color only. */
export const linkClass = 'text-link underline underline-offset-4 hover:decoration-2 rounded-sm'

/** Extra classes for a toggle or toggle group item: a clear "on" state.
 * The check icon (see ToggleCheck) shows the state without color. */
export const toggleOnClass =
  'data-[state=on]:border-foreground data-[state=on]:bg-muted data-[state=on]:font-semibold'

/** Inline code in cell text, for example a space type code such as `utility`.
 * Same text color as the body, on a light gray box, so contrast stays high. */
export const codeClass = 'rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground break-words'

/** The centered page column. The header, the footer and most pages use it.
 * The home page hero is full width, with this column inside it. */
export const containerClass = 'mx-auto w-full max-w-5xl px-4 md:px-8'

/** A part of a page that ?focus= can scroll to (design 3.2). It gets
 * tabIndex={-1}. The page moves focus to it with a script, and
 * :focus-visible does not always match then, so the outline uses :focus.
 * scroll-mt keeps a little space above it. */
export const focusTargetClass =
  'scroll-mt-4 rounded-md focus:outline-solid focus:outline-2 focus:outline-offset-2 focus:outline-ring'
