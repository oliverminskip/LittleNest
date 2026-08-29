import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/format';

type Variant = 'primary' | 'ghost' | 'soft' | 'gold' | 'green' | 'danger' | 'plain';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg',
  ghost: 'bg-white text-ink border-[1.5px] border-line shadow-sm',
  soft: 'bg-brand-100 text-brand-700',
  gold: 'bg-gradient-to-br from-[#D6A746] to-gold-deep text-white shadow-[0_8px_22px_rgba(201,154,60,.3)]',
  green: 'bg-gradient-to-br from-[#23925C] to-moss-deep text-white shadow-[0_8px_22px_rgba(26,133,81,.28)]',
  danger: 'bg-transparent text-rose border-[1.5px] border-rose/25',
  plain: 'bg-transparent text-ink-sub',
};

const SIZES: Record<Size, string> = {
  sm: 'px-4 py-2.5 text-[14px] rounded-xl',
  md: 'px-4 py-3 text-[15px] rounded-2xl',
  lg: 'px-5 py-4 text-[16px] rounded-2xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold leading-none transition',
        'active:scale-[.975] disabled:pointer-events-none disabled:opacity-55',
        // 44px is the minimum comfortable one-thumb target on a phone.
        'min-h-[44px]',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
});
