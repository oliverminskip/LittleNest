import { calculateFunding, fundedHoursPerWeek, type FundingInput } from './funding';
import { fromDateKey, timeToMinutes, toDateKey } from './dates';
import { DEFAULT_BILLING, FUNDED_WEEKS_PER_YEAR } from './constants';
import type {
  Attendance,
  BillingDefaults,
  Child,
  DateKey,
  Invoice,
  InvoiceLine,
  OvertimeLog,
  Weekday,
} from '@/types';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface InvoiceDraftInput {
  child: Child;
  periodStart: DateKey;
  periodEnd: DateKey;
  billing: BillingDefaults;
  /** Signed register for the period — drives actual attended hours. */
  attendance: Attendance[];
  /** Ad-hoc overtime punches not yet rolled into an issued invoice. */
  overtime: OvertimeLog[];
  /** Fall back to the contracted schedule when the register is empty
   *  (e.g. invoicing a month in advance, which most minders do). */
  useSchedule?: boolean;
  notes?: string;
}

/** Contracted hours for one week from the child's schedule. */
export function contractedWeeklyHours(child: Child): { hours: number; days: number } {
  const sessions = Object.values(child.schedule ?? {});
  const minutes = sessions.reduce((sum, session) => {
    const start = timeToMinutes(session?.start);
    const end = timeToMinutes(session?.end);
    if (start === null || end === null || end <= start) return sum;
    return sum + (end - start);
  }, 0);
  return { hours: round2(minutes / 60), days: sessions.length };
}

/** Attended hours and days actually signed for across the period. */
export function attendedHours(records: Attendance[]): { hours: number; days: number } {
  let minutes = 0;
  let days = 0;

  records.forEach((record) => {
    const inAt = record.signInAt?.toDate?.();
    const outAt = record.signOutAt?.toDate?.();
    if (!inAt || !outAt || outAt <= inAt) return;
    minutes += (outAt.getTime() - inAt.getTime()) / 60000;
    days += 1;
  });

  return { hours: round2(minutes / 60), days };
}

function countWeeksBetween(start: DateKey, end: DateKey): number {
  const days = (fromDateKey(end).getTime() - fromDateKey(start).getTime()) / 86_400_000 + 1;
  return Math.max(1, round2(days / 7));
}

/**
 * Builds the invoice line items for a billing period.
 *
 * Funded hours are listed at £0 rather than netted off silently, because
 * parents must be able to see the value of the entitlement they received —
 * and because an invoice that hides it looks, to an auditor, like a top-up
 * charged as a condition of the funded place.
 */
export function buildInvoiceLines(input: InvoiceDraftInput): {
  lines: InvoiceLine[];
  subtotal: number;
  fundedValue: number;
  total: number;
} {
  const { child, billing, attendance, overtime, periodStart, periodEnd } = input;
  const weeks = countWeeksBetween(periodStart, periodEnd);

  const contracted = contractedWeeklyHours(child);
  const attended = attendedHours(attendance);

  const useSchedule = input.useSchedule ?? attended.days === 0;
  const periodHours = useSchedule ? round2(contracted.hours * weeks) : attended.hours;
  const periodDays = useSchedule ? Math.round(contracted.days * weeks) : attended.days;

  const funding = child.funding;
  const weeklyFunded = funding
    ? fundedHoursPerWeek(funding.entitlement, funding.model, funding.stretchWeeks)
    : 0;
  const fundedAvailable = round2(weeklyFunded * weeks);
  const fundedUsed = round2(Math.min(fundedAvailable, periodHours));
  const chargeableHours = round2(Math.max(0, periodHours - fundedUsed));

  const lines: InvoiceLine[] = [];

  if (fundedUsed > 0) {
    lines.push({
      label: 'Government funded hours',
      detail:
        funding?.model === 'stretched'
          ? `${funding.entitlement}h × ${FUNDED_WEEKS_PER_YEAR} weeks stretched over ${funding.stretchWeeks} weeks`
          : `${funding?.entitlement ?? 0}h a week, term-time`,
      quantity: fundedUsed,
      unit: 'hours',
      unitPrice: 0,
      total: 0,
      funded: true,
    });
  }

  if (chargeableHours > 0) {
    lines.push({
      label: 'Childcare hours',
      detail: useSchedule ? 'Contracted hours' : 'Hours attended (signed register)',
      quantity: chargeableHours,
      unit: 'hours',
      unitPrice: billing.hourlyRate,
      total: round2(chargeableHours * billing.hourlyRate),
    });
  }

  if (billing.mealsPerDay > 0 && periodDays > 0) {
    lines.push({
      label: 'Meals',
      detail: 'Breakfast, lunch, tea and snacks — optional',
      quantity: periodDays,
      unit: 'days',
      unitPrice: billing.mealsPerDay,
      total: round2(periodDays * billing.mealsPerDay),
    });
  }

  if (billing.consumablesPerDay > 0 && periodDays > 0) {
    lines.push({
      label: 'Consumables',
      detail: 'Nappies, wipes, craft materials and outings — optional',
      quantity: periodDays,
      unit: 'days',
      unitPrice: billing.consumablesPerDay,
      total: round2(periodDays * billing.consumablesPerDay),
    });
  }

  const overtimeMinutes = overtime.reduce((sum, log) => sum + log.minutes, 0);
  if (overtimeMinutes > 0) {
    const hours = round2(overtimeMinutes / 60);
    const rate = round2(billing.hourlyRate * billing.lateMultiplier);
    lines.push({
      label: 'Ad-hoc & overtime',
      detail: `${overtime.length} unplanned extension${overtime.length === 1 ? '' : 's'} at ${billing.lateMultiplier}× the hourly rate`,
      quantity: hours,
      unit: 'hours',
      unitPrice: rate,
      total: round2(hours * rate),
    });
  }

  const subtotal = round2(lines.reduce((sum, line) => sum + line.total, 0));
  const fundedValue = round2(fundedUsed * billing.hourlyRate);

  return { lines, subtotal, fundedValue, total: subtotal };
}

export function nextInvoiceNumber(existing: Invoice[], on: Date = new Date()): string {
  const prefix = `LN-${on.getFullYear()}${String(on.getMonth() + 1).padStart(2, '0')}`;
  const sequence =
    existing.filter((invoice) => invoice.number.startsWith(prefix)).length + 1;
  return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

export function draftInvoice(
  input: InvoiceDraftInput,
  number: string,
  dueInDays = 14,
): Omit<Invoice, 'id' | 'createdAt'> {
  const { lines, subtotal, fundedValue, total } = buildInvoiceLines(input);
  const due = fromDateKey(input.periodEnd);
  due.setDate(due.getDate() + dueInDays);

  return {
    number,
    childId: input.child.id,
    childName: input.child.name,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    lines,
    subtotal,
    fundedValue,
    total,
    status: 'draft',
    dueDate: toDateKey(due),
    // Firestore rejects `undefined` field values, so an empty note is an
    // absent key rather than an undefined one.
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  };
}

/** Turns a child's stored settings into calculator input, so the in-app
 *  numbers and the public landing-page calculator can never drift apart. */
export function fundingInputForChild(child: Child, billing: BillingDefaults = DEFAULT_BILLING): FundingInput {
  const contracted = contractedWeeklyHours(child);
  const funding = child.funding;
  return {
    weeklyHours: contracted.hours,
    daysPerWeek: contracted.days,
    entitlement: funding?.entitlement ?? 0,
    model: funding?.model ?? 'term-time',
    stretchWeeks: funding?.stretchWeeks ?? 51,
    attendanceWeeks: funding?.model === 'stretched' ? (funding.stretchWeeks ?? 51) : FUNDED_WEEKS_PER_YEAR,
    hourlyRate: child.billing?.hourlyRate ?? billing.hourlyRate,
    mealsPerDay: child.billing?.mealsPerDay ?? billing.mealsPerDay,
    consumablesPerDay: child.billing?.consumablesPerDay ?? billing.consumablesPerDay,
    fundedHourlyRate: child.billing?.fundedHourlyRate ?? billing.fundedHourlyRate,
  };
}

export const previewFundingForChild = (child: Child, billing?: BillingDefaults) =>
  calculateFunding(fundingInputForChild(child, billing));

/** Weekday index for a date key, typed for the schedule lookup. */
export const weekdayOf = (key: DateKey): Weekday => fromDateKey(key).getDay() as Weekday;
