import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Field, Segmented, NumberInput, TextInput } from '@/components/ui/Primitives';
import { CHILD_COLOURS, DEFAULT_STRETCH_WEEKS, FUNDED_WEEKS_PER_YEAR } from '@/lib/constants';
import { createChild } from '@/services/firebase/data';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/format';
import type { EntitlementHours, FundingModel, WeeklySchedule, Weekday } from '@/types';

const DAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
];

export function AddChildSheet({
  open,
  onClose,
  settingId,
}: {
  open: boolean;
  onClose: () => void;
  settingId: string;
}) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [colour, setColour] = useState(CHILD_COLOURS[0]);
  const [days, setDays] = useState<Weekday[]>([1, 2, 3]);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [entitlement, setEntitlement] = useState<EntitlementHours>(0);
  const [model, setModel] = useState<FundingModel>('stretched');
  const [stretchWeeks, setStretchWeeks] = useState(DEFAULT_STRETCH_WEEKS);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const toggleDay = (day: Weekday) =>
    setDays((previous) =>
      previous.includes(day) ? previous.filter((value) => value !== day) : [...previous, day].sort(),
    );

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const schedule: WeeklySchedule = {};
      days.forEach((day) => {
        schedule[day] = { start, end };
      });

      const { setupCode } = await createChild(settingId, {
        name,
        dob,
        colour,
        schedule,
        ...(entitlement
          ? {
              funding: {
                entitlement,
                model,
                stretchWeeks,
                fundedWeeksPerYear: FUNDED_WEEKS_PER_YEAR,
              },
            }
          : {}),
      });

      toast.success(`${name.trim()} added`, `Parent code ${setupCode}`);
      setName('');
      setDob('');
      onClose();
    } catch (err) {
      toast.error("Couldn't add that child", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a child"
      footer={
        <Button size="lg" fullWidth loading={busy} onClick={submit}>
          Add child &amp; generate code
        </Button>
      }
    >
      <Field label="Child's name">
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Evie Harper"
          required
        />
      </Field>

      <Field label="Date of birth" hint="Used to check your Ofsted ratios automatically.">
        <TextInput type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
      </Field>

      <Field label="Colour">
        <div className="flex flex-wrap gap-2.5">
          {CHILD_COLOURS.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Colour ${option}`}
              onClick={() => setColour(option)}
              className={cn(
                'h-9 w-9 rounded-xl border-[3px] transition',
                colour === option ? 'border-ink' : 'border-transparent',
              )}
              style={{ background: option }}
            />
          ))}
        </div>
      </Field>

      <Field label="Contracted days">
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={cn(
                'flex-1 rounded-xl border-[1.5px] py-2.5 text-[13px] font-extrabold transition',
                days.includes(day.value) ? 'border-brand-500 bg-brand-100 text-brand-700' : 'border-line bg-white',
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Session starts">
          <TextInput type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </Field>
        <Field label="Session ends">
          <TextInput type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </Field>
      </div>

      <Field label="Funded hours">
        <div className="flex gap-2">
          {([0, 15, 30] as EntitlementHours[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEntitlement(option)}
              className={cn(
                'flex-1 rounded-xl border-[1.5px] py-2.5 text-[13.5px] font-extrabold transition',
                entitlement === option ? 'border-brand-500 bg-brand-100 text-brand-700' : 'border-line bg-white',
              )}
            >
              {option === 0 ? 'None' : `${option}h`}
            </button>
          ))}
        </div>
      </Field>

      {entitlement > 0 ? (
        <>
          <Segmented<FundingModel>
            value={model}
            onChange={setModel}
            options={[
              { value: 'term-time', label: 'Term-time' },
              { value: 'stretched', label: 'Stretched' },
            ]}
          />
          {model === 'stretched' ? (
            <Field label="Stretched over" hint={`${entitlement}h × ${FUNDED_WEEKS_PER_YEAR} weeks, spread evenly.`}>
              <NumberInput value={stretchWeeks} onChange={setStretchWeeks} min={38} max={52} suffix="weeks" />
            </Field>
          ) : null}
        </>
      ) : null}

      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-sub">
        A unique parent code is generated automatically. Share it with the parent — they enter it
        when they sign up and are instantly linked.
      </p>
    </Sheet>
  );
}
