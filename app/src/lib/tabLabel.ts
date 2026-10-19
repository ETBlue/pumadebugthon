// The visible label of a tab on an entity page (PageTabs; design 3.2, 3.3,
// 3.12). A label with counts has two parts, so a phone can show the second
// part on its own line under the first, for example 「訴求 39」 over 「衝突 9」.

export interface TabLabel {
  /** The first part, for example 「訴求 39」 or 「需求」. */
  main: string
  /** The second part, for example 「衝突 9」 or 「涵蓋 9・未涵蓋 12」. */
  sub?: string
  /** The text between the two parts on a wide screen, for example 「・」. */
  sep?: string
}

/** The whole label on one line: main, sep, sub. It is the accessible name of
 * the tab, so every count is in it. */
export function tabLabelText(label: TabLabel): string {
  return label.sub === undefined ? label.main : `${label.main}${label.sep ?? ' '}${label.sub}`
}
