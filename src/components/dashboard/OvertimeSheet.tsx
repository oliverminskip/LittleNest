import { useMemo, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Chip, Field, Segmented, TextInput } from '@/components/ui/Primitives';
import { OVERTIME_INCREMENTS } from '@/lib/constants';
import { formatDuration } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { deleteOvertime, punchOvertime } from '@/services/firebase/data';
import { useOvertime } from '@/hooks/useChildData';
import { useToast } from '@/hooks/useToast';
import type { BillingDefaults, Child, OvertimeReason } from '@/types';

const REASONS: { value: OvertimeReason; label: string }[] = [
  { value: 'late-pickup', label: 'Late pickup' },
  { value: 'early-drop', label: 'Early drop' },
  { value: 'extra-session', label: 'Extra session' },
];

/**
 * Ad-hoc hours & late drop-off timer.
 *
 * A parent stuck in traffic costs a childminder unpaid time that historically
 * never made it onto an invoice, because logging it meant remembering at 9pm.
 * One tap at the door records it against today, priced at the setting's
 * overtime multiple, and it feeds the invoice ledger automatically — where
 * `saveInvoice` stamps it so it can never be billed twice.
 */
export function OvertimeSheet({
  open,
  onClose,
  settingId,
  child,
  billing,
}: {
  open: boolean;
  onClose: () => void;
  settingId: string;
  child: Child | null;
  billing: BillingDefaults;
}) {
  const [reason, setReason] = useState<OvertimeReason>('late-pickup');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const toast = useToast();

  const { data: logs } = useOvertime(settingId, child?.id);
  const rate = useMemo(
    () => Math.round((billing.hourlyRate * billing.lateMultiplier + Number.EPSILON) * 100) / 100,
    [billing],
  );

  const unbilled = logs.filter((log) => !log.invoicedIn);
  const unbilledMinutes = unbilled.reduce((sum, log) => sum + log.minutes, 0);

  const punch = async (minutes: number) => {
    if (!child) return;
    setBusy(minutes);
    try {
      await punchOvertime(settingId, child.id, minutes, rate, reason, note.trim() || undefined);
      navigator.vibrate?.(12);
      toast.success(
        `⏱️ ${formatDuration(minutes)} added`,
        `${formatMoney((minutes / 60) * rate)} on ${child.name.split(' ')[0]}'s next invoice`,
      );
      setNote('');
    } catch (err) {
      toast.error("Couldn't log that", (err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open && !!child} onClose={onClose} title={`Overtime · ${child?.name ?? ''}`}>
      <p className="mb-4 text-[14px] leading-relaxed text-ink-sub">
        Charged at {formatMoney(rate)} an hour ({billing.lateMultiplier}× your {formatMoney(billing.hourlyRate)}{' '}
        rate) and added straight to the next invoice.
      </p>

      <Segmented<OvertimeReason>
        value={reason}
        onChange={setReason}
        options={REASONS.map((option) => ({ value: option.value, label: option.label }))}
      />

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {OVERTIME_INCREMENTS.map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={busy !== null}
            onClick={() => void punch(minutes)}
            className="rounded-2xl border-[1.5px] border-brand-200 bg-white py-4 text-center shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            <span className="block font-display text-[26px] font-semibold leading-none text-brand-600">
              {minutes < 60 ? `${minutes}m` : '1h'}
            </span>
            <span className="mt-1.5 block text-[11.5px] font-extrabold text-ink-sub">
              {formatMoney((minutes / 60) * rate)}
            </span>
          </button>
        ))}
      </div>

      <Field label="Note (optional)">
        <TextInput
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. traffic on the A34"
        />
      </Field>

      {unbilled.length ? (
        <div className="mb-4 rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[13px] font-black">Waiting to be invoiced</p>
            <p className="text-[13px] font-extrabold text-brand-600">
              {formatDuration(unbilledMinutes)} · {formatMoney((unbilledMinutes / 60) * rate)}
            </p>
          </div>
          <div className="space-y-1.5">
            {unbilled.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-[13px]">
                <span className="font-extrabold">{formatDuration(log.minutes)}</span>
                <span className="text-ink-sub">
                  {log.date}
                  {log.note ? ` · ${log.note}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteOvertime(settingId, child!.id, log.id)}
                  className="ml-auto text-[12px] font-extrabold text-rose"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Button variant="ghost" fullWidth onClick={onClose}>
        Done
      </Button>
      <div className="h-4" />
    </Sheet>
  );
}

/** The dashboard card's inline quick-punch row. */
export function OvertimeQuickPunch({
  settingId,
  child,
  billing,
  onMore,
}: {
  settingId: string;
  child: Child;
  billing: BillingDefaults;
  onMore: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const rate = Math.round((billing.hourlyRate * billing.lateMultiplier + Number.EPSILON) * 100) / 100;

  const punch = async (minutes: number) => {
    setBusy(true);
    try {
      await punchOvertime(settingId, child.id, minutes, rate);
      navigator.vibrate?.(12);
      toast.success(`⏱️ +${formatDuration(minutes)}`, `${formatMoney((minutes / 60) * rate)} added to the ledger`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11.5px] font-black uppercase tracking-wide text-ink-sub">Overtime</span>
      {OVERTIME_INCREMENTS.map((minutes) => (
        <Chip key={minutes} disabled={busy} onClick={() => void punch(minutes)}>
          +{minutes < 60 ? `${minutes}m` : '1h'}
        </Chip>
      ))}
      <button type="button" onClick={onMore} className="ml-auto text-[12.5px] font-extrabold text-brand-600">
        More
      </button>
    </div>
  );
}
