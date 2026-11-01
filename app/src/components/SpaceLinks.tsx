import type { SpaceType } from '@/types'
import { TypeLinks } from './TypeLinks'

/** Space type names, each a link to its space page (design 3.6). */
export function SpaceLinks({ spaceTypes, codes }: { spaceTypes: SpaceType[]; codes: string[] }) {
  return <TypeLinks kind="space" types={spaceTypes} codes={codes} />
}
