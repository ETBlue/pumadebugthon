import type { HTMLAttributes } from 'react'

export type HeadingLevel = 2 | 3 | 4 | 5 | 6

/** A heading whose level comes from a prop, so a shared part (for example
 * ConflictView) keeps the heading order of the page it is on. */
export function Heading({ level, ...props }: HTMLAttributes<HTMLHeadingElement> & { level: HeadingLevel }) {
  const Tag = `h${level}` as const
  return <Tag {...props} />
}

/** The next level down, at most h6. */
export function subLevel(level: HeadingLevel): HeadingLevel {
  return Math.min(level + 1, 6) as HeadingLevel
}
