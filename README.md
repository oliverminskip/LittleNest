# LittleNest 🪺

The warm, lightweight management PWA for UK home childminders — the alternative to
Famly and Blossom, built for the one of you rather than a twelve-person nursery.

Rebuilt from a single 957-line `index.html` into a Vite + React + TypeScript app on
Firebase. The original file is preserved untouched at [`legacy/index.html`](legacy/index.html).

---

## What's in the box

| Pillar | Where it lives |
| --- | --- |
| **One-handed batch logging** — log a meal, nap or nappy for 3–5 children in one atomic write | `src/components/dashboard/BatchLogSheet.tsx`, `addEntryToMany` |
| **Ad-hoc hours & late drop-off timer** — one-tap 15m/30m/1h punches that feed the invoice ledger | `src/components/dashboard/OvertimeSheet.tsx` |
| **Smart funded-hours invoicing** — 15/30 hours, term-time vs stretched, top-ups, overtime, PDF | `src/lib/funding.ts`, `src/lib/invoice.ts`, `src/lib/pdf.ts` |
| **Visual ratio & capacity timeline** — drag sessions against statutory ratios, project when spaces open | `src/lib/ratios.ts`, `src/components/dashboard/RatioTimeline.tsx` |
| **Client-side photo compression** — 1200px / 75% quality before a byte leaves the device | `src/lib/image.ts`, `src/services/firebase/storage.ts` |
| **Public landing page + funded-hours calculator** | `src/components/public/` |

---

## Architecture

```
littlenest/
├── .github/workflows/     deploy.yml · preview.yml · rules.yml
├── firebase.json          Hosting, rules and emulator config
├── .firebaserc            Project + hosting target aliases
├── firestore.rules        Strict per-tenant isolation (33 tests)
├── storage.rules          Photo access, mirrors the Firestore tenancy
├── legacy/                The original single-file app, for reference
├── scripts/               Test-bundle build
├── tests/                 rules.test.mjs · logic.test.mjs
└── src/
    ├── components/
    │   ├── public/        Landing page: Hero, FeatureShowcase, PricingTile,
    │   │                  FundingCalculator, AuthSheet, ParentInviteSheet
    │   ├── dashboard/     ChildDashCard, BatchLogSheet, OvertimeSheet, RatioTimeline
    │   ├── child/         Diary/Journey/Chat/Profile tabs, composers, PhotoPicker
    │   ├── invoicing/     InvoiceBuilder, InvoicesScreen
    │   ├── ui/            Button, Card, Sheet, Primitives
    │   └── AppShell.tsx   Signed-in frame, bottom nav, offline banner
    ├── screens/           Onboarding, MinderDashboard, ChildScreen, ParentHome,
    │                      TimelineScreen, InvoicingScreen, SettingsScreen
    ├── services/firebase/ config · paths · auth · data · storage
    ├── hooks/             useAuth, useCollection, useChildren, useChildData,
    │                      useSelection, useLongPress, useToast, useOnlineStatus
    ├── lib/               dates · funding · ratios · invoice · pdf · image ·
    │                      format · constants
    └── types/             Shared domain model
```

### Routing

`AppRoutes` gates on the Firebase session, so the public site is never shown to
someone who already has one:

| Session state | Route |
| --- | --- |
| No session | `/` → public landing page |
| Authenticated, no profile document | `/onboarding` → pick childminder or parent |
| `role: 'minder'` | `/app` · `/app/timeline` · `/app/invoices` · `/app/settings` · `/app/child/:id` |
| `role: 'parent'` | `/parent` · `/parent/child/:id` (a single-child parent is sent straight in) |

### Data model

```
users/{uid}                                 role, name, email, settingId, childIds
settings/{settingId}                        name, minderUid, billing, ratioLimits, ofstedUrn
  children/{childId}                        name, dob, colour, parentUids, setupCode,
    │                                       schedule, funding, billing, contacts
    ├── entries/{id}                        diary: type, detail, times, portion, photo, batchId
    ├── observations/{id}                   EYFS: title, note, areas[], nextSteps, photo
    ├── messages/{id}                       from, text, readByMinder, readByParent
    ├── attendance/{YYYY-MM-DD}             signInAt, signOutAt, planned hours
    └── overtime/{id}                       date, minutes, reason, rate, invoicedIn
  invoices/{id}                             number, lines[], totals, status, dueDate
invites/{CODE}                              settingId, childId, childName, status
```

### Offline persistence

`src/services/firebase/config.ts` initialises Firestore with `persistentLocalCache`
and the multi-tab manager — the modern replacement for `enableIndexedDbPersistence`.
Reads resolve from IndexedDB with no signal and writes queue locally, flushing in
order when connectivity returns. `useCollection` surfaces `fromCache`, and
`useOnlineStatus` drives the "working offline" banner, so the UI can be honest
about what has actually reached the server. Private-browsing contexts that block
IndexedDB fall back to a memory cache rather than failing to start.

---

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev                 # http://localhost:5173
```

Against the emulator suite (no live parent data touched):

```bash
npm run emulators                          # terminal 1
VITE_USE_EMULATORS=1 npm run dev           # terminal 2
```

### Tests

```bash
npm test              # everything
npm run test:logic    # funding, ratio and invoice maths (20 assertions)
npm run test:rules    # Firestore tenant isolation (33 assertions, needs Java)
```

`test:logic` runs against esbuild-compiled bundles of the real `src/lib` modules,
so what is tested is what ships.

---

## Firebase setup, from scratch

Run these once, from the repository root.

**1. Install the CLI and sign in**

```bash
npm install -g firebase-tools
firebase login
```

**2. Point the repo at the project**

`.firebaserc` and `firebase.json` are already committed, so you can skip the
interactive wizard. If you do want to re-run it, decline every overwrite prompt:

```bash
firebase use littlenest94

# Optional — only if regenerating config. Answer:
#   Public directory:            dist
#   Single-page app rewrite:     Yes
#   Set up automatic builds:     No   (the committed workflows do this)
#   Overwrite dist/index.html:   No
firebase init hosting
```

**3. Apply the hosting target**

The `app` target is what `firebase.json` and both workflows deploy to:

```bash
firebase target:apply hosting app littlenest94
```

For a separate staging site, create it in the console then:

```bash
firebase target:apply hosting staging littlenest94-staging
```

**4. Enable the services**

In the Firebase console for `littlenest94`:

- **Authentication → Sign-in method →** enable **Email/Password**.
- **Authentication → Settings → Authorized domains →** add your custom domain.
- **Firestore Database →** create in Native mode, region `europe-west2` (London).
- **Storage →** enable, same region.

**5. Ship the rules before the first real sign-up**

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

**6. First manual deploy**

```bash
npm run build
firebase deploy --only hosting        # or: npm run deploy
```

The app is then live at `https://littlenest94.web.app`.

---

## CI/CD

| Workflow | Trigger | Does |
| --- | --- | --- |
| `deploy.yml` | push to `main` | `npm ci` → `tsc -b` → `npm run build` → deploy to the live channel |
| `preview.yml` | pull request | Builds and deploys to a 7-day preview URL, commented on the PR |
| `rules.yml` | push to `main` touching `*.rules` / indexes | Deploys Firestore and Storage rules |

Rules deploy separately from hosting so a UI change can never silently widen data
access, and a rules fix can ship without a full rebuild.

### One-time GitHub configuration

**Service account** — generates the deploy credential and writes it into the repo
as `FIREBASE_SERVICE_ACCOUNT`:

```bash
firebase init hosting:github
```

If you'd rather do it by hand: Firebase console → Project settings → Service
accounts → **Generate new private key**, then paste the whole JSON into
GitHub → Settings → Secrets and variables → Actions → **New repository secret**,
named `FIREBASE_SERVICE_ACCOUNT`.

**Build variables** — add each `VITE_FIREBASE_*` key from `.env.example` under the
same page's **Variables** tab. They are public client identifiers, so variables
rather than secrets is correct; the workflows read them via `${{ vars.* }}`.

### Migrating off GitHub Pages

The old deployment at `oliverminskip.github.io/LittleNest/` is superseded. Once
Firebase Hosting is live, turn Pages off under **Settings → Pages → Source → None**.
Nothing in the repo publishes to Pages any more.

Both builds talk to the same Firestore project, so during the cutover they have to
coexist. Two compatibility points are handled for you:

- **Message senders.** The old app wrote the childminder's messages as
  `from: 'fran'` (`legacy/index.html:774`). Reads normalise it via
  `senderRole()` in `src/lib/messages.ts` — without that, every message sent
  before the rebuild would render as if the parent had sent it. The rules also
  accept `'fran'` on create, but only from an authenticated owner of the
  setting, so the old build keeps working until Pages is off. **Once it is,
  drop `'fran'` from the `allow create` in `firestore.rules`** — the read-side
  shim stays, since the historical documents do not change.
- **Dates of birth.** The old app stored `DD/MM/YYYY`; `parseDob()` accepts both
  that and ISO `YYYY-MM-DD`, so existing children keep working in the ratio
  engine without a migration.

---

## Security model

Two roles, deliberately asymmetric, enforced entirely in `firestore.rules`:

- A **childminder** owns exactly one setting (`settings/{id}.minderUid == uid`) and
  has full access beneath it.
- A **parent** reaches only the child documents whose `parentUids` contains their
  uid — never a child list, never another family's child, never invoices. They may
  maintain their own contact and medical details and nothing else: the rules pin
  `parentUids` so a parent can only ever append themselves, and pin `role` and
  `settingId` on their own profile so they cannot promote themselves or hop tenants.

Message text is immutable once written; updates are restricted to the two read-receipt
fields. Invite codes are readable by any signed-in user so a code can be validated
before an account exists, but `list` is denied so the code space cannot be enumerated,
and a code can only be burned once.

`npm run test:rules` asserts all of this against the emulator, including that a
parent cannot impersonate the childminder through the legacy `'fran'` marker.

---

## Notes on the numbers

Funded-hours maths lives in one place, `src/lib/funding.ts`, shared by the public
calculator and the in-app invoice builder — so the figure a visitor sees on the
landing page is the figure LittleNest will actually invoice.

The statutory term-time offer is 38 weeks a year. A stretched place spreads the same
annual allocation across more weeks:

```
annual funded hours    = entitlement × 38
stretched weekly hours = annual funded hours ÷ stretch weeks
```

Meals and consumables stay on their own invoice lines, and funded hours are shown at
£0 rather than netted off silently — both because parents should see the value of
their entitlement, and because an invoice that hides it looks like a top-up charged
as a condition of the funded place.

Ratio limits default to the England statutory maximums for a childminder working
alone (1 under-one, 3 under-fives, 6 under-eights) and are stored per setting, since
Ofsted can agree variations for siblings and continuity of care.

> Funding figures are guidance. Local authority hourly rates vary — check your
> council's published rate and your own contracts before invoicing.
