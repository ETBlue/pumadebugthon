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
