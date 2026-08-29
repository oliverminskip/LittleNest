/**
 * Firestore security-rules tests.
 *
 * These assert the tenant boundary that the whole product rests on: a parent
 * can reach exactly the children they were invited to and nothing else, and a
 * childminder can never see inside another minder's setting.
 *
 * Run with: npm run test:rules
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc } from 'firebase/firestore';

const MINDER_A = 'minder-a';
const MINDER_B = 'minder-b';
const PARENT_A = 'parent-a';
const OUTSIDER = 'outsider';

const SETTING_A = 'setting-a';
const SETTING_B = 'setting-b';
const CHILD_1 = 'child-1';
const CHILD_2 = 'child-2';

const testEnv = await initializeTestEnvironment({
  projectId: 'littlenest-rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

/** Seed the two settings with rules bypassed. */
await testEnv.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'settings', SETTING_A), { name: "Fran's", minderUid: MINDER_A });
  await setDoc(doc(db, 'settings', SETTING_B), { name: "Other", minderUid: MINDER_B });

  await setDoc(doc(db, 'settings', SETTING_A, 'children', CHILD_1), {
    name: 'Evie',
    parentUids: [PARENT_A],
    parentEmails: ['p@example.com'],
    setupCode: 'LN-AAAA',
  });
  await setDoc(doc(db, 'settings', SETTING_A, 'children', CHILD_2), {
    name: 'Noah',
    parentUids: [],
    parentEmails: [],
    setupCode: 'LN-BBBB',
  });

  await setDoc(doc(db, 'settings', SETTING_A, 'children', CHILD_1, 'entries', 'e1'), {
    type: 'meal',
    detail: 'Pasta',
  });
  await setDoc(doc(db, 'settings', SETTING_A, 'children', CHILD_1, 'messages', 'm1'), {
    from: 'minder',
    text: 'Hello',
    readByMinder: true,
    readByParent: false,
  });
  await setDoc(doc(db, 'settings', SETTING_A, 'invoices', 'inv1'), { number: 'LN-1', total: 100 });

  await setDoc(doc(db, 'users', PARENT_A), {
    role: 'parent',
    settingId: SETTING_A,
    email: 'p@example.com',
    name: 'Parent',
  });

  await setDoc(doc(db, 'invites', 'LN-BBBB'), {
    settingId: SETTING_A,
    childId: CHILD_2,
    childName: 'Noah',
    status: 'pending',
  });
});

const minderA = testEnv.authenticatedContext(MINDER_A).firestore();
const minderB = testEnv.authenticatedContext(MINDER_B).firestore();
const parentA = testEnv.authenticatedContext(PARENT_A).firestore();
const outsider = testEnv.authenticatedContext(OUTSIDER).firestore();
const anon = testEnv.unauthenticatedContext().firestore();

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (err) {
    results.push(['FAIL', `${name} — ${err.message.split('\n')[0]}`]);
  }
}

/* ── The minder owns their setting ─────────────────────── */

await check('minder reads their own children', () =>
  assertSucceeds(getDocs(collection(minderA, 'settings', SETTING_A, 'children'))),
);
await check('minder writes a diary entry', () =>
  assertSucceeds(
    addDoc(collection(minderA, 'settings', SETTING_A, 'children', CHILD_1, 'entries'), {
      type: 'nap',
      detail: 'Slept well',
    }),
  ),
);
await check('minder reads their own invoices', () =>
  assertSucceeds(getDocs(collection(minderA, 'settings', SETTING_A, 'invoices'))),
);

/* ── Cross-tenant isolation ────────────────────────────── */

await check('another minder CANNOT read this setting\'s children', () =>
  assertFails(getDocs(collection(minderB, 'settings', SETTING_A, 'children'))),
);
await check('another minder CANNOT read a child document', () =>
  assertFails(getDoc(doc(minderB, 'settings', SETTING_A, 'children', CHILD_1))),
);
await check('another minder CANNOT read diary entries', () =>
  assertFails(getDocs(collection(minderB, 'settings', SETTING_A, 'children', CHILD_1, 'entries'))),
);
await check('another minder CANNOT read invoices', () =>
  assertFails(getDocs(collection(minderB, 'settings', SETTING_A, 'invoices'))),
);
await check('another minder CANNOT take over the setting', () =>
  assertFails(updateDoc(doc(minderB, 'settings', SETTING_A), { minderUid: MINDER_B })),
);
await check('the owner CANNOT reassign minderUid either', () =>
  assertFails(updateDoc(doc(minderA, 'settings', SETTING_A), { minderUid: MINDER_B })),
);

/* ── Parent scope ──────────────────────────────────────── */

await check('parent reads their own child', () =>
  assertSucceeds(getDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_1))),
);
await check('parent reads their child\'s diary', () =>
  assertSucceeds(getDocs(collection(parentA, 'settings', SETTING_A, 'children', CHILD_1, 'entries'))),
);
await check('parent CANNOT read another child in the same setting', () =>
  assertFails(getDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_2))),
);
await check('parent CANNOT list all children in the setting', () =>
  assertFails(getDocs(collection(parentA, 'settings', SETTING_A, 'children'))),
);
await check('parent CANNOT read the setting\'s invoices', () =>
  assertFails(getDocs(collection(parentA, 'settings', SETTING_A, 'invoices'))),
);
await check('parent CANNOT write a diary entry', () =>
  assertFails(
    addDoc(collection(parentA, 'settings', SETTING_A, 'children', CHILD_1, 'entries'), {
      type: 'note',
      detail: 'forged',
    }),
  ),
);
await check('parent CANNOT log overtime against themselves', () =>
  assertFails(
    addDoc(collection(parentA, 'settings', SETTING_A, 'children', CHILD_1, 'overtime'), {
      minutes: -60,
    }),
  ),
);

/* ── Parent self-service updates ───────────────────────── */

await check('parent updates their own contact details', () =>
  assertSucceeds(
    updateDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_1), {
      parentPhone: '07700900123',
      medicalNotes: 'Peanut allergy',
    }),
  ),
);
await check('parent CANNOT change the child\'s billing', () =>
  assertFails(
    updateDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_1), {
      billing: { hourlyRate: 0 },
    }),
  ),
);
await check('parent CANNOT change the contracted schedule', () =>
  assertFails(
    updateDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_1), {
      schedule: { 1: { start: '00:00', end: '23:59' } },
    }),
  ),
);
await check('parent CANNOT remove themselves and add a stranger', () =>
  assertFails(
    updateDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_1), {
      parentUids: [OUTSIDER],
    }),
  ),
);
await check('parent CANNOT bolt a stranger onto the child', () =>
  assertFails(
    updateDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_1), {
      parentUids: [PARENT_A, OUTSIDER],
    }),
  ),
);

/* ── Messaging ─────────────────────────────────────────── */

await check('parent sends a message as "parent"', () =>
  assertSucceeds(
    addDoc(collection(parentA, 'settings', SETTING_A, 'children', CHILD_1, 'messages'), {
      from: 'parent',
      text: 'Running late',
      readByParent: true,
      readByMinder: false,
    }),
  ),
);
await check('minder may still write the legacy "fran" marker during cutover', () =>
  assertSucceeds(
    addDoc(collection(minderA, 'settings', SETTING_A, 'children', CHILD_1, 'messages'), {
      from: 'fran',
      text: 'Sent from the old GitHub Pages build',
    }),
  ),
);
await check('parent CANNOT impersonate the minder via the legacy marker', () =>
  assertFails(
    addDoc(collection(parentA, 'settings', SETTING_A, 'children', CHILD_1, 'messages'), {
      from: 'fran',
      text: 'Forged',
      readByParent: true,
      readByMinder: false,
    }),
  ),
);
await check('parent CANNOT impersonate the minder', () =>
  assertFails(
    addDoc(collection(parentA, 'settings', SETTING_A, 'children', CHILD_1, 'messages'), {
      from: 'minder',
      text: 'Forged',
      readByParent: true,
      readByMinder: false,
    }),
  ),
);
await check('parent marks a message read', () =>
  assertSucceeds(
    updateDoc(doc(parentA, 'settings', SETTING_A, 'children', CHILD_1, 'messages', 'm1'), {
      readByParent: true,
    }),
  ),
);
await check('nobody can rewrite message text', () =>
  assertFails(
    updateDoc(doc(minderA, 'settings', SETTING_A, 'children', CHILD_1, 'messages', 'm1'), {
      text: 'Rewritten history',
    }),
  ),
);

/* ── Invites ───────────────────────────────────────────── */

await check('a signed-in user can validate an invite code', () =>
  assertSucceeds(getDoc(doc(outsider, 'invites', 'LN-BBBB'))),
);
await check('nobody can enumerate the invite code space', () =>
  assertFails(getDocs(collection(outsider, 'invites'))),
);
await check('an invite can be redeemed once', () =>
  assertSucceeds(
    updateDoc(doc(outsider, 'invites', 'LN-BBBB'), {
      status: 'used',
      usedBy: OUTSIDER,
      settingId: SETTING_A,
      childId: CHILD_2,
    }),
  ),
);
await check('a used invite CANNOT be redeemed again', () =>
  assertFails(
    updateDoc(doc(parentA, 'invites', 'LN-BBBB'), {
      status: 'used',
      usedBy: PARENT_A,
      settingId: SETTING_A,
      childId: CHILD_2,
    }),
  ),
);

/* ── Profiles & anonymous access ───────────────────────── */

await check('a user CANNOT read another user\'s profile', () =>
  assertFails(getDoc(doc(outsider, 'users', PARENT_A))),
);
await check('a parent CANNOT promote themselves to minder', () =>
  assertFails(updateDoc(doc(parentA, 'users', PARENT_A), { role: 'minder' })),
);
await check('a parent CANNOT hop to another setting', () =>
  assertFails(updateDoc(doc(parentA, 'users', PARENT_A), { settingId: SETTING_B })),
);
await check('anonymous visitors read nothing', () =>
  assertFails(getDoc(doc(anon, 'settings', SETTING_A, 'children', CHILD_1))),
);

await testEnv.cleanup();

const failures = results.filter(([status]) => status === 'FAIL');
results.forEach(([status, name]) => console.log(`${status === 'PASS' ? '  ✓' : '  ✗'} ${name}`));
console.log(`\n${results.length - failures.length}/${results.length} rules assertions passed.`);
assert.equal(failures.length, 0, `${failures.length} security rule assertion(s) failed`);
