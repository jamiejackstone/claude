import { useSyncExternalStore } from 'react';
import { withTrackedParams, type TrackedParams } from './clickTracking';

const EMPTY: TrackedParams = {};
let current: TrackedParams = EMPTY;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called from a useEffect after click ids have been read from the browser. */
export function publishTrackedParams(params: TrackedParams): void {
  current = params;
  for (const listener of listeners) listener();
}

/** Href with click ids. The prerender and the first client render stay untracked. */
export function useTrackedHref(url: string): string {
  const tracked = useSyncExternalStore(subscribe, () => current, () => EMPTY);
  return withTrackedParams(url, tracked);
}
