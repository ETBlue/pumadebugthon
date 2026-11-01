import { Link } from 'react-router'
import { typeTabPath } from '@/lib/entityPaths'
import type { TypeKind } from '@/lib/typeKinds'
import { targetLinkClass } from './styles'

/** Type names, each a link to its type page: a space page (design 3.6), a
 * 領域 page or a 解法類型 page (Task U3). types: the type list of the kind.
 * An unknown code keeps the code as its name. */
export function TypeLinks({ kind, types, codes }: {
  kind: TypeKind
  types: { code: string; name: string }[]
  codes: string[]
}) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {codes.map((code) => (
        <li key={code}>
          <Link to={typeTabPath(kind, code, 'overview')} className={targetLinkClass}>
            {types.find((s) => s.code === code)?.name ?? code}
          </Link>
        </li>
      ))}
    </ul>
  )
}
