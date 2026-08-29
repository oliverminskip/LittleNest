interface Pillar {
  icon: string;
  title: string;
  body: string;
  proof: string;
}

/** The five pillars, written as what a minder gets rather than what we built. */
const PILLARS: Pillar[] = [
  {
    icon: '👆',
    title: 'One-handed batch logging',
    body: 'Select three, four, five children and log lunch, a nap or a nappy change for all of them in a single tap — while you are still holding a baby.',
    proof: 'Saves ~40 taps a day',
  },
  {
    icon: '📋',
    title: 'Ofsted attendance & EYFS registers',
    body: 'Signed in and out to the minute, with contracted hours snapshotted so a later change can never rewrite a signed register. Observations tag straight to the seven areas of learning.',
    proof: 'Inspection-ready',
  },
  {
    icon: '💬',
    title: 'Instant 2-way parent messaging',
    body: 'Parents see the day as it happens and reply in the same thread. No WhatsApp group at 9pm, no personal number given out — with a one-tap WhatsApp handoff when you do want it.',
    proof: 'Your evenings back',
  },
  {
    icon: '🧾',
    title: 'Smart funded-hours invoicing',
    body: '15 and 30 hours, term-time or stretched, with meals and consumables on their own lines and every ad-hoc late pickup already in the ledger. Download a PDF and send it.',
    proof: 'No more spreadsheets',
  },
  {
    icon: '🔒',
    title: 'Zero-cloud photo privacy',
    body: 'Photos are compressed on your phone before a single byte leaves it, then stored inside your own setting — never in a shared pool, never used to train anything, never sold on.',
    proof: 'GDPR by design',
  },
];

export function FeatureShowcase() {
  return (
    <section id="features" className="px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-site">
        <p className="ln-eyebrow">Five things nursery software gets wrong</p>
        <h2 className="mt-2 max-w-2xl text-[30px] leading-tight sm:text-[38px]">
          Everything a home childminder actually needs. Nothing they don't.
        </h2>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <article
              key={pillar.title}
              className={`rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:shadow-md ${
                // The first card spans two columns on large screens so the row
                // of five never leaves a lonely orphan at the end.
                index === 0 ? 'lg:col-span-2' : ''
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-[24px]">
                {pillar.icon}
              </div>
              <h3 className="text-[20px]">{pillar.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">{pillar.body}</p>
              <p className="mt-4 inline-flex rounded-full bg-moss-bg px-3 py-1 text-[12px] font-extrabold text-moss">
                {pillar.proof}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
