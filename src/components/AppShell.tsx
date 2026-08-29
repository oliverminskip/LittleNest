import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/format';

const NAV = [
  { to: '/app', label: 'Today', icon: '🏠', end: true },
  { to: '/app/timeline', label: 'Ratios', icon: '📊', end: false },
  { to: '/app/invoices', label: 'Invoices', icon: '🧾', end: false },
  { to: '/app/settings', label: 'Settings', icon: '⚙️', end: false },
];

/**
 * The signed-in app frame: 480px column, bottom nav, offline banner.
 *
 * Child detail pages render their own bottom nav (diary/journey/chat/profile),
 * so the setting-level nav is suppressed there rather than stacking two bars.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  const inChildView = pathname.includes('/child/');

  return (
    <div className="relative mx-auto min-h-screen max-w-app px-4 pb-32 pt-5">
      {!online ? (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-gold/25 bg-gold-bg px-3.5 py-2.5">
          <span className="text-[16px]">📴</span>
          <p className="text-[12.5px] font-extrabold leading-snug text-ink-soft">
            Working offline — everything you log is saved here and will sync when you're back.
          </p>
        </div>
      ) : null}

      {children}

      {inChildView ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app border-t border-line bg-white/90 px-1.5 pb-[calc(7px+var(--safe-b))] pt-1.5 backdrop-blur-xl">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-extrabold transition',
                  isActive ? 'text-brand-500' : 'text-ink-faint',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn('text-[21px] leading-none transition', isActive && '-translate-y-0.5 scale-110')}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function ParentShell({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();

  return (
    <div className="relative mx-auto min-h-screen max-w-app px-4 pb-32 pt-5">
      {!online ? (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-gold/25 bg-gold-bg px-3.5 py-2.5">
          <span className="text-[16px]">📴</span>
          <p className="text-[12.5px] font-extrabold leading-snug text-ink-soft">
            You're offline — showing the last update we saved to this device.
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}
