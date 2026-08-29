import { Button } from '@/components/ui/Button';
import { PRICING } from '@/lib/constants';
import { formatMoney } from '@/lib/format';

const INCLUDED = [
  'Unlimited children and parents',
  'Batch logging, registers & EYFS journeys',
  'Funded-hours invoicing with PDF export',
  'Ratio & capacity planner',
  'Private photo storage',
  "Works offline, syncs when you’re back",
];

export function PricingTile({ onSignUp }: { onSignUp: () => void }) {
  const yearlyMonthly = PRICING.yearly / 12;
  const savedVsCompetitor = (PRICING.competitorMonthly - PRICING.monthly) * 12;

  return (
    <section id="pricing" className="px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-site">
        <p className="ln-eyebrow">Pricing</p>
        <h2 className="mt-2 text-[30px] leading-tight sm:text-[38px]">
          One price. Every feature. No per-child fee.
        </h2>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-4xl border-2 border-brand-500 bg-white p-6 shadow-md sm:p-8">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="font-display text-[52px] font-semibold leading-none text-brand-600">
                £{PRICING.monthly}
              </span>
              <span className="pb-2 text-[15px] font-extrabold text-ink-sub">per month</span>
              <span className="ml-auto rounded-full bg-gold-bg px-3 py-1.5 text-[12.5px] font-extrabold text-gold">
                or {formatMoney(PRICING.yearly)}/year — {formatMoney(yearlyMonthly)}/mo
              </span>
            </div>

            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[14.5px] font-semibold text-ink-soft">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-moss-bg text-[11px] font-black text-moss">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Button size="lg" fullWidth className="mt-7" onClick={onSignUp}>
              Create your setting account
            </Button>
            <p className="mt-3 text-center text-[12.5px] text-ink-sub">
              Cancel any time. Export your data whenever you like.
            </p>
          </div>

          <div className="rounded-4xl border border-line bg-white p-6 shadow-sm sm:p-8">
            <p className="ln-eyebrow">Compared with nursery software</p>
            <div className="mt-5 space-y-4">
              <Compare name="LittleNest" price={`£${PRICING.monthly}/mo`} highlight />
              <Compare name="Famly, Blossom & co." price={`from £${PRICING.competitorMonthly}/mo`} />
            </div>
            <div className="mt-6 rounded-2xl bg-brand-50 p-4">
              <p className="font-display text-[27px] font-semibold leading-none text-brand-600">
                {formatMoney(savedVsCompetitor)}
              </p>
              <p className="mt-1.5 text-[13px] font-bold leading-snug text-ink-sub">
                saved in your first year versus nursery pricing — roughly a week of childminding
                income back in your pocket.
              </p>
            </div>
            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
              Competitor pricing is indicative of published nursery tiers and varies by setting size.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Compare({ name, price, highlight }: { name: string; price: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-4 py-3.5 ${
        highlight ? 'bg-brand-600 text-white' : 'border border-line bg-white'
      }`}
    >
      <span className="text-[14.5px] font-extrabold">{name}</span>
      <span className={`text-[15px] font-black ${highlight ? '' : 'text-ink-sub'}`}>{price}</span>
    </div>
  );
}
