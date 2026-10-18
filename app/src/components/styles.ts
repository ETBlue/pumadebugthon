// Shared class names, so links and chips look the same on every page.

/** A text link in the accent color. Underlined, so it is not shown by color only. */
export const linkClass = 'text-link underline underline-offset-4 hover:decoration-2 rounded-sm'

/** Extra classes for a toggle or toggle group item: a clear "on" state.
 * The check icon (see ToggleCheck) shows the state without color. */
export const toggleOnClass =
  'data-[state=on]:border-foreground data-[state=on]:bg-muted data-[state=on]:font-semibold'
