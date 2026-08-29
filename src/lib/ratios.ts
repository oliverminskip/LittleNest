import { ageInYears, birthdayOn, timeToMinutes } from './dates';
import { DEFAULT_RATIO_LIMITS } from './constants';
import type { CapacityOpening, Child, RatioBreach, RatioLimits, Weekday } from '@/types';

/**
 * Ofsted ratio maths for a childminder working alone (England, EYFS framework).
 *
 * A childminder may care for a maximum of six children under eight. Within
 * that six, no more than three may be under five, and normally no more than
 * one may be under one. The bands nest: an under-one also counts toward the
 * under-five and under-eight totals, so a breach in the tightest band does not
 * excuse the wider ones.
 *
 * Continuity-of-care and sibling exceptions exist in the framework, which is
 * why `RatioLimits` is stored per setting rather than hard-coded here.
 */

export interface TimelineBlock {
  childId: string;
  childName: string;
  colour: string;
  /** Minutes from midnight. */
  start: number;
  end: number;
  /** Which nesting bands this child occupies on the day being viewed. */
  bands: (keyof RatioLimits)[];
}

export function bandsForAge(years: number | null): (keyof RatioLimits)[] {
  if (years === null) return ['underEight'];
  const bands: (keyof RatioLimits)[] = [];
  if (years < 1) bands.push('underOne');
  if (years < 5) bands.push('underFive');
  if (years < 8) bands.push('underEight');
  return bands.length ? bands : [];
}

export const BAND_LABELS: Record<keyof RatioLimits, string> = {
  underOne: 'Under 1',
  underFive: 'Under 5',
  underEight: 'Under 8',
};

/** Builds the day's blocks from each child's contracted session for that weekday. */
export function blocksForDay(
  children: Child[],
  weekday: Weekday,
  on: Date,
  overrides: Record<string, { start: number; end: number }> = {},
): TimelineBlock[] {
  return children.flatMap((child) => {
    const override = overrides[child.id];
    const session = child.schedule?.[weekday];
    const start = override?.start ?? timeToMinutes(session?.start);
    const end = override?.end ?? timeToMinutes(session?.end);
    if (start === null || end === null || start === undefined || end === undefined) return [];
    if (end <= start) return [];

    return [
      {
        childId: child.id,
        childName: child.name,
        colour: child.colour,
        start,
        end,
        bands: bandsForAge(ageInYears(child.dob, on)),
      },
    ];
  });
}

/**
 * Sweeps the day and reports every window where a band is over its limit.
 *
 * Uses a boundary sweep rather than fixed slots, so a 10-minute overlap
 * created by a late pickup is caught exactly, not rounded away.
 */
export function findBreaches(
  blocks: TimelineBlock[],
  limits: RatioLimits = DEFAULT_RATIO_LIMITS,
): RatioBreach[] {
  if (!blocks.length) return [];

  const boundaries = Array.from(new Set(blocks.flatMap((b) => [b.start, b.end]))).sort((a, b) => a - b);
  const raw: RatioBreach[] = [];

  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const from = boundaries[i];
    const to = boundaries[i + 1];
    const active = blocks.filter((b) => b.start <= from && b.end >= to);

    (Object.keys(limits) as (keyof RatioLimits)[]).forEach((band) => {
      const count = active.filter((b) => b.bands.includes(band)).length;
      if (count > limits[band]) raw.push({ band, count, limit: limits[band], from, to });
    });
  }

  // Merge adjacent windows of the same band and headcount into one breach, so
  // the UI shows "3 under-1s from 09:00–12:00", not six abutting slivers.
  return raw.reduce<RatioBreach[]>((merged, breach) => {
    const previous = merged[merged.length - 1];
    if (previous && previous.band === breach.band && previous.count === breach.count && previous.to === breach.from) {
      previous.to = breach.to;
      return merged;
    }
    merged.push({ ...breach });
    return merged;
  }, []);
}

/** Headcount per band at a given minute — drives the live capacity meter. */
export function occupancyAt(
  blocks: TimelineBlock[],
  minute: number,
): Record<keyof RatioLimits, number> {
  const active = blocks.filter((b) => b.start <= minute && b.end > minute);
  return {
    underOne: active.filter((b) => b.bands.includes('underOne')).length,
    underFive: active.filter((b) => b.bands.includes('underFive')).length,
    underEight: active.filter((b) => b.bands.includes('underEight')).length,
  };
}

/**
 * Projects the exact dates when a place frees up.
 *
 * A space opens either because a child ages out of a band (their first, fifth
 * or eighth birthday) or because they leave the setting. Only bands currently
 * at or above their limit are reported — a minder with one under-one does not
 * need telling when that baby turns one.
 */
export function upcomingOpenings(
  children: Child[],
  limits: RatioLimits = DEFAULT_RATIO_LIMITS,
  from: Date = new Date(),
): CapacityOpening[] {
  const bandAge: Record<keyof RatioLimits, number> = { underOne: 1, underFive: 5, underEight: 8 };

  const openings = (Object.keys(limits) as (keyof RatioLimits)[]).flatMap((band) => {
    const inBand = children.filter((child) => bandsForAge(ageInYears(child.dob, from)).includes(band));
    if (inBand.length < limits[band]) return [];

    return inBand.flatMap((child) => {
      const date = birthdayOn(child.dob, bandAge[band]);
      if (!date || date <= from) return [];
      return [
        {
          band,
          date,
          childName: child.name,
          reason: `${child.name} turns ${bandAge[band]}`,
        } satisfies CapacityOpening,
      ];
    });
  });

  // The soonest birthday in each band is the one that actually opens the space.
  const soonestPerBand = new Map<keyof RatioLimits, CapacityOpening>();
  openings
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .forEach((opening) => {
      if (!soonestPerBand.has(opening.band)) soonestPerBand.set(opening.band, opening);
    });

  return [...soonestPerBand.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}
