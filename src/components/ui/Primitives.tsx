import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn, initialOf } from '@/lib/format';

/* ── Avatar ───────────────────────────────────────────────── */

export function Avatar({
  name,
  colour,
  size = 'md',
}: {
  name: string;
  colour?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-9 w-9 rounded-xl text-[15px]',
    md: 'h-12 w-12 rounded-[15px] text-[20px]',
    lg: 'h-[60px] w-[60px] rounded-[19px] text-[26px]',
  };
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center font-display font-black text-white',
        'shadow-[inset_0_-3px_8px_rgba(0,0,0,.12)]',
        sizes[size],
      )}
      style={{ background: colour || '#6C5CE7' }}
    >
      {initialOf(name)}
    </div>
  );
}

/* ── Chip ─────────────────────────────────────────────────── */

export function Chip({
  active,
  onClick,
  children,
  className,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-2',
        'text-[13.5px] font-extrabold transition active:scale-95 disabled:opacity-50',
        active ? 'border-brand-500 bg-brand-100 text-brand-700' : 'border-line bg-white text-ink-soft',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Pill ─────────────────────────────────────────────────── */

export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'in' | 'gold' | 'danger' | 'brand';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-[#F0ECF6] text-ink-sub',
    in: 'bg-moss-bg text-moss',
    gold: 'bg-gold-bg text-gold',
    danger: 'bg-rose-bg text-rose',
    brand: 'bg-brand-100 text-brand-700',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-extrabold',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose px-1.5 text-[11px] font-black text-white shadow-[0_2px_6px_rgba(192,69,91,.4)]">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ── Form fields ──────────────────────────────────────────── */

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('mb-4', className)}>
      {label ? <div className="ln-label">{label}</div> : null}
      {children}
      {hint && !error ? <p className="mt-1.5 text-[12.5px] leading-snug text-ink-sub">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-[12.5px] font-bold text-rose">{error}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('ln-input', props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('ln-input resize-none leading-relaxed', props.className)} />;
}

export function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix'> & {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-ink-sub">
          {prefix}
        </span>
      ) : null}
      <input
        {...rest}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
        className={cn('ln-input', prefix && 'pl-7', suffix && 'pr-12')}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink-sub">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

/* ── Segmented control ────────────────────────────────────── */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 rounded-2xl bg-brand-50 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-[13.5px] font-extrabold transition',
            value === option.value ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-sub',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Feedback ─────────────────────────────────────────────── */

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'mx-auto my-14 h-[30px] w-[30px] animate-[spin_.8s_linear_infinite] rounded-full',
        'border-[3px] border-line border-t-brand-500',
        className,
      )}
    />
  );
}

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mb-3 text-[46px] saturate-[.85]">{emoji}</div>
      <p className="mb-1.5 font-display text-[20px] font-semibold">{title}</p>
      {body ? <p className="text-[14px] leading-relaxed text-ink-sub">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="my-2 rounded-xl bg-rose-bg px-3.5 py-2.5 text-[13.5px] font-extrabold text-rose">
      {children}
    </p>
  );
}

export function StatTile({ value, label, tone }: { value: ReactNode; label: string; tone?: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-line bg-white p-3 shadow-sm">
      <div className="font-display text-[27px] font-semibold leading-none" style={{ color: tone }}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-sub">{label}</div>
    </div>
  );
}
