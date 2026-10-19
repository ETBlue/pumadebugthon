import { Link } from 'react-router'
import { keyStoryPath } from '@/lib/entityPaths'
import { cn } from '@/lib/utils'
import { linkClass } from './styles'

/** The key of a want or a need in mono text. A key that is a story ID (a
 * want or need with no group) links to its story page (decision 55). A
 * group key (W08, N07) is plain text. The story page has no data filter,
 * so the link has no ?evidence=1 (the same as StoryCard). */
export function ItemKey({ issueNumber, value, className, muted = false }: {
  issueNumber: number
  value: string
  className?: string
  /** Gray text for a plain key. A link keeps the link color. */
  muted?: boolean
}) {
  const to = keyStoryPath(issueNumber, value)
  return to === null ? (
    <span className={cn('font-mono', muted && 'text-muted-foreground', className)}>{value}</span>
  ) : (
    <Link to={to} className={cn(linkClass, 'font-mono', className)}>{value}</Link>
  )
}
