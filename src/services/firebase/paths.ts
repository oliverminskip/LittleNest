import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import { db } from './config';

/**
 * Every read and write goes through these helpers so the tenant boundary
 * (`settings/{settingId}/…`) can never be accidentally omitted at a call site.
 */
export const paths = {
  user: (uid: string): DocumentReference => doc(db, 'users', uid),
  settings: (): CollectionReference => collection(db, 'settings'),
  setting: (settingId: string): DocumentReference => doc(db, 'settings', settingId),

  children: (settingId: string): CollectionReference =>
    collection(db, 'settings', settingId, 'children'),
  child: (settingId: string, childId: string): DocumentReference =>
    doc(db, 'settings', settingId, 'children', childId),

  entries: (settingId: string, childId: string): CollectionReference =>
    collection(db, 'settings', settingId, 'children', childId, 'entries'),
  observations: (settingId: string, childId: string): CollectionReference =>
    collection(db, 'settings', settingId, 'children', childId, 'observations'),
  messages: (settingId: string, childId: string): CollectionReference =>
    collection(db, 'settings', settingId, 'children', childId, 'messages'),

  attendanceCollection: (settingId: string, childId: string): CollectionReference =>
    collection(db, 'settings', settingId, 'children', childId, 'attendance'),
  attendance: (settingId: string, childId: string, dateKey: string): DocumentReference =>
    doc(db, 'settings', settingId, 'children', childId, 'attendance', dateKey),

  overtime: (settingId: string, childId: string): CollectionReference =>
    collection(db, 'settings', settingId, 'children', childId, 'overtime'),

  invoices: (settingId: string): CollectionReference =>
    collection(db, 'settings', settingId, 'invoices'),
  invoice: (settingId: string, invoiceId: string): DocumentReference =>
    doc(db, 'settings', settingId, 'invoices', invoiceId),

  invite: (code: string): DocumentReference => doc(db, 'invites', code.toUpperCase()),
} as const;
