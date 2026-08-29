import { FUNDED_WEEKS_PER_YEAR } from './constants';
import type { EntitlementHours, FundingModel } from '@/types';

/**
 * UK government funded childcare hours.
 *
 * The entitlement is expressed as N hours a week over 38 term-time weeks —
 * that is the only number the local authority actually pays for. Parents may
 * "stretch" the same annual allocation over more weeks so they get a smaller
 * weekly amount but keep their place through the holidays:
 *
 *     annual funded hours   = entitlement × 38
 *     stretched weekly hours = annual funded hours ÷ stretch weeks
 *
 * Everything the child attends beyond their funded hours is chargeable at the
 * setting's hourly rate. Top-ups for meals and consumables are lawful as long
 * as they are optional and not a condition of the funded place — the
 * calculator keeps them on separate lines so an invoice makes that explicit.
 */

export interface FundingInput {
  /** Hours the child actually attends in a normal week. */
  weeklyHours: number;
  daysPerWeek: number;
  entitlement: EntitlementHours;
  model: FundingModel;
  /** Weeks the annual allocation is spread across when stretching. */
  stretchWeeks: number;
  /** Weeks a year the child attends — drives the monthly average. */
  attendanceWeeks: number;
  hourlyRate: number;
  mealsPerDay: number;
  consumablesPerDay: number;
  /** What the LA pays the setting per funded hour. Optional — income view only. */
  fundedHourlyRate?: number;
}

export interface FundingResult {
  /** Funded hours available in a single week under the chosen model. */
  fundedHoursPerWeek: number;
  /** Funded hours the child can actually use — capped by hours attended. */
  fundedHoursUsed: number;
  chargeableHours: number;
  chargeableCost: number;
  mealsCost: number;
  consumablesCost: number;
  weeklyParentCost: number;
  monthlyParentCost: number;
  annualParentCost: number;
  /** Money the setting receives from the LA for the funded hours. */
  weeklyFundingIncome: number;
  weeklyTotalIncome: number;
  monthlyTotalIncome: number;
  /** What the same week would have cost the parent with no funding at all. */
  weeklySavings: number;
  annualSavings: number;
  /** True when the entitlement exceeds the hours the child attends. */
  unusedEntitlement: number;
}

export const DEFAULT_FUNDING_INPUT: FundingInput = {
  weeklyHours: 30,
  daysPerWeek: 4,
  entitlement: 30,
  model: 'stretched',
  stretchWeeks: 51,
  attendanceWeeks: 51,
  hourlyRate: 6.5,
  mealsPerDay: 3.5,
  consumablesPerDay: 3,
  fundedHourlyRate: 5.62,
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clampPositive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Weekly funded hours for a model — term-time pays in full, stretched spreads. */
export function fundedHoursPerWeek(
  entitlement: EntitlementHours,
  model: FundingModel,
  stretchWeeks: number,
): number {
  if (!entitlement) return 0;
  if (model === 'term-time') return entitlement;
  const weeks = clampPositive(stretchWeeks) || FUNDED_WEEKS_PER_YEAR;
  return round2((entitlement * FUNDED_WEEKS_PER_YEAR) / weeks);
}

export function calculateFunding(input: FundingInput): FundingResult {
  const weeklyHours = clampPositive(input.weeklyHours);
  const daysPerWeek = clampPositive(input.daysPerWeek);
  const hourlyRate = clampPositive(input.hourlyRate);
  const attendanceWeeks = clampPositive(input.attendanceWeeks) || 51;

  const available = fundedHoursPerWeek(input.entitlement, input.model, input.stretchWeeks);
  const fundedHoursUsed = round2(Math.min(available, weeklyHours));
  const chargeableHours = round2(Math.max(0, weeklyHours - fundedHoursUsed));

  const chargeableCost = round2(chargeableHours * hourlyRate);
  const mealsCost = round2(daysPerWeek * clampPositive(input.mealsPerDay));
  const consumablesCost = round2(daysPerWeek * clampPositive(input.consumablesPerDay));

  const weeklyParentCost = round2(chargeableCost + mealsCost + consumablesCost);
  const annualParentCost = round2(weeklyParentCost * attendanceWeeks);
  // Monthly is the annual bill divided evenly, which is how minders bill by
  // standing order — not "one week × 4", which under-collects every year.
  const monthlyParentCost = round2(annualParentCost / 12);

  const weeklyFundingIncome = round2(fundedHoursUsed * clampPositive(input.fundedHourlyRate ?? 0));
  const weeklyTotalIncome = round2(weeklyParentCost + weeklyFundingIncome);
  const monthlyTotalIncome = round2((weeklyTotalIncome * attendanceWeeks) / 12);

  const weeklySavings = round2(fundedHoursUsed * hourlyRate);

  return {
    fundedHoursPerWeek: available,
    fundedHoursUsed,
    chargeableHours,
    chargeableCost,
    mealsCost,
    consumablesCost,
    weeklyParentCost,
    monthlyParentCost,
    annualParentCost,
    weeklyFundingIncome,
    weeklyTotalIncome,
    monthlyTotalIncome,
    weeklySavings,
    annualSavings: round2(weeklySavings * attendanceWeeks),
    unusedEntitlement: round2(Math.max(0, available - weeklyHours)),
  };
}

/** Plain-English summary used on the landing page and at the top of an invoice. */
export function describeFunding(input: FundingInput, result: FundingResult): string {
  if (!input.entitlement) {
    return `No funded hours claimed — all ${input.weeklyHours}h a week are chargeable.`;
  }
  if (input.model === 'term-time') {
    return `${input.entitlement}h a week of funded care during the ${FUNDED_WEEKS_PER_YEAR} term-time weeks, charged in full through the holidays.`;
  }
  return `${input.entitlement}h × ${FUNDED_WEEKS_PER_YEAR} weeks stretched over ${input.stretchWeeks} weeks — ${result.fundedHoursPerWeek}h funded every week, all year.`;
}
