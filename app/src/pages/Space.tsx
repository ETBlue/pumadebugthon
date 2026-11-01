import TypePage from './TypePage'

/** Space page (design 3.6): #/spaces/:code/:tab?, the type page with the
 * kind 'space'. The 領域 and 解法類型 pages use the same page body. */
export default function Space() {
  return <TypePage kind="space" />
}
