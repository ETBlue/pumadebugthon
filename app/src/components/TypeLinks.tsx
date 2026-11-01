import { Link } from 'react-router'
import { t } from '@/i18n/zh-TW'
import { typeTabPath } from '@/lib/entityPaths'
import { TYPE_KINDS, type TypeKind } from '@/lib/typeKinds'
import type { CrossSolution, IndexFile, Solution } from '@/types'
import { Field } from './Field'
import { mutedTargetLinkClass, targetLinkClass } from './styles'

const tt = t.typeTags

/** Type names, each a link to its type page: a space page (design 3.6), a
 * 領域 page or a 解法類型 page (Task U3). types: the type list of the kind.
 * An unknown code keeps the code as its name. The codes keep the order given
 * (the order in the data), never sorted by a count.
 *
 * fromIssue: the codes are the 領域 that a solution takes from its issue
 * (decision 5 of plan-types-ui.md). The links use the muted color, and the
 * text 「（沿用議題）」 follows them. The text is visible, so screen readers
 * read it too. */
export function TypeLinks({ kind, types, codes, fromIssue = false }: {
  kind: TypeKind
  types: { code: string; name: string }[]
  codes: string[]
  fromIssue?: boolean
}) {
  const list = (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {codes.map((code) => (
        <li key={code}>
          <Link to={typeTabPath(kind, code, 'overview')} className={fromIssue ? mutedTargetLinkClass : targetLinkClass}>
            {types.find((s) => s.code === code)?.name ?? code}
          </Link>
        </li>
      ))}
    </ul>
  )
  if (!fromIssue) return list
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {list}
      <span className="text-muted-foreground">{tt.fromIssue}</span>
    </div>
  )
}

/** The three type lists of index.json. */
export type TypeLists = Pick<IndexFile, 'spaceTypes' | 'domainTypes' | 'solutionTypes'>

/** The codes of each kind on one issue or solution. A kind that is left out
 * or empty gets no row. */
export type TypeCodes = { [k in TypeKind]?: string[] }

/** The type tag rows of an issue or a solution, inside a <dl>: 空間類型,
 * 領域 and 解法類型, in this order (TYPE_KINDS, the menu order). A row with
 * no codes is left out. domainsFromIssue: see fromIssue in TypeLinks. */
export function TypeFields({ types, codes, domainsFromIssue = false }: {
  types: TypeLists
  codes: TypeCodes
  domainsFromIssue?: boolean
}) {
  const lists: { [k in TypeKind]: { code: string; name: string }[] } = {
    space: types.spaceTypes,
    domain: types.domainTypes,
    solutionType: types.solutionTypes,
  }
  return TYPE_KINDS.map((kind) => {
    const list = codes[kind] ?? []
    if (list.length === 0) return null
    return (
      <Field key={kind} label={tt[kind]}>
        <TypeLinks kind={kind} types={lists[kind]} codes={list} fromIssue={kind === 'domain' && domainsFromIssue} />
      </Field>
    )
  })
}

/** The type tag rows of a solution: an issue solution or an X- solution.
 * The 領域 of an issue solution with no own 領域 come from its issue, so
 * they are marked (decision 5 of plan-types-ui.md). An X- solution shows the
 * union of the 領域 of its parts. It has no ownDomains, so it is never
 * marked. */
export function SolutionTypeFields({ types, solution: sol }: { types: TypeLists; solution: Solution | CrossSolution }) {
  return (
    <TypeFields
      types={types}
      codes={{ space: sol.spaces, domain: sol.domains, solutionType: sol.solutionTypes }}
      domainsFromIssue={'ownDomains' in sol && sol.ownDomains.length === 0}
    />
  )
}
