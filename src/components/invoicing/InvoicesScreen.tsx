import { useEffect, useMemo, useState } from 'react';
import { InvoiceBuilder } from './InvoiceBuilder';
import { Button } from '@/components/ui/Button';
import { Avatar, EmptyState, Pill, Spinner, StatTile } from '@/components/ui/Primitives';
import { Card, SectionTitle } from '@/components/ui/Card';
import { formatMoney } from '@/lib/format';
import { fromDateKey } from '@/lib/dates';
import { previewFundingForChild } from '@/lib/invoice';
import { listInvoices, updateInvoiceStatus } from '@/services/firebase/data';
import { useToast } from '@/hooks/useToast';
import type { Child, Invoice, Setting } from '@/types';

export function InvoicesScreen({
  settingId,
  setting,
  children: childList,
}: {
  settingId: string;
  setting: Setting;
  children: Child[];
}) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [target, setTarget] = useState<Child | null>(null);
  const toast = useToast();

  const load = async () => {
    try {
      const found = await listInvoices(settingId);
      setInvoices(
        found.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.number.localeCompare(a.number)),
      );
    } catch (err) {
      toast.error("Couldn't load invoices", (err as Error).message);
      setInvoices([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingId]);

  const outstanding = useMemo(
    () => (invoices ?? []).filter((invoice) => invoice.status !== 'paid'),
    [invoices],
  );
  const outstandingTotal = outstanding.reduce((sum, invoice) => sum + invoice.total, 0);

  /** Projected monthly income across every child, from their stored contracts. */
  const projected = useMemo(
    () =>
      childList.reduce((sum, child) => {
        const forecast = previewFundingForChild(child, setting.billing);
        return sum + forecast.monthlyTotalIncome;
      }, 0),
    [childList, setting.billing],
  );

  /** jsPDF is loaded on demand — see the note in InvoiceBuilder. */
  const downloadPdf = async (invoice: Invoice) => {
    const { downloadInvoicePdf } = await import('@/lib/pdf');
    downloadInvoicePdf(
      invoice,
      setting,
      childList.find((child) => child.id === invoice.childId)?.parentName,
    );
  };

  const markPaid = async (invoice: Invoice) => {
    await updateInvoiceStatus(settingId, invoice.id, 'paid');
    toast.success('Marked as paid', `${invoice.number} · ${formatMoney(invoice.total)}`);
    void load();
  };

  return (
    <div>
      <div className="mb-4 flex gap-2.5">
        <StatTile value={formatMoney(outstandingTotal)} label="Outstanding" tone="#C0455B" />
        <StatTile value={outstanding.length} label="Unpaid" />
        <StatTile value={formatMoney(projected)} label="Forecast /mo" tone="#6C5CE7" />
      </div>

      <SectionTitle>Raise an invoice</SectionTitle>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 ln-no-scrollbar">
        {childList.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => setTarget(child)}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-white py-2.5 pl-2.5 pr-4 shadow-sm transition active:scale-95"
          >
            <Avatar name={child.name} colour={child.colour} size="sm" />
            <span className="text-left">
              <span className="block text-[14px] font-extrabold">{child.name.split(' ')[0]}</span>
              <span className="block text-[11.5px] font-bold text-ink-sub">
                {formatMoney(previewFundingForChild(child, setting.billing).monthlyParentCost)}/mo
              </span>
            </span>
          </button>
        ))}
        {childList.length === 0 ? (
          <p className="py-3 text-[13.5px] text-ink-sub">Add a child before raising an invoice.</p>
        ) : null}
      </div>

      <SectionTitle>Recent invoices</SectionTitle>
      {invoices === null ? (
        <Spinner />
      ) : invoices.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="No invoices yet"
          body="Pick a child above to build your first invoice — funded hours, meals and any overtime are pulled in automatically."
        />
      ) : (
        invoices.map((invoice) => (
          <Card key={invoice.id} className="mb-2.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-black">{invoice.childName}</span>
                  <StatusPill status={invoice.status} dueDate={invoice.dueDate} />
                </div>
                <p className="mt-1 text-[12.5px] font-bold text-ink-sub">
                  {invoice.number} ·{' '}
                  {fromDateKey(invoice.periodStart).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  –{' '}
                  {fromDateKey(invoice.periodEnd).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
                {invoice.fundedValue > 0 ? (
                  <p className="mt-1 text-[12px] font-bold text-moss">
                    includes {formatMoney(invoice.fundedValue)} of funded care
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 font-display text-[22px] font-semibold text-brand-600">
                {formatMoney(invoice.total)}
              </p>
            </div>

            <div className="mt-3 flex gap-2 border-t border-line-soft pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => void downloadPdf(invoice)}
              >
                Download PDF
              </Button>
              {invoice.status !== 'paid' ? (
                <Button variant="soft" size="sm" className="flex-1" onClick={() => void markPaid(invoice)}>
                  Mark as paid
                </Button>
              ) : null}
            </div>
          </Card>
        ))
      )}

      <InvoiceBuilder
        open={target !== null}
        onClose={() => {
          setTarget(null);
          void load();
        }}
        settingId={settingId}
        setting={setting}
        child={target}
      />
    </div>
  );
}

function StatusPill({ status, dueDate }: { status: Invoice['status']; dueDate: string }) {
  const overdue = status === 'issued' && fromDateKey(dueDate) < new Date();
  if (status === 'paid') return <Pill tone="in">Paid</Pill>;
  if (overdue) return <Pill tone="danger">Overdue</Pill>;
  if (status === 'issued') return <Pill tone="gold">Awaiting payment</Pill>;
  return <Pill>Draft</Pill>;
}
