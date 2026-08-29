import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/format';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the press-down affordance for cards that are themselves tappable. */
  tappable?: boolean;
  padded?: boolean;
  children: ReactNode;
}

export function Card({ tappable, padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'ln-card overflow-hidden',
        padded && 'p-3.5',
        tappable && 'transition active:scale-[.985]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('ln-eyebrow mb-3', className)}>{children}</p>;
}

export function InfoCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-2 text-[14px] font-black">{title}</div>
      {children}
    </div>
  );
}

export function InfoRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft py-2 last:border-0">
      <span className="shrink-0 text-[13px] text-ink-sub">{label}</span>
      <span className="text-right text-[13.5px] font-extrabold">{value}</span>
    </div>
  );
}
