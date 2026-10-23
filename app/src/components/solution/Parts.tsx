import type { ReactNode } from 'react'
import { Heading, type HeadingLevel } from '@/components/Heading'
import { LabelledSection } from '@/components/LabelledSection'

/** One part of a solution tab: a heading and its content. The tab content
 * is under the hidden h2 of the tab (PageTabs), so the default level is 3. */
export function SolutionPart({ id, title, level = 3, children }: {
  id: string
  title: string
  level?: HeadingLevel
  children: ReactNode
}) {
  return (
    <LabelledSection headingId={id}>
      <Heading level={level} id={id} className="text-xl font-bold">{title}</Heading>
      <div className="mt-3">{children}</div>
    </LabelledSection>
  )
}

/** A short gray note, for an empty part. */
export function PartEmpty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>
}

/** Two parts side by side (decision 136): 2 columns from `lg`, 1 column
 * below it, with the first child on top. `lg` and not `md`, because the tab
 * menu takes 10 to 11rem on the left (decision 130). Each child gets
 * `min-w-0`, so long text wraps inside its column. */
export function TwoColumns({ children }: { children: ReactNode }) {
  return <div className="grid gap-10 *:min-w-0 lg:grid-cols-2 lg:gap-8">{children}</div>
}
