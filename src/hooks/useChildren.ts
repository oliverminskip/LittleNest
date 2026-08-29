import { useMemo } from 'react';
import { orderBy, query, where } from 'firebase/firestore';
import { paths } from '@/services/firebase/paths';
import { useCollection } from './useCollection';
import type { Child, Role } from '@/types';

/**
 * The setting's children.
 *
 * A parent may only read the children they are linked to, so the query is
 * narrowed with `array-contains` on `parentUids` — which matches the Firestore
 * rule exactly. Sending the unfiltered query as a parent would be rejected
 * outright rather than silently filtered, so the shape matters.
 */
export function useChildren(settingId: string | undefined, role: Role, uid?: string) {
  const childrenQuery = useMemo(() => {
    if (!settingId) return null;
    if (role === 'parent') {
      if (!uid) return null;
      return query(paths.children(settingId), where('parentUids', 'array-contains', uid));
    }
    return query(paths.children(settingId), orderBy('createdAt'));
  }, [settingId, role, uid]);

  return useCollection<Child>(childrenQuery, [settingId, role, uid]);
}
