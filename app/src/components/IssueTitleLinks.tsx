import { Link, type To } from 'react-router'
import { issueNumberTitle, type IssueTitles } from '@/lib/issues'
import { linkClass } from './styles'

/** Several issues on a card, as links with the number and the title:
 * 「#1 把三千棵樹種回來」, one issue per line (decision 112). One per line,
 * because a title can be long: each link then wraps on its own, and the
 * next issue always starts on a new line. to: where each link goes. */
export function IssueTitleLinks({ numbers, titles, to }: {
  numbers: number[]
  titles: IssueTitles
  to: (n: number) => To
}) {
  return (
    <ul className="min-w-0 space-y-0.5">
      {numbers.map((n) => (
        <li key={n} className="break-words">
          <Link to={to(n)} className={linkClass}>{issueNumberTitle(titles, n)}</Link>
        </li>
      ))}
    </ul>
  )
}
