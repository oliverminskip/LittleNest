import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Segmented, Spinner, TextArea, TextInput } from '@/components/ui/Primitives';
import { Sheet } from '@/components/ui/Sheet';
import { buildInvoiceLines, contractedWeeklyHours, draftInvoice, nextInvoiceNumber } from '@/lib/invoice';
import { formatMoney } from '@/lib/format';
import { toDateKey } from '@/lib/dates';
import { DEFAULT_BILLING } from '@/lib/constants';
import { getAttendanceRange, getUninvoicedOvertime, listInvoices, saveInvoice } from '@/services/firebase/data';
import { useToast } from '@/hooks/useToast';
import type { Attendance, Child, Invoice, OvertimeLog, Setting } from '@/types';

/** First and last day of the month containing `date`. */
function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toDateKey(start), end: toDateKey(end) };
}

/**
 * Builds and issues an invoice for one child and one period.
 *
 * Two sources of truth are offered explicitly: the signed register (what
 * actually happened) or the contracted schedule (what was agreed). Minders
 * invoice in advance from the contract and reconcile in arrears from the
 * register, and getting that choice wrong is the single most common billing
 * dispute — so it is a visible switch, not an inferred default.
 */
export function InvoiceBuilder({
  open,
  onClose,
  settingId,
  setting,
  child,
}: {
  open: boolean;
  onClose: () => void;
  settingId: string;
  setting: Setting;
  child: Child | null;
}) {
  const initial = useMemo(() => monthBounds(new Date()), []);
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);
  const [source, setSource] = useState<'schedule' | 'register'>('schedule');
  const [notes, setNotes] = useState('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [overtime, setOvertime] = useState<OvertimeLog[]>([]);
  const [existing, setExisting] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const billing = { ...DEFAULT_BILLING, ...(setting.billing ?? {}), ...(child?.billing ?? {}) };

  useEffect(() => {
    if (!open || !child) return;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [records, logs, invoices] = await Promise.all([
          getAttendanceRange(settingId, child.id, periodStart, periodEnd),
          getUninvoicedOvertime(settingId, child.id, periodStart, periodEnd),
          listInvoices(settingId),
        ]);
        if (cancelled) return;
        setAttendance(records);
        setOvertime(logs);
        setExisting(invoices);
      } catch (err) {
        if (!cancelled) toast.error("Couldn't load the period", (err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, child?.id, settingId, periodStart, periodEnd]);

  const preview = useMemo(() => {
    if (!child) return null;
    return buildInvoiceLines({
      child,
      periodStart,
      periodEnd,
      billing,
      attendance,
      overtime,
      useSchedule: source === 'schedule',
      notes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child, periodStart, periodEnd, attendance, overtime, source, notes, setting.billing]);

  const issue = async (andDownload: boolean) => {
    if (!child || !preview) return;
    setSaving(true);
    try {
      const number = nextInvoiceNumber(existing);
      const draft = draftInvoice(
        {
          child,
          periodStart,
          periodEnd,
          billing,
          attendance,
          overtime,
          useSchedule: source === 'schedule',
          notes: notes.trim() || undefined,
        },
        number,
      );

      const id = await saveInvoice(
        settingId,
        { ...draft, status: 'issued' },
        overtime.map((log) => ({ childId: child.id, logId: log.id })),
      );

      if (andDownload) {
        // jsPDF is ~400 KB — pulled in only when a PDF is actually rendered,
        // so the dashboard payload stays small on a phone signal.
        const { downloadInvoicePdf } = await import('@/lib/pdf');
        downloadInvoicePdf(
          { ...draft, id, status: 'issued', createdAt: null },
          setting,
          child.parentName,
        );
      }

      toast.success(`Invoice ${number} issued`, formatMoney(draft.total));
      onClose();
    } catch (err) {
      toast.error("Couldn't issue the invoice", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const contracted = child ? contractedWeeklyHours(child) : { hours: 0, days: 0 };

  return (
    <Sheet
      open={open && !!child}
      onClose={onClose}
      title={`Invoice · ${child?.name ?? ''}`}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" loading={saving} onClick={() => void issue(false)}>
            Issue
          </Button>
          <Button className="flex-1" loading={saving} onClick={() => void issue(true)}>
            Issue &amp; download PDF
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <TextInput type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
        </Field>
        <Field label="To">
          <TextInput type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
        </Field>
      </div>

      <Field
        label="Bill from"
        hint={
          source === 'schedule'
            ? `${contracted.hours}h a week across ${contracted.days} day${contracted.days === 1 ? '' : 's'}, from the contract.`
            : `${attendance.length} signed day${attendance.length === 1 ? '' : 's'} in this period.`
        }
      >
        <Segmented
          value={source}
          onChange={setSource}
          options={[
            { value: 'schedule', label: 'Contracted hours' },
            { value: 'register', label: 'Signed register' },
          ]}
        />
      </Field>

      {loading ? (
        <Spinner />
      ) : preview ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-line bg-white">
          {preview.lines.map((line, index) => (
            <div key={index} className="flex items-start gap-3 border-b border-line-soft px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold">{line.label}</p>
                {line.detail ? (
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-sub">{line.detail}</p>
                ) : null}
                <p className="mt-1 text-[12px] font-bold text-ink-faint">
                  {line.quantity} {line.unit}
                  {line.funded ? '' : ` × ${formatMoney(line.unitPrice)}`}
                </p>
              </div>
              <p
                className={`shrink-0 text-[14px] font-black ${line.funded ? 'text-moss' : 'text-ink'}`}
              >
                {line.funded ? 'Funded' : formatMoney(line.total)}
              </p>
            </div>
          ))}

          {preview.lines.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13.5px] text-ink-sub">
              Nothing to bill in this period. Add contracted hours on {child?.name}'s profile, or
              pick a period with signed register days.
            </p>
          ) : (
            <div className="flex items-center justify-between bg-brand-50 px-4 py-3.5">
              <span className="text-[14px] font-black">Total due</span>
              <span className="font-display text-[24px] font-semibold text-brand-600">
                {formatMoney(preview.total)}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {preview && preview.fundedValue > 0 ? (
        <p className="mb-4 rounded-xl border-l-[3px] border-moss bg-moss-bg px-3.5 py-3 text-[12.5px] font-bold leading-relaxed text-ink-soft">
          {formatMoney(preview.fundedValue)} of care is covered by the government entitlement and
          shown at £0 on the invoice, so the parent can see its value.
        </p>
      ) : null}

      <Field label="Note to the parent (optional)">
        <TextArea
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Payment by bank transfer to…"
        />
      </Field>
      <div className="h-2" />
    </Sheet>
  );
}
