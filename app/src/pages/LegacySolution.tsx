import { Navigate, useLocation, useParams } from 'react-router'
import { legacySolutionTarget } from '@/lib/entityPaths'
import Placeholder from '@/pages/Placeholder'

/** The old solution URL #/issues/:number/solutions/:code/:tab? (shared on
 * Discord) goes to #/solutions/<n>-<code>/<tab>, with the query kept
 * (design 3.12). replace: the back button does not loop. */
export default function LegacySolution() {
  const { number, code, tab } = useParams()
  const { search } = useLocation()
  const target = legacySolutionTarget(number, code, tab, search)
  return target ? <Navigate replace to={target} /> : <Placeholder />
}
