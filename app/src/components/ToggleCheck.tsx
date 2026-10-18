import { Check } from 'lucide-react'

/** A check mark shown only when the parent toggle is on, so the state is not
 * shown by color only. Use it inside Toggle or ToggleGroupItem. */
export function ToggleCheck() {
  return <Check aria-hidden="true" className="hidden group-data-[state=on]/toggle:block" />
}
