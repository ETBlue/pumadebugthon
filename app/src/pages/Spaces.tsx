import TypeList from './TypeList'

/** #/spaces (design 3.9, decisions 120 and 122): the type list page with the
 * kind 'space'. #/domains and #/solution-types use the same page body. */
export default function Spaces() {
  return <TypeList kind="space" />
}
