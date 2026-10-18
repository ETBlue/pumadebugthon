import { Link } from 'react-router'
import { spaceTypeNames } from '@/lib/issues'
import type { SpaceType } from '@/types'
import { linkClass } from './styles'

/** Space type names, each a link to its space page (design 3.6). */
export function SpaceLinks({ spaceTypes, codes }: { spaceTypes: SpaceType[]; codes: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {spaceTypeNames(spaceTypes, codes).map((s) => (
        <li key={s.code}>
          <Link to={`/spaces/${s.code}`} className={linkClass}>{s.name}</Link>
        </li>
      ))}
    </ul>
  )
}
