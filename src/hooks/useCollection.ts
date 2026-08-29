import { useEffect, useMemo, useState } from 'react';
import {
  onSnapshot,
  type DocumentData,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';

export interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  /** True while the local cache is showing data that has not reached the server. */
  fromCache: boolean;
}

/**
 * Subscribes to a Firestore query and maps each document to `{ id, ...data }`.
 *
 * `fromCache` is surfaced deliberately: offline, snapshots resolve instantly
 * from IndexedDB, and the UI needs to be able to say "saved on this device,
 * syncing when you're back" rather than pretending the write reached the
 * server.
 */
export function useCollection<T extends { id: string }>(
  buildQuery: Query<DocumentData> | null,
  deps: unknown[] = [],
): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: true,
    error: null,
    fromCache: false,
  });

  // The query object is rebuilt on every render by callers, so the effect keys
  // off explicit deps instead of the reference.
  const query = useMemo(() => buildQuery, deps);

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null, fromCache: false });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, error: null }));

    return onSnapshot(
      query,
      { includeMetadataChanges: true },
      (snapshot: QuerySnapshot<DocumentData>) => {
        setState({
          data: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          loading: false,
          error: null,
          fromCache: snapshot.metadata.fromCache,
        });
      },
      (error) => setState({ data: [], loading: false, error, fromCache: false }),
    );
  }, [query]);

  return state;
}
