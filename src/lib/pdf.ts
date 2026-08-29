import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from './format';
import { fromDateKey } from './dates';
import type { Invoice, Setting } from '@/types';

const BRAND: [number, number, number] = [108, 92, 231];
const INK: [number, number, number] = [36, 27, 51];
const SUB: [number, number, number] = [126, 117, 145];

const longDate = (key: string) =>
  fromDateKey(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Renders a parent-facing PDF invoice.
 *
 * Deliberately kept client-side: the whole point of LittleNest is that a
 * minder can raise an invoice on their phone at 7pm with no server round-trip
 * and no per-invoice cost.
 */
export function buildInvoicePdf(invoice: Invoice, setting: Setting, parentName?: string): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 48;

  pdf.setFillColor(...BRAND);
  pdf.rect(0, 0, pageWidth, 92, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(setting.name || 'LittleNest', margin, 44);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const subtitle = setting.ofstedUrn ? `Ofsted URN ${setting.ofstedUrn}` : 'Registered childminder';
  pdf.text(subtitle, margin, 62);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('INVOICE', pageWidth - margin, 44, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(invoice.number, pageWidth - margin, 62, { align: 'right' });

  let y = 128;
  pdf.setTextColor(...INK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Invoice to', margin, y);
  pdf.text('Period', pageWidth / 2, y);

  y += 16;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...SUB);
  pdf.text(parentName || `Parent/carer of ${invoice.childName}`, margin, y);
  pdf.text(`${longDate(invoice.periodStart)} – ${longDate(invoice.periodEnd)}`, pageWidth / 2, y);

  y += 14;
  pdf.text(`Childcare for ${invoice.childName}`, margin, y);
  pdf.text(`Payment due ${longDate(invoice.dueDate)}`, pageWidth / 2, y);

  if (setting.addressLines?.length) {
    setting.addressLines.forEach((line) => {
      y += 13;
      pdf.text(line, margin, y);
    });
  }

  autoTable(pdf, {
    startY: y + 26,
    margin: { left: margin, right: margin },
    head: [['Description', 'Qty', 'Unit price', 'Amount']],
    body: invoice.lines.map((line) => [
      line.detail ? `${line.label}\n${line.detail}` : line.label,
      `${line.quantity} ${line.unit}`,
      line.funded ? 'Funded' : formatMoney(line.unitPrice),
      line.funded ? formatMoney(0) : formatMoney(line.total),
    ]),
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 8, textColor: INK, lineColor: [235, 228, 244] },
    headStyles: { fillColor: [245, 241, 251], textColor: INK, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 78 },
      2: { halign: 'right', cellWidth: 78 },
      3: { halign: 'right', cellWidth: 82 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && invoice.lines[data.row.index]?.funded) {
        data.cell.styles.textColor = [26, 133, 81];
      }
    },
  });

  const table = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  let totalsY = (table?.finalY ?? y + 60) + 24;

  const rightEdge = pageWidth - margin;
  const labelX = rightEdge - 150;

  pdf.setFontSize(10);
  pdf.setTextColor(...SUB);
  pdf.text('Subtotal', labelX, totalsY);
  pdf.setTextColor(...INK);
  pdf.text(formatMoney(invoice.subtotal), rightEdge, totalsY, { align: 'right' });

  if (invoice.fundedValue > 0) {
    totalsY += 16;
    pdf.setTextColor(...SUB);
    pdf.text('Funded hours value', labelX, totalsY);
    pdf.setTextColor(26, 133, 81);
    pdf.text(`−${formatMoney(invoice.fundedValue)}`, rightEdge, totalsY, { align: 'right' });
  }

  totalsY += 24;
  pdf.setFillColor(245, 241, 251);
  pdf.roundedRect(labelX - 16, totalsY - 18, rightEdge - labelX + 16, 34, 6, 6, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...INK);
  pdf.text('Total due', labelX, totalsY + 4);
  pdf.setTextColor(...BRAND);
  pdf.text(formatMoney(invoice.total), rightEdge, totalsY + 4, { align: 'right' });

  let footerY = totalsY + 52;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...SUB);

  if (invoice.notes) {
    pdf.splitTextToSize(invoice.notes, pageWidth - margin * 2).forEach((line: string) => {
      pdf.text(line, margin, footerY);
      footerY += 12;
    });
    footerY += 8;
  }

  if (invoice.fundedValue > 0) {
    pdf.text(
      'Meals and consumables are optional charges and are not a condition of the funded place.',
      margin,
      footerY,
    );
    footerY += 12;
  }

  if (setting.billing?.invoiceFootnote) {
    pdf.text(setting.billing.invoiceFootnote, margin, footerY);
    footerY += 12;
  }

  pdf.setTextColor(167, 159, 184);
  pdf.text('Generated with LittleNest', margin, pdf.internal.pageSize.getHeight() - 32);

  return pdf;
}

export function downloadInvoicePdf(invoice: Invoice, setting: Setting, parentName?: string): void {
  const safeName = invoice.childName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  buildInvoicePdf(invoice, setting, parentName).save(`${invoice.number}-${safeName}.pdf`);
}
