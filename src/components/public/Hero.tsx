import { Button } from '@/components/ui/Button';
import { PRICING } from '@/lib/constants';

interface HeroProps {
  onSignUp: () => void;
  onSignIn: () => void;
  onParentInvite: () => void;
}

export function Hero({ onSignUp, onSignIn, onParentInvite }: HeroProps) {
  return (
    <header className="relative overflow-hidden px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
      <div className="mx-auto grid max-w-site items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-brand-700 shadow-sm">
            🪺 Built for solo UK childminders
          </span>

          <h1 className="mt-5 text-[38px] leading-[1.05] sm:text-[52px]">
            The warm, lightweight alternative to{' '}
            <span className="text-brand-600">Famly &amp; Blossom</span>
          </h1>

          <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-ink-soft">
            Nursery software is built for nurseries — twelve staff logins, a training
            call and £49 a month. LittleNest is built for the one of you: batch-log five
            children in a single tap, keep an Ofsted-ready register, invoice funded hours
            without a spreadsheet, and message parents from the same screen.
            <strong className="text-ink"> Just £{PRICING.monthly} a month.</strong>
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onSignUp} className="sm:flex-1">
              Create your setting account
            </Button>
            <Button size="lg" variant="ghost" onClick={onSignIn} className="sm:flex-1">
              Sign in
            </Button>
          </div>

          <button
            type="button"
            onClick={onParentInvite}
            className="mt-4 inline-flex items-center gap-2 text-[14.5px] font-extrabold text-brand-600 underline underline-offset-4"
          >
            👋 I'm a parent with an invite code
          </button>

          <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-line pt-6">
            <Stat value="1 tap" label="to log 5 children" />
            <Stat value="£5/mo" label="flat, no per-child fee" />
            <Stat value="Offline" label="works in the park" />
          </dl>
        </div>

        <HeroPreview />
      </div>
    </header>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-display text-[24px] font-semibold leading-none text-brand-600">{value}</dt>
      <dd className="mt-1.5 text-[12.5px] font-bold leading-tight text-ink-sub">{label}</dd>
    </div>
  );
}

/** A static, hand-built mock of the dashboard — no screenshot to go stale. */
function HeroPreview() {
  const children = [
    { name: 'Evie', age: '3y 2m', colour: '#6C5CE7', status: 'In since 08:15', tone: 'in' as const },
    { name: 'Noah', age: '11m', colour: '#C26B4E', status: 'In since 08:40', tone: 'in' as const },
    { name: 'Ada', age: '2y 7m', colour: '#5B9A8B', status: 'In since 09:00', tone: 'in' as const },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute -inset-6 -z-10 rounded-[48px] bg-gradient-to-br from-brand-200/50 to-gold-bg/60 blur-2xl" />
      <div className="rounded-[36px] border-[6px] border-ink/90 bg-cream p-3 shadow-lg">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <p className="font-display text-[19px] font-semibold">Good morning, Fran</p>
          <span className="text-[11px] font-extrabold text-ink-sub">Tue 3</span>
        </div>

        <div className="mb-3 flex items-center justify-between rounded-2xl bg-brand-600 px-3.5 py-3 text-white">
          <span className="text-[13px] font-extrabold">3 selected</span>
          <span className="rounded-lg bg-white/20 px-2.5 py-1 text-[12px] font-extrabold">
            🍽️ Log lunch
          </span>
        </div>

        {children.map((child) => (
          <div
            key={child.name}
            className="mb-2 flex items-center gap-3 rounded-2xl border border-brand-300 bg-white p-2.5 shadow-sm"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-md bg-brand-500 text-[10px] font-black text-white">
              ✓
            </span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl font-display text-[15px] font-black text-white"
              style={{ background: child.colour }}
            >
              {child.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-black">{child.name}</span>
              <span className="block text-[11px] font-bold text-moss">● {child.status}</span>
            </span>
            <span className="text-[11px] font-extrabold text-ink-faint">{child.age}</span>
          </div>
        ))}

        <div className="mt-3 rounded-2xl border border-line bg-white p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-ink-sub">Ratio right now</p>
          <div className="mt-2 flex gap-2">
            {[
              { label: 'U1', used: 1, limit: 1 },
              { label: 'U5', used: 3, limit: 3 },
              { label: 'U8', used: 3, limit: 6 },
            ].map((band) => (
              <span
                key={band.label}
                className={`flex-1 rounded-lg px-2 py-1.5 text-center text-[11px] font-black ${
                  band.used >= band.limit ? 'bg-gold-bg text-gold' : 'bg-moss-bg text-moss'
                }`}
              >
                {band.label} {band.used}/{band.limit}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
