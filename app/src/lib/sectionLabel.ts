// The accessible names of nested <section> elements. A section with
// aria-labelledby is a "region" landmark. Two regions with the same name
// (for example 「訴求」 under issue #1 and under issue #2) cannot be told
// apart in the landmark list of a screen reader. So a section inside other
// named sections is named by all the headings: 「#1 把三千棵樹種回來 訴求」.

/** The aria-labelledby value of a section: the heading IDs of the outer
 * named sections (outermost first), then its own heading ID. */
export function sectionLabelIds(outer: readonly string[], own: string): string {
  return [...outer.filter((id) => id !== own), own].join(' ')
}
