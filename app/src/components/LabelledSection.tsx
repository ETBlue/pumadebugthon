import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from 'react'
import { sectionLabelIds } from '@/lib/sectionLabel'

/** The heading IDs of the named sections around this point, outermost first. */
const OuterLabels = createContext<readonly string[]>([])

/** Name the sections inside children with the heading `id` too. Use it for
 * a named element that is not a LabelledSection, for example an <article>. */
export function SectionLabelScope({ id, children }: { id: string; children: ReactNode }) {
  const outer = useContext(OuterLabels)
  const labels = useMemo(() => [...outer, id], [outer, id])
  return <OuterLabels.Provider value={labels}>{children}</OuterLabels.Provider>
}

/** A <section> named by its heading (headingId) and by the headings of the
 * LabelledSections around it (sectionLabelIds), so two parts with the same
 * title get different landmark names. */
export function LabelledSection({ headingId, children, ...props }: Omit<ComponentProps<'section'>, 'aria-labelledby'> & { headingId: string }) {
  const outer = useContext(OuterLabels)
  return (
    <section {...props} aria-labelledby={sectionLabelIds(outer, headingId)}>
      <SectionLabelScope id={headingId}>{children}</SectionLabelScope>
    </section>
  )
}
