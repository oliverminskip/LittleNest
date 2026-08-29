import {
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { paths } from './paths';
import { todayKey } from '@/lib/dates';
import { DEFAULT_BILLING, DEFAULT_RATIO_LIMITS } from '@/lib/constants';
import type {
  Attendance,
  Child,
  DateKey,
  DiaryEntry,
  Invoice,
  Message,
  Observation,
  OvertimeLog,
  OvertimeReason,
  Role,
  Setting,
} from '@/types';

/* ── Settings ─────────────────────────────────────────────── */

export async function getSetting(settingId: string): Promise<Setting | null> {
  const snap = await getDoc(paths.setting(settingId));
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Setting, 'id'>;
  return {
    ...data,
    id: snap.id,
    billing: { ...DEFAULT_BILLING, ...(data.billing ?? {}) },
    ratioLimits: { ...DEFAULT_RATIO_LIMITS, ...(data.ratioLimits ?? {}) },
  };
}

export const updateSetting = (settingId: string, patch: Partial<Setting>) =>
  updateDoc(paths.setting(settingId), patch);

/* ── Children ─────────────────────────────────────────────── */

export function generateSetupCode(): string {
  // Ambiguous glyphs (0/O, 1/I) are excluded — these get read aloud at doorsteps.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const body = Array.from({ length: 4 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('');
  return `LN-${body}`;
}

export async function createChild(
  settingId: string,
  child: Pick<Child, 'name' | 'dob' | 'colour'> & Partial<Child>,
): Promise<{ id: string; setupCode: string }> {
  const setupCode = generateSetupCode();

  const ref = await addDoc(paths.children(settingId), {
    ...child,
    name: child.name.trim(),
    parentUids: [],
    parentEmails: [],
    setupCode,
    createdAt: serverTimestamp(),
  });

  await setDoc(paths.invite(setupCode), {
    settingId,
    childId: ref.id,
    childName: child.name.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return { id: ref.id, setupCode };
}

export const updateChild = (settingId: string, childId: string, patch: Partial<Child>) =>
  updateDoc(paths.child(settingId, childId), patch);

export async function deleteChild(settingId: string, child: Child): Promise<void> {
  await deleteDoc(paths.child(settingId, child.id));
  if (child.setupCode) await deleteDoc(paths.invite(child.setupCode)).catch(() => undefined);
}

export async function getChild(settingId: string, childId: string): Promise<Child | null> {
  const snap = await getDoc(paths.child(settingId, childId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Child) : null;
}

/* ── Attendance ───────────────────────────────────────────── */

export const signInChild = (settingId: string, childId: string, dateKey: DateKey = todayKey()) =>
  setDoc(
    paths.attendance(settingId, childId, dateKey),
    { date: dateKey, signInAt: serverTimestamp(), signOutAt: null },
    { merge: true },
  );

export const signOutChild = (settingId: string, childId: string, dateKey: DateKey = todayKey()) =>
  setDoc(
    paths.attendance(settingId, childId, dateKey),
    { date: dateKey, signOutAt: serverTimestamp() },
    { merge: true },
  );

export const undoSignOut = (settingId: string, childId: string, dateKey: DateKey = todayKey()) =>
  updateDoc(paths.attendance(settingId, childId, dateKey), { signOutAt: null });

export async function getAttendanceRange(
  settingId: string,
  childId: string,
  start: DateKey,
  end: DateKey,
): Promise<Attendance[]> {
  const snap = await getDocs(
    query(
      paths.attendanceCollection(settingId, childId),
      where('date', '>=', start),
      where('date', '<=', end),
    ),
  );
  return snap.docs.map((d) => d.data() as Attendance);
}

/* ── Diary entries ────────────────────────────────────────── */

export type NewEntry = Omit<DiaryEntry, 'id' | 'createdAt'>;

export const addEntry = (settingId: string, childId: string, entry: NewEntry) =>
  addDoc(paths.entries(settingId, childId), { ...entry, createdAt: serverTimestamp() });

/**
 * One-handed batch logging.
 *
 * Writes the same entry to several children in a single atomic `writeBatch`,
 * which is what makes "log lunch for all five" a single tap that either fully
 * lands or fully fails — never four children fed and one missed. A shared
 * `batchId` lets the diary group them and lets a mis-tap be undone as a unit.
 */
export async function addEntryToMany(
  settingId: string,
  childIds: string[],
  entry: NewEntry,
): Promise<string> {
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const batch = writeBatch(db);

  childIds.forEach((childId) => {
    batch.set(doc(paths.entries(settingId, childId)), {
      ...entry,
      batchId,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return batchId;
}

/** Undoes a batch by deleting every entry that carries its id. */
export async function undoBatch(
  settingId: string,
  childIds: string[],
  batchId: string,
): Promise<void> {
  const batch = writeBatch(db);

  const found = await Promise.all(
    childIds.map((childId) =>
      getDocs(query(paths.entries(settingId, childId), where('batchId', '==', batchId))),
    ),
  );
  found.forEach((snap) => snap.docs.forEach((entry) => batch.delete(entry.ref)));

  await batch.commit();
}

export const deleteEntry = (settingId: string, childId: string, entryId: string) =>
  deleteDoc(doc(paths.entries(settingId, childId), entryId));

/* ── Observations ─────────────────────────────────────────── */

export const addObservation = (
  settingId: string,
  childId: string,
  observation: Omit<Observation, 'id' | 'createdAt'>,
) => addDoc(paths.observations(settingId, childId), { ...observation, createdAt: serverTimestamp() });

/* ── Messages ─────────────────────────────────────────────── */

export const sendMessage = (settingId: string, childId: string, from: Role, text: string) =>
  addDoc(paths.messages(settingId, childId), {
    from,
    text: text.trim(),
    createdAt: serverTimestamp(),
    readByMinder: from === 'minder',
    readByParent: from === 'parent',
  } satisfies Omit<Message, 'id' | 'createdAt'> & { createdAt: unknown });

/** Clears the unread flag for whichever side just opened the thread. */
export async function markThreadRead(
  settingId: string,
  childId: string,
  role: Role,
): Promise<void> {
  const field = role === 'minder' ? 'readByMinder' : 'readByParent';
  const unread = await getDocs(query(paths.messages(settingId, childId), where(field, '==', false)));
  if (unread.empty) return;

  const batch = writeBatch(db);
  unread.docs.forEach((message) => batch.update(message.ref, { [field]: true }));
  await batch.commit();
}

/* ── Overtime ─────────────────────────────────────────────── */

export const punchOvertime = (
  settingId: string,
  childId: string,
  minutes: number,
  rate: number,
  reason: OvertimeReason = 'late-pickup',
  note?: string,
) =>
  addDoc(paths.overtime(settingId, childId), {
    date: todayKey(),
    minutes,
    reason,
    rate,
    ...(note ? { note } : {}),
    createdAt: serverTimestamp(),
  });

export const deleteOvertime = (settingId: string, childId: string, logId: string) =>
  deleteDoc(doc(paths.overtime(settingId, childId), logId));

/** Overtime in a period that has not already been billed. */
export async function getUninvoicedOvertime(
  settingId: string,
  childId: string,
  start: DateKey,
  end: DateKey,
): Promise<OvertimeLog[]> {
  const snap = await getDocs(
    query(paths.overtime(settingId, childId), where('date', '>=', start), where('date', '<=', end)),
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as OvertimeLog)
    .filter((log) => !log.invoicedIn);
}

/* ── Invoices ─────────────────────────────────────────────── */

export async function saveInvoice(
  settingId: string,
  invoice: Omit<Invoice, 'id' | 'createdAt'>,
  overtimeIds: { childId: string; logId: string }[] = [],
): Promise<string> {
  const ref = await addDoc(paths.invoices(settingId), {
    ...invoice,
    createdAt: serverTimestamp(),
  });

  // Stamp the overtime so the same late pickup can never be billed twice.
  if (overtimeIds.length) {
    const batch = writeBatch(db);
    overtimeIds.forEach(({ childId, logId }) => {
      batch.update(doc(paths.overtime(settingId, childId), logId), { invoicedIn: ref.id });
    });
    await batch.commit();
  }

  return ref.id;
}

export const updateInvoiceStatus = (settingId: string, invoiceId: string, status: Invoice['status']) =>
  updateDoc(paths.invoice(settingId, invoiceId), { status });

export async function listInvoices(settingId: string): Promise<Invoice[]> {
  const snap = await getDocs(paths.invoices(settingId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice);
}
