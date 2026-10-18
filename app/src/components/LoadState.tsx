import type { DataState } from '@/data'

/** The loading or error message of a DataState that is not ready. */
export function LoadState({ state }: { state: Exclude<DataState<unknown>, { status: 'ready' }> }) {
  if (state.status === 'error') {
    return <p role="alert" className="text-destructive">{state.message}</p>
  }
  return <p role="status" className="text-muted-foreground">{state.message}</p>
}
