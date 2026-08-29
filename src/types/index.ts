import type { Timestamp } from 'firebase/firestore';

/* ────────────────────────────────────────────────────────────
 * Shared primitives
 * ──────────────────────────────────────────────────────────── */

/** Firestore timestamps arrive as `Timestamp`, but are `null` for the brief
 *  window between an optimistic local write and the server round-trip. */
export type Stamp = Timestamp | null;

/** `YYYY-MM-DD`, always in local (UK) time — the key used for day documents. */
export type DateKey = string;

export type Role = 'minder' | 'parent';

/* ────────────────────────────────────────────────────────────
 * Tenancy: users, settings, children
 * ──────────────────────────────────────────────────────────── */

export interface UserProfile {
  role: Role;
  name: string;
  email: string;
  settingId: string;
  /** Parents only — the children they have redeemed an invite code for. */
  childIds?: string[];
  createdAt?: Stamp;
}

export interface Setting {
  id: string;
  name: string;
  minderUid: string;
  /** Ofsted URN, shown on invoices and the register export. */
  ofstedUrn?: string;
  addressLines?: string[];
  billing?: BillingDefaults;
  ratioLimits?: RatioLimits;
  createdAt?: Stamp;
}

export interface BillingDefaults {
  hourlyRate: number;
  dailyRate?: number;
  /** Charged per funded session to cover meals/nappies/outings (lawful top-up). */
  consumablesPerDay: number;
  mealsPerDay: number;
  /** What the local authority pays the setting per funded hour. */
  fundedHourlyRate: number;
  /** Overtime is billed at this multiple of `hourlyRate`. */
  lateMultiplier: number;
  invoiceFootnote?: string;
}

export interface Child {
  id: string;
  name: string;
  /** ISO `YYYY-MM-DD`. Legacy records may hold `DD/MM/YYYY` — see `parseDob`. */
  dob: string;
  colour: string;
  parentUids: string[];
  parentEmails: string[];
  setupCode: string;
  /** Contracted pattern, used by the ratio timeline and the invoice ledger. */
  schedule?: WeeklySchedule;
  funding?: FundingProfile;
  billing?: Partial<BillingDefaults>;
  parentName?: string;
  parentPhone?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  medicalNotes?: string;
  archivedAt?: Stamp;
  createdAt?: Stamp;
}

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduledSession {
  /** `HH:mm`, 24-hour. */
  start: string;
  end: string;
}

export type WeeklySchedule = Partial<Record<Weekday, ScheduledSession>>;

/* ────────────────────────────────────────────────────────────
 * Government funded hours
 * ──────────────────────────────────────────────────────────── */

/** Weekly entitlement in term-time hours. */
export type EntitlementHours = 0 | 15 | 30;

export type FundingModel = 'term-time' | 'stretched';

export interface FundingProfile {
  entitlement: EntitlementHours;
  model: FundingModel;
  /** Weeks the annual allocation is spread across when `model` is stretched. */
  stretchWeeks: number;
  /** Funded weeks per year — 38 for the statutory term-time offer. */
  fundedWeeksPerYear: number;
  startedOn?: DateKey;
}

/* ────────────────────────────────────────────────────────────
 * Daily records
 * ──────────────────────────────────────────────────────────── */

export type EntryType = 'meal' | 'nap' | 'nappy' | 'bottle' | 'activity' | 'mood' | 'note' | 'photo';

export interface DiaryEntry {
  id: string;
  type: EntryType;
  detail: string;
  /** `HH:mm` — naps and other bracketed events. */
  startTime?: string;
  endTime?: string;
  portion?: string;
  photoUrl?: string;
  photoPath?: string;
  /** Set when the entry was written as part of a multi-child batch. */
  batchId?: string;
  createdAt: Stamp;
  createdBy?: string;
}

export interface Attendance {
  date: DateKey;
  signInAt: Stamp;
  signOutAt: Stamp;
  /** Contracted session for the day, snapshotted so later schedule edits
   *  cannot rewrite a signed register. */
  plannedStart?: string;
  plannedEnd?: string;
  absent?: boolean;
  absenceReason?: string;
}

export type OvertimeReason = 'late-pickup' | 'early-drop' | 'extra-session' | 'other';

export interface OvertimeLog {
  id: string;
  date: DateKey;
  minutes: number;
  reason: OvertimeReason;
  note?: string;
  rate: number;
  /** Set once the entry has been rolled into an issued invoice. */
  invoicedIn?: string;
  createdAt: Stamp;
}

export interface Observation {
  id: string;
  title: string;
  note: string;
  areas: EyfsAreaKey[];
  nextSteps?: string;
  photoUrl?: string;
  photoPath?: string;
  createdAt: Stamp;
}

export type EyfsAreaKey = 'cl' | 'pd' | 'psed' | 'lit' | 'ma' | 'utw' | 'ead';

export interface Message {
  id: string;
  from: Role;
  text: string;
  createdAt: Stamp;
  readByMinder?: boolean;
  readByParent?: boolean;
}

/* ────────────────────────────────────────────────────────────
 * Invoicing
 * ──────────────────────────────────────────────────────────── */

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue';

export interface InvoiceLine {
  label: string;
  detail?: string;
  quantity: number;
  unit: 'hours' | 'sessions' | 'days' | 'items';
  unitPrice: number;
  total: number;
  /** Funded lines are shown at £0 so parents can see the value they received. */
  funded?: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  childId: string;
  childName: string;
  periodStart: DateKey;
  periodEnd: DateKey;
  lines: InvoiceLine[];
  subtotal: number;
  fundedValue: number;
  total: number;
  status: InvoiceStatus;
  dueDate: DateKey;
  notes?: string;
  createdAt: Stamp;
}

/* ────────────────────────────────────────────────────────────
 * Ratios
 * ──────────────────────────────────────────────────────────── */

export interface RatioLimits {
  /** Statutory England defaults for a childminder working alone. */
  underOne: number;
  underFive: number;
  underEight: number;
}

export interface RatioBreach {
  band: keyof RatioLimits;
  count: number;
  limit: number;
  /** Minutes from midnight where the breach starts and ends. */
  from: number;
  to: number;
}

export interface CapacityOpening {
  band: keyof RatioLimits;
  date: Date;
  childName: string;
  reason: string;
}

export interface Invite {
  code: string;
  settingId: string;
  childId: string;
  childName: string;
  status: 'pending' | 'used';
  usedBy?: string;
  usedAt?: Stamp;
  createdAt?: Stamp;
}
