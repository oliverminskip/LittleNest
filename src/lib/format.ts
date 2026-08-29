const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (amount: number): string => gbp.format(Number.isFinite(amount) ? amount : 0);

/** Drops the pence on whole pounds — better for headline figures on the landing page. */
export function formatMoneyShort(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return Number.isInteger(safe) ? `£${safe}` : gbp.format(safe);
}

export const formatHours = (hours: number): string =>
  `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/0$/, '')}h`;

export const initialOf = (name: string): string => (name || '?').trim().charAt(0).toUpperCase() || '?';

export const firstName = (name: string | undefined): string => (name ?? '').trim().split(' ')[0] ?? '';

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Normalises a UK mobile into the international form wa.me expects. */
export function phoneForWhatsApp(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('07')) return `44${digits.slice(1)}`;
  if (digits.startsWith('44')) return digits;
  return digits;
}

export const pluralise = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/** `cn('a', false && 'b', 'c')` → `'a c'`. */
export const cn = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');
