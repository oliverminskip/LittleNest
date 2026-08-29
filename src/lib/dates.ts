import type { DateKey, Stamp } from '@/types';

/* ── Keys ─────────────────────────────────────────────────── */

/** Local-time `YYYY-MM-DD`. Deliberately not `toISOString()`, which is UTC and
 *  silently shifts a 00:30 BST sign-in into the previous day. */
export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const todayKey = (): DateKey => toDateKey(new Date());

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The last `count` days ending today, oldest first. */
export function recentDays(count: number): Date[] {
  const out: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(addDays(new Date(), -i));
  return out;
}

/* ── Timestamps ───────────────────────────────────────────── */

export function stampToDate(stamp: Stamp | undefined): Date | null {
  if (!stamp) return null;
  return typeof stamp.toDate === 'function' ? stamp.toDate() : null;
}

export function formatTime(stamp: Stamp | Date | undefined): string {
  const date = stamp instanceof Date ? stamp : stampToDate(stamp);
  if (!date) return '—';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(stamp: Stamp | Date | undefined): string {
  const date = stamp instanceof Date ? stamp : stampToDate(stamp);
  if (!date) return '—';
  if (toDateKey(date) === todayKey()) return 'Today';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function dateKeyOfStamp(stamp: Stamp | undefined): DateKey | null {
  const date = stampToDate(stamp);
  return date ? toDateKey(date) : null;
}

/* ── Ages ─────────────────────────────────────────────────── */

/** Accepts ISO `YYYY-MM-DD` and the legacy single-file app's `DD/MM/YYYY`. */
export function parseDob(dob: string | undefined): Date | null {
  if (!dob) return null;
  const iso = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const uk = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (uk) return new Date(Number(uk[3]), Number(uk[2]) - 1, Number(uk[1]));
  return null;
}

export function ageInMonths(dob: string | undefined, on: Date = new Date()): number | null {
  const birth = parseDob(dob);
  if (!birth) return null;
  let months = (on.getFullYear() - birth.getFullYear()) * 12 + (on.getMonth() - birth.getMonth());
  if (on.getDate() < birth.getDate()) months -= 1;
  return months < 0 ? null : months;
}

export function ageInYears(dob: string | undefined, on: Date = new Date()): number | null {
  const months = ageInMonths(dob, on);
  return months === null ? null : Math.floor(months / 12);
}

export function formatAge(dob: string | undefined, on: Date = new Date()): string {
  const months = ageInMonths(dob, on);
  if (months === null) return '';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years > 0 ? `${years}y ${rest}m` : `${rest}m`;
}

/** The date a child turns `years` — used to project when ratio spaces free up. */
export function birthdayOn(dob: string | undefined, years: number): Date | null {
  const birth = parseDob(dob);
  if (!birth) return null;
  return new Date(birth.getFullYear() + years, birth.getMonth(), birth.getDate());
}

/* ── Clock helpers for the ratio timeline ─────────────────── */

/** `"08:30"` → `510`. Returns `null` for anything unparseable. */
export function timeToMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Rounds to the nearest quarter hour — the granularity minders actually bill in. */
export const snapToQuarter = (minutes: number): number => Math.round(minutes / 15) * 15;

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
