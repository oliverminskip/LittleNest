import { useCallback, useState } from 'react';
import { Hero } from './Hero';
import { FeatureShowcase } from './FeatureShowcase';
import { PricingTile } from './PricingTile';
import { FundingCalculator } from './FundingCalculator';
import { AuthSheet, type AuthMode } from './AuthSheet';
import { ParentInviteSheet } from './ParentInviteSheet';
import { Button } from '@/components/ui/Button';
import { PRICING } from '@/lib/constants';

/**
 * The unauthenticated site.
 *
 * Rendered only when there is no Firebase session — `<AppRouter>` sends a
 * signed-in visitor straight past this to their dashboard, so the landing page
 * never flashes for a returning user.
 */
export function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const openSignUp = useCallback(() => setAuthMode('sign-up'), []);
  const openSignIn = useCallback(() => setAuthMode('sign-in'), []);
  const openInvite = useCallback(() => setInviteOpen(true), []);

  return (
    <div className="min-h-screen">
      <SiteNav onSignIn={openSignIn} onSignUp={openSignUp} />

      <main>
        <Hero onSignUp={openSignUp} onSignIn={openSignIn} onParentInvite={openInvite} />
        <FeatureShowcase />

        <section id="calculator" className="px-5 py-4 sm:px-8">
          <div className="mx-auto max-w-site">
            <FundingCalculator onSignUp={openSignUp} />
          </div>
        </section>

        <PricingTile onSignUp={openSignUp} />

        <section className="px-5 pb-16 sm:px-8">
          <div className="mx-auto max-w-site overflow-hidden rounded-4xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-12 text-center text-white sm:px-12">
            <h2 className="mx-auto max-w-2xl text-[28px] leading-tight text-white sm:text-[36px]">
              Get your evenings back for the price of two coffees
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-white/85">
              Set your nest up in under five minutes. Add your children, share their invite codes,
              and log your first day tonight.
            </p>
            <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="ghost"
                fullWidth
                onClick={openSignUp}
                className="!text-brand-700"
              >
                Create setting account — £{PRICING.monthly}/mo
              </Button>
            </div>
            <button
              type="button"
              onClick={openInvite}
              className="mt-4 text-[14px] font-extrabold text-white/85 underline underline-offset-4"
            >
              I'm a parent with an invite code
            </button>
          </div>
        </section>
      </main>

      <SiteFooter onParentInvite={openInvite} />

      <AuthSheet mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} />
      <ParentInviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function SiteNav({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <nav className="sticky top-0 z-20 border-b border-line/70 bg-cream/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-site items-center gap-3 px-5 py-3 sm:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-[18px] shadow-sm">
            🪺
          </span>
          <span className="font-display text-[20px] font-semibold">LittleNest</span>
        </a>

        <div className="mx-auto hidden items-center gap-6 md:flex">
          <a href="#features" className="text-[14px] font-extrabold text-ink-sub hover:text-ink">
            Features
          </a>
          <a href="#calculator" className="text-[14px] font-extrabold text-ink-sub hover:text-ink">
            Funding calculator
          </a>
          <a href="#pricing" className="text-[14px] font-extrabold text-ink-sub hover:text-ink">
            Pricing
          </a>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="plain" onClick={onSignIn}>
            Sign in
          </Button>
          <Button size="sm" onClick={onSignUp}>
            Get started
          </Button>
        </div>
      </div>
    </nav>
  );
}

function SiteFooter({ onParentInvite }: { onParentInvite: () => void }) {
  return (
    <footer className="border-t border-line px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-site flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-[19px] font-semibold">🪺 LittleNest</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-sub">
            The warm little app for childminders and families. Built in the UK, for the EYFS,
            by someone who has actually done the 5pm handover.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 text-[13.5px]">
          <div className="space-y-2">
            <p className="ln-eyebrow">Product</p>
            <a className="block font-bold text-ink-sub" href="#features">Features</a>
            <a className="block font-bold text-ink-sub" href="#calculator">Funding calculator</a>
            <a className="block font-bold text-ink-sub" href="#pricing">Pricing</a>
          </div>
          <div className="space-y-2">
            <p className="ln-eyebrow">Parents</p>
            <button type="button" onClick={onParentInvite} className="block font-bold text-ink-sub">
              Use an invite code
            </button>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-site text-[12px] text-ink-faint">
        © {new Date().getFullYear()} LittleNest. Funding figures are guidance only — always check
        your local authority's published rates.
      </p>
    </footer>
  );
}
