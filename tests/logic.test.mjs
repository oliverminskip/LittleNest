/**
 * Business-logic tests for the parts that decide what a parent is charged and
 * whether a childminder is legally over ratio. Run against the compiled
 * bundle so what is tested is what ships.
 *
 * Run with: npm run test:logic
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { calculateFunding, fundedHoursPerWeek } = await import('../dist-test/funding.js');
const { findBreaches, bandsForAge, upcomingOpenings, blocksForDay } = await import('../dist-test/ratios.js');
const { buildInvoiceLines, contractedWeeklyHours, attendedHours } = await import('../dist-test/invoice.js');

const BILLING = {
  hourlyRate: 6.5,
  consumablesPerDay: 3,
  mealsPerDay: 3.5,
  fundedHourlyRate: 5.62,
  lateMultiplier: 1.5,
};

/* ── Funded hours ─────────────────────────────────────────── */

test('term-time funding pays the entitlement in full each funded week', () => {
  assert.equal(fundedHoursPerWeek(30, 'term-time', 51), 30);
  assert.equal(fundedHoursPerWeek(15, 'term-time', 51), 15);
});

test('stretched funding spreads 38 weeks of entitlement across the year', () => {
  // 30h × 38 weeks = 1140 annual hours; over 51 weeks that is 22.35h a week.
  assert.equal(fundedHoursPerWeek(30, 'stretched', 51), 22.35);
  assert.equal(fundedHoursPerWeek(15, 'stretched', 51), 11.18);
});

test('no entitlement means every hour is chargeable', () => {
  const result = calculateFunding({
    weeklyHours: 20, daysPerWeek: 3, entitlement: 0, model: 'term-time',
    stretchWeeks: 51, attendanceWeeks: 51, ...BILLING,
  });
  assert.equal(result.fundedHoursUsed, 0);
  assert.equal(result.chargeableHours, 20);
  assert.equal(result.chargeableCost, 130);
});

test('a stretched 30-hour place bills only the hours beyond the entitlement', () => {
  const result = calculateFunding({
    weeklyHours: 30, daysPerWeek: 4, entitlement: 30, model: 'stretched',
    stretchWeeks: 51, attendanceWeeks: 51, ...BILLING,
  });
  assert.equal(result.fundedHoursUsed, 22.35);
  assert.equal(result.chargeableHours, 7.65);
  assert.equal(result.chargeableCost, 49.73);
  assert.equal(result.mealsCost, 14);        // 4 days × £3.50
  assert.equal(result.consumablesCost, 12);  // 4 days × £3.00
  assert.equal(result.weeklyParentCost, 75.73);
  // The monthly figure is the annual bill / 12, not one week × 4.
  assert.equal(result.annualParentCost, 3862.23);
  assert.equal(result.monthlyParentCost, 321.85);
});

test('funded hours are capped at the hours actually attended', () => {
  const result = calculateFunding({
    weeklyHours: 10, daysPerWeek: 2, entitlement: 30, model: 'term-time',
    stretchWeeks: 51, attendanceWeeks: 38, ...BILLING,
  });
  assert.equal(result.fundedHoursUsed, 10);
  assert.equal(result.chargeableHours, 0);
  // The other 20h of entitlement is flagged, not silently absorbed.
  assert.equal(result.unusedEntitlement, 20);
});

test('nonsense input degrades to zero rather than NaN', () => {
  const result = calculateFunding({
    weeklyHours: Number.NaN, daysPerWeek: -3, entitlement: 15, model: 'stretched',
    stretchWeeks: 0, attendanceWeeks: 0, ...BILLING, hourlyRate: Number.NaN,
  });
  Object.values(result).forEach((value) => assert.ok(Number.isFinite(value), 'all outputs finite'));
  assert.equal(result.weeklyParentCost, 0);
});

/* ── Ratios ───────────────────────────────────────────────── */

test('age bands nest — a baby counts in all three', () => {
  assert.deepEqual(bandsForAge(0), ['underOne', 'underFive', 'underEight']);
  assert.deepEqual(bandsForAge(3), ['underFive', 'underEight']);
  assert.deepEqual(bandsForAge(6), ['underEight']);
  assert.deepEqual(bandsForAge(9), []);
});

const LIMITS = { underOne: 1, underFive: 3, underEight: 6 };
const block = (id, start, end, bands) => ({ childId: id, childName: id, colour: '#000', start, end, bands });

test('a compliant day reports no breaches', () => {
  const blocks = [
    block('a', 540, 1020, ['underOne', 'underFive', 'underEight']),
    block('b', 540, 1020, ['underFive', 'underEight']),
    block('c', 540, 1020, ['underFive', 'underEight']),
  ];
  assert.deepEqual(findBreaches(blocks, LIMITS), []);
});

test('a second under-one is caught, and only for the overlapping window', () => {
  const blocks = [
    block('a', 540, 720, ['underOne', 'underFive', 'underEight']),
    block('b', 660, 900, ['underOne', 'underFive', 'underEight']),
  ];
  const breaches = findBreaches(blocks, LIMITS);
  assert.equal(breaches.length, 1);
  assert.equal(breaches[0].band, 'underOne');
  assert.equal(breaches[0].count, 2);
  assert.equal(breaches[0].from, 660);  // 11:00, when the second baby arrives
  assert.equal(breaches[0].to, 720);    // 12:00, when the first one leaves
});

test('a fourth under-five breaches the under-five band only', () => {
  const blocks = ['a', 'b', 'c', 'd'].map((id) => block(id, 540, 1020, ['underFive', 'underEight']));
  const breaches = findBreaches(blocks, LIMITS);
  assert.equal(breaches.length, 1);
  assert.equal(breaches[0].band, 'underFive');
  assert.equal(breaches[0].count, 4);
});

test('adjacent breach windows merge into one reported range', () => {
  // Three under-ones with staggered ends produce several sweep slots at the
  // same headcount; the UI should see one breach, not a run of slivers.
  const blocks = [
    block('a', 540, 600, ['underOne']),
    block('b', 540, 660, ['underOne']),
  ];
  const breaches = findBreaches(blocks, LIMITS);
  assert.equal(breaches.length, 1);
  assert.equal(breaches[0].from, 540);
  assert.equal(breaches[0].to, 600);
});

test('capacity openings project the birthday that frees a space', () => {
  const today = new Date();
  const elevenMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, today.getDate());
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const openings = upcomingOpenings(
    [{ id: 'baby', name: 'Noah', dob: iso(elevenMonthsAgo), colour: '#000', parentUids: [], parentEmails: [], setupCode: '' }],
    LIMITS,
    today,
  );
  assert.equal(openings.length, 1);
  assert.equal(openings[0].band, 'underOne');
  assert.equal(openings[0].date.getFullYear(), elevenMonthsAgo.getFullYear() + 1);
});

test('a child with no scheduled session that day produces no block', () => {
  const child = {
    id: 'c', name: 'Evie', dob: '2022-01-01', colour: '#000',
    parentUids: [], parentEmails: [], setupCode: '',
    schedule: { 1: { start: '08:00', end: '17:00' } },
  };
  assert.equal(blocksForDay([child], 1, new Date()).length, 1);
  assert.equal(blocksForDay([child], 3, new Date()).length, 0);
});

/* ── Invoicing ────────────────────────────────────────────── */

const child = (overrides = {}) => ({
  id: 'c1', name: 'Evie Harper', dob: '2022-03-12', colour: '#6C5CE7',
  parentUids: ['p'], parentEmails: [], setupCode: 'LN-AAAA',
  schedule: { 1: { start: '08:00', end: '17:00' }, 2: { start: '08:00', end: '17:00' } },
  ...overrides,
});

test('contracted hours are summed across the scheduled days', () => {
  assert.deepEqual(contractedWeeklyHours(child()), { hours: 18, days: 2 });
});

test('an inverted or half-open session contributes nothing', () => {
  const broken = child({ schedule: { 1: { start: '17:00', end: '08:00' }, 2: { start: '08:00' } } });
  assert.deepEqual(contractedWeeklyHours(broken), { hours: 0, days: 2 });
});

test('attended hours only count days that were signed both in and out', () => {
  const stamp = (h, m) => ({ toDate: () => new Date(2026, 0, 5, h, m) });
  const records = [
    { date: '2026-01-05', signInAt: stamp(8, 0), signOutAt: stamp(17, 0) },
    { date: '2026-01-06', signInAt: stamp(8, 0), signOutAt: null },  // still in
    { date: '2026-01-07', signInAt: null, signOutAt: null },          // absent
  ];
  assert.deepEqual(attendedHours(records), { hours: 9, days: 1 });
});

test('funded hours appear as a £0 line so the parent sees their value', () => {
  const { lines, total, fundedValue } = buildInvoiceLines({
    child: child({ funding: { entitlement: 15, model: 'term-time', stretchWeeks: 51, fundedWeeksPerYear: 38 } }),
    periodStart: '2026-01-05', periodEnd: '2026-01-11',  // exactly one week
    billing: BILLING, attendance: [], overtime: [], useSchedule: true,
  });

  const funded = lines.find((line) => line.funded);
  assert.ok(funded, 'a funded line is present');
  assert.equal(funded.total, 0);
  assert.equal(funded.quantity, 15);

  const hours = lines.find((line) => line.label === 'Childcare hours');
  assert.equal(hours.quantity, 3);          // 18 contracted − 15 funded
  assert.equal(hours.total, 19.5);          // 3h × £6.50
  assert.equal(fundedValue, 97.5);          // 15h × £6.50, shown as a saving
  assert.equal(total, 19.5 + 7 + 6);        // hours + 2 days meals + 2 days consumables
});

test('overtime is billed at the late multiplier and never at the base rate', () => {
  const { lines } = buildInvoiceLines({
    child: child(),
    periodStart: '2026-01-05', periodEnd: '2026-01-11',
    billing: BILLING,
    attendance: [],
    overtime: [
      { id: 'o1', date: '2026-01-05', minutes: 30, reason: 'late-pickup', rate: 9.75, createdAt: null },
      { id: 'o2', date: '2026-01-07', minutes: 60, reason: 'late-pickup', rate: 9.75, createdAt: null },
    ],
    useSchedule: true,
  });

  const overtime = lines.find((line) => line.label === 'Ad-hoc & overtime');
  assert.equal(overtime.quantity, 1.5);
  assert.equal(overtime.unitPrice, 9.75);   // £6.50 × 1.5
  assert.equal(overtime.total, 14.63);
});

test('billing from the register uses attended hours, not the contract', () => {
  const stamp = (d, h) => ({ toDate: () => new Date(2026, 0, d, h, 0) });
  const { lines } = buildInvoiceLines({
    child: child(),
    periodStart: '2026-01-05', periodEnd: '2026-01-11',
    billing: BILLING,
    attendance: [{ date: '2026-01-05', signInAt: stamp(5, 9), signOutAt: stamp(5, 15) }],
    overtime: [],
    useSchedule: false,
  });

  const hours = lines.find((line) => line.label === 'Childcare hours');
  assert.equal(hours.quantity, 6);          // one signed 6-hour day, not 18 contracted
  assert.equal(hours.detail, 'Hours attended (signed register)');
});

test('an empty period produces an empty invoice rather than a phantom charge', () => {
  const { lines, total } = buildInvoiceLines({
    child: child({ schedule: {} }),
    periodStart: '2026-01-05', periodEnd: '2026-01-11',
    billing: BILLING, attendance: [], overtime: [], useSchedule: true,
  });
  assert.equal(lines.length, 0);
  assert.equal(total, 0);
});
