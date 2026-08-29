import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, browserLocalPersistence, connectAuthEmulator, setPersistence } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

/**
 * Config is read from Vite env vars so staging and production can point at
 * different projects, with the live project as the fallback. Firebase web keys
 * are public identifiers, not secrets — access is enforced by Firestore and
 * Storage rules (see `firestore.rules`, `storage.rules`).
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyCPl0p0di8yTNhZVPEP5SMYeR528kiYFrw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'littlenest94.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'littlenest94',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'littlenest94.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '8804693290',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:8804693290:web:cbd50128a876a043c79a53',
};

export const firebaseApp = initializeApp(firebaseConfig);

/**
 * Offline persistence.
 *
 * Childminders work in parks, soft play and church halls where signal drops
 * out, so the cache is not a nicety — it is how the app stays usable. We use
 * `persistentLocalCache` (the modern replacement for the deprecated
 * `enableIndexedDbPersistence`) with the multi-tab manager, so a minder with
 * the dashboard open on a tablet and a phone shares one consistent cache.
 *
 * Reads resolve from IndexedDB while offline and writes queue locally, then
 * flush in order the moment connectivity returns.
 */
function createDb(): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (err) {
    // Private browsing and some embedded webviews block IndexedDB entirely.
    // The app still works — it just loses the offline cache.
    console.warn('[LittleNest] Offline persistence unavailable, falling back to memory cache.', err);
    return initializeFirestore(firebaseApp, {});
  }
}

export const db = createDb();
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);

/**
 * Local development against the Firebase emulator suite.
 *
 * Opt in with `VITE_USE_EMULATORS=1 npm run dev` alongside `npm run emulators`,
 * so day-to-day work and the end-to-end tests never touch live parent data.
 */
if (import.meta.env.VITE_USE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

/** Keep the session across app restarts so the PWA opens straight into the dashboard. */
void setPersistence(auth, browserLocalPersistence).catch(() => {
  /* Falls back to in-memory persistence — user simply signs in again. */
});
