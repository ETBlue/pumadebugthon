// Shared class names, so links and chips look the same on every page.

/** A text link in the accent color. Underlined, so it is not shown by color only. */
export const linkClass = 'text-link underline underline-offset-4 hover:decoration-2 rounded-sm'

/** Extra classes that make a link at least 24 x 24 px (WCAG 2.2 target size,
 * 2.5.8). Use them for a link that stands alone: in a list of links, in a
 * card header, in a heading, or on its own line. A link inside a sentence
 * keeps linkClass only, because WCAG has an exception for inline links. */
export const targetSizeClass = 'inline-block min-h-6 min-w-6 py-0.5'

/** linkClass for a link that stands alone (see targetSizeClass). */
export const targetLinkClass = `${linkClass} ${targetSizeClass}`

/** Extra classes for a toggle or toggle group item: a clear "on" state.
 * The check icon (see ToggleCheck) shows the state without color. */
export const toggleOnClass =
  'data-[state=on]:border-foreground data-[state=on]:bg-muted data-[state=on]:font-semibold'

/** Inline code in cell text, for example a space type code such as `utility`.
 * Same text color as the body, on a light gray box, so contrast stays high. */
export const codeClass = 'rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground break-words'

/** The centered page column. The header, the footer and most pages use it.
 * The home page hero is full width, with this column inside it.
 * At most 1440 px wide (design 3.22, decision 61). On a wider window the
 * column stays 1440 px and is centered. */
export const containerClass = 'mx-auto w-full max-w-[90rem] px-4 md:px-8'

/** Long text (intro lines, paragraphs, summaries, story text) is at most
 * 48rem wide, so a line is not too long to read (design 3.22). Cards,
 * tables and grids do not use it. They use the full width. */
export const proseClass = 'max-w-3xl'

/** A part of a page that ?focus= can scroll to (design 3.2). It gets
 * tabIndex={-1}. The page moves focus to it with a script, and
 * :focus-visible does not always match then, so the outline uses :focus.
 * The outline shows only while the element has data-focus-jump
 * (FOCUS_JUMP_ATTRIBUTE in src/lib/focus.ts). useFocusTarget sets it, so a
 * mouse click inside the card shows no outline. scroll-mt keeps a little
 * space above it. */
export const focusTargetClass =
  'scroll-mt-4 rounded-md data-focus-jump:focus:outline-solid data-focus-jump:focus:outline-2 data-focus-jump:focus:outline-offset-2 data-focus-jump:focus:outline-ring'
