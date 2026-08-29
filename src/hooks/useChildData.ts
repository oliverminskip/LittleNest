import { useEffect, useMemo, useState } from 'react';
import { onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { paths } from '@/services/firebase/paths';
import { useCollection } from './useCollection';
import { todayKey } from '@/lib/dates';
import type { Attendance, DateKey, DiaryEntry, Message, Observation, OvertimeLog } from '@/types';

export function useEntries(settingId: string | undefined, childId: string | undefined) {
  const entriesQuery = useMemo(
    () =>
      settingId && childId
        ? query(paths.entries(settingId, childId), orderBy('createdAt', 'desc'))
        : null,
    [settingId, childId],
  );
  return useCollection<DiaryEntry>(entriesQuery, [settingId, childId]);
}

export function useObservations(settingId: string | undefined, childId: string | undefined) {
  const observationsQuery = useMemo(
    () =>
      settingId && childId
        ? query(paths.observations(settingId, childId), orderBy('createdAt', 'desc'))
        : null,
    [settingId, childId],
  );
  return useCollection<Observation>(observationsQuery, [settingId, childId]);
}

export function useMessages(settingId: string | undefined, childId: string | undefined) {
  const messagesQuery = useMemo(
    () =>
      settingId && childId
        ? query(paths.messages(settingId, childId), orderBy('createdAt'))
        : null,
    [settingId, childId],
  );
  return useCollection<Message>(messagesQuery, [settingId, childId]);
}

export function useOvertime(settingId: string | undefined, childId: string | undefined) {
  const overtimeQuery = useMemo(
    () =>
      settingId && childId
        ? query(paths.overtime(settingId, childId), orderBy('createdAt', 'desc'))
        : null,
    [settingId, childId],
  );
  return useCollection<OvertimeLog>(overtimeQuery, [settingId, childId]);
}

/**
 * Today's register for every child in one listener.
 *
 * A collection-group query would be tidier, but it needs a composite index and
 * a rule that can't express per-child parent access. Fanning out one listener
 * per child keeps the rules simple and the payloads tiny — a register document
 * is two timestamps.
 */
export function useAttendanceForDay(
  settingId: string | undefined,
  childIds: string[],
  dateKey: DateKey = todayKey(),
) {
  const [records, setRecords] = useState<Record<string, Attendance>>({});
  const key = childIds.join(',');

  useEffect(() => {
    if (!settingId || !childIds.length) {
      setRecords({});
      return;
    }

    const unsubscribes = childIds.map((childId) =>
      onSnapshot(
        query(paths.attendanceCollection(settingId, childId), where('date', '==', dateKey)),
        (snapshot) => {
          const record = snapshot.docs[0]?.data() as Attendance | undefined;
          setRecords((previous) => {
            if (!record) {
              if (!(childId in previous)) return previous;
              const { [childId]: _removed, ...rest } = previous;
              return rest;
            }
            return { ...previous, [childId]: record };
          });
        },
        () => undefined,
      ),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingId, key, dateKey]);

  return records;
}

/** Unread message counts per child, for the dashboard badges. */
export function useUnreadCounts(
  settingId: string | undefined,
  childIds: string[],
  role: 'minder' | 'parent',
) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = childIds.join(',');
  const field = role === 'minder' ? 'readByMinder' : 'readByParent';

  useEffect(() => {
    if (!settingId || !childIds.length) {
      setCounts({});
      return;
    }

    const unsubscribes = childIds.map((childId) =>
      onSnapshot(
        query(paths.messages(settingId, childId), where(field, '==', false)),
        (snapshot) => {
          // Messages the reader sent themselves are never "unread" for them.
          const incoming = snapshot.docs.filter((d) => d.data().from !== role).length;
          setCounts((previous) =>
            previous[childId] === incoming ? previous : { ...previous, [childId]: incoming },
          );
        },
        () => undefined,
      ),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingId, key, field, role]);

  return counts;
}
