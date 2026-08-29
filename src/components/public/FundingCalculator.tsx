import { useMemo, useState } from 'react';
import { calculateFunding, describeFunding, DEFAULT_FUNDING_INPUT, type FundingInput } from '@/lib/funding';
import { formatMoney, formatMoneyShort } from '@/lib/format';
import { FUNDED_WEEKS_PER_YEAR } from '@/lib/constants';
import { Field, NumberInput, Segmented } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import type { EntitlementHours, FundingModel } from '@/types';

const ENTITLEMENTS: { value: EntitlementHours; label: string; note: string }[] = [
  { value: 0, label: 'None', note: 'Privately paid' },
  { value: 15, label: '15 hours', note: '9 months+ or universal 3–4s' },
  { value: 30, label: '30 hours', note: 'Working parents, 9 months to 4' },
];

/**
 * The public lead magnet: a full 15/30 funded-hours calculator that works with
 * no account, no email wall and no server round-trip.
 *
 * It shares `calculateFunding` with the in-app invoice builder, so the number a
 * visitor sees here is the number LittleNest will actually invoice — which is
 * the whole reason it converts.
 */
export function FundingCalculator({ onSignUp }: { onSignUp?: () => void }) {
  const [input, setInput] = useState<FundingInput>(DEFAULT_FUNDING_INPUT);
  const [showIncome, setShowIncome] = useState(false);

  const result = useMemo(() => calculateFunding(input), [input]);
  const set = <K extends keyof FundingInput>(key: K, value: FundingInput[K]) =>
    setInput((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="overflow-hidden rounded-4xl border border-line bg-white shadow-md">
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-5 py-6 text-white sm:px-7">
        <p className="text-[12px] font-extrabold uppercase tracking-[1.4px] text-white/70">
          Free tool · no sign-up
        </p>
        <h2 className="mt-1.5 text-[26px] text-white sm:text-[30px]">
          UK funded hours &amp; invoice calculator
        </h2>
        <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-white/85">
          Work out exactly what a parent pays once their 15 or 30 funded hours are applied —
          term-time or stretched across the year, with meals and consumables kept on separate
          lines the way Ofsted and your local authority expect.
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
        <div className="border-line p-5 sm:p-7 lg:border-r">
          <Field label="Funded entitlement">
            <div className="flex flex-wrap gap-2">
              {ENTITLEMENTS.map((option) => {
                const active = input.entitlement === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set('entitlement', option.value)}
                    className={`flex-1 rounded-2xl border-[1.5px] px-3 py-2.5 text-left transition active:scale-[.98] ${
                      active ? 'border-brand-500 bg-brand-100' : 'border-line bg-white'
                    }`}
                  >
                    <span
                      className={`block text-[14.5px] font-extrabold ${active ? 'text-brand-700' : 'text-ink'}`}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] font-bold leading-tight text-ink-sub">
                      {option.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {input.entitlement > 0 ? (
            <Field
              label="How is it taken?"
              hint={
                input.model === 'stretched'
                  ? `${input.entitlement}h × ${FUNDED_WEEKS_PER_YEAR} term-time weeks spread over ${input.stretchWeeks} weeks.`
                  : `Funded for ${FUNDED_WEEKS_PER_YEAR} weeks; holidays are charged in full.`
              }
            >
              <Segmented<FundingModel>
                value={input.model}
                onChange={(model) => set('model', model)}
                options={[
                  { value: 'term-time', label: 'Term-time only' },
                  { value: 'stretched', label: 'Stretched' },
                ]}
              />
              {input.model === 'stretched' ? (
                <NumberInput
                  value={input.stretchWeeks}
                  onChange={(weeks) => {
                    set('stretchWeeks', weeks);
                    set('attendanceWeeks', weeks);
                  }}
                  min={38}
                  max={52}
                  suffix="weeks"
                  aria-label="Weeks to stretch across"
                />
              ) : null}
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hours a week">
              <NumberInput
                value={input.weeklyHours}
                onChange={(hours) => set('weeklyHours', hours)}
                step={0.5}
                max={60}
                suffix="h"
              />
            </Field>
            <Field label="Days a week">
              <NumberInput
                value={input.daysPerWeek}
                onChange={(days) => set('daysPerWeek', days)}
                max={7}
                suffix="days"
              />
            </Field>
            <Field label="Your hourly rate">
              <NumberInput
                value={input.hourlyRate}
                onChange={(rate) => set('hourlyRate', rate)}
                step={0.25}
                prefix="£"
              />
            </Field>
            <Field label="Meals a day">
              <NumberInput
                value={input.mealsPerDay}
                onChange={(meals) => set('mealsPerDay', meals)}
                step={0.5}
                prefix="£"
              />
            </Field>
            <Field label="Consumables a day">
              <NumberInput
                value={input.consumablesPerDay}
                onChange={(amount) => set('consumablesPerDay', amount)}
                step={0.5}
                prefix="£"
              />
            </Field>
            <Field label="Weeks a year">
              <NumberInput
                value={input.attendanceWeeks}
                onChange={(weeks) => set('attendanceWeeks', weeks)}
                max={52}
                suffix="wks"
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setShowIncome((previous) => !previous)}
            className="text-[13px] font-extrabold text-brand-600 underline underline-offset-2"
          >
            {showIncome ? 'Hide' : 'Show'} what the council pays you
          </button>

          {showIncome ? (
            <div className="mt-3">
              <Field
                label="Council funding rate"
                hint="Your local authority's published hourly rate for funded places."
              >
                <NumberInput
                  value={input.fundedHourlyRate ?? 0}
                  onChange={(rate) => set('fundedHourlyRate', rate)}
                  step={0.01}
                  prefix="£"
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="bg-brand-50 p-5 sm:p-7">
          <p className="ln-eyebrow">The parent pays</p>
          <p className="mt-2 font-display text-[46px] font-semibold leading-none text-brand-600">
            {formatMoney(input.model === 'term-time' ? result.weeklyParentCost : result.monthlyParentCost)}
          </p>
          <p className="mt-1.5 text-[13.5px] font-bold text-ink-sub">
            {input.model === 'term-time'
              ? 'a week during term-time'
              : 'a month, spread evenly by standing order'}
          </p>

          <div className="mt-5 space-y-0 rounded-2xl border border-line bg-white px-4 py-1">
            <Row
              label="Funded hours"
              value={`${result.fundedHoursUsed}h`}
              tone="moss"
              note={result.fundedHoursUsed > 0 ? `worth ${formatMoney(result.weeklySavings)}/wk` : undefined}
            />
            <Row label="Chargeable hours" value={`${result.chargeableHours}h`} note={formatMoney(result.chargeableCost)} />
            <Row label="Meals" value={formatMoney(result.mealsCost)} note="a week" />
            <Row label="Consumables" value={formatMoney(result.consumablesCost)} note="a week" />
            <Row label="Weekly total" value={formatMoney(result.weeklyParentCost)} strong />
            <Row label="Yearly total" value={formatMoney(result.annualParentCost)} />
          </div>

          {result.unusedEntitlement > 0 ? (
            <p className="mt-3 rounded-xl border-l-[3px] border-gold bg-gold-bg px-3.5 py-3 text-[13px] font-bold leading-relaxed text-ink-soft">
              ⚠️ {result.unusedEntitlement}h of the entitlement goes unused each week — this child
              attends fewer hours than they are funded for.
            </p>
          ) : null}

          {showIncome && (input.fundedHourlyRate ?? 0) > 0 ? (
            <div className="mt-3 rounded-2xl border border-line bg-white px-4 py-1">
              <Row label="From parents" value={formatMoney(result.weeklyParentCost)} note="a week" />
              <Row label="From the council" value={formatMoney(result.weeklyFundingIncome)} note="a week" tone="moss" />
              <Row label="Your monthly income" value={formatMoney(result.monthlyTotalIncome)} strong />
            </div>
          ) : null}

          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-sub">
            {describeFunding(input, result)}
          </p>

          {result.annualSavings > 0 ? (
            <p className="mt-2 text-[13px] font-extrabold text-moss">
              This family saves {formatMoneyShort(Math.round(result.annualSavings))} a year in funded care.
            </p>
          ) : null}

          {onSignUp ? (
            <Button variant="primary" size="lg" fullWidth className="mt-5" onClick={onSignUp}>
              Turn this into a real invoice →
            </Button>
          ) : null}

          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
            Guidance only. Funded rates vary by local authority — check your council's published
            rate and your own contract before invoicing.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  note,
  strong,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
  tone?: 'moss';
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-0">
      <span className={`text-[13px] ${strong ? 'font-extrabold text-ink' : 'text-ink-sub'}`}>{label}</span>
      <span className="text-right">
        <span
          className={`text-[14px] font-extrabold ${
            tone === 'moss' ? 'text-moss' : strong ? 'text-brand-600' : 'text-ink'
          }`}
        >
          {value}
        </span>
        {note ? <span className="ml-1.5 text-[11.5px] font-bold text-ink-faint">{note}</span> : null}
      </span>
    </div>
  );
}
