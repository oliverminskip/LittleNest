import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';
import { addDoc, arrayUnion, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth } from './config';
import { paths } from './paths';
import { DEFAULT_BILLING, DEFAULT_RATIO_LIMITS } from '@/lib/constants';
import type { UserProfile } from '@/types';

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return cred.user;
}

export async function signUp(email: string, password: string, displayName?: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  if (displayName?.trim()) await updateProfile(cred.user, { displayName: displayName.trim() });
  return cred.user;
}

export const signOut = () => fbSignOut(auth);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email.trim().toLowerCase());

export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(paths.user(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/** Creates the setting document and links the signed-in user to it as its childminder. */
export async function createSetting(user: User, settingName: string): Promise<string> {
  const ref = await addDoc(paths.settings(), {
    name: settingName.trim(),
    minderUid: user.uid,
    billing: DEFAULT_BILLING,
    ratioLimits: DEFAULT_RATIO_LIMITS,
    createdAt: serverTimestamp(),
  });

  const profile: UserProfile = {
    role: 'minder',
    name: user.displayName ?? '',
    email: user.email ?? '',
    settingId: ref.id,
  };
  await setDoc(paths.user(user.uid), { ...profile, createdAt: serverTimestamp() });
  return ref.id;
}

export class InviteError extends Error {}

/**
 * Redeems a parent invite code.
 *
 * The write order matters: the child document is updated first, because that
 * is what grants the parent read access under the Firestore rules. Burning the
 * code before granting access would strand the parent with a used code and no
 * child to read.
 */
export async function redeemInvite(user: User, rawCode: string): Promise<UserProfile> {
  const code = rawCode.trim().toUpperCase();
  const inviteSnap = await getDoc(paths.invite(code));

  if (!inviteSnap.exists()) throw new InviteError("We couldn't find that code — please double-check it.");
  const invite = inviteSnap.data();
  if (invite.status === 'used') throw new InviteError('That code has already been used.');

  const { settingId, childId } = invite as { settingId: string; childId: string };
  const email = (user.email ?? '').toLowerCase();

  await updateDoc(paths.child(settingId, childId), {
    parentUids: arrayUnion(user.uid),
    parentEmails: arrayUnion(email),
  });
  await updateDoc(paths.invite(code), {
    status: 'used',
    usedBy: user.uid,
    usedAt: serverTimestamp(),
  });

  const profile: UserProfile = {
    role: 'parent',
    name: user.displayName ?? '',
    email,
    settingId,
    childIds: [childId],
  };
  await setDoc(paths.user(user.uid), { ...profile, createdAt: serverTimestamp() });
  return profile;
}

/** Turns Firebase's auth error codes into something a parent at a school gate can act on. */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code?.replace('auth/', '') ?? '';
  const messages: Record<string, string> = {
    'invalid-email': "That email address doesn't look quite right.",
    'weak-password': 'Your password needs to be 6 characters or more.',
    'email-already-in-use': 'That email already has an account — try signing in instead.',
    'invalid-credential': 'Email or password not recognised.',
    'invalid-login-credentials': 'Email or password not recognised.',
    'user-not-found': 'Email or password not recognised.',
    'wrong-password': 'Email or password not recognised.',
    'too-many-requests': 'Too many attempts — please wait a moment and try again.',
    'network-request-failed': "We couldn't reach the network. Check your signal and try again.",
  };
  if (messages[code]) return messages[code];
  if (err instanceof InviteError) return err.message;
  return (err as Error)?.message ?? 'Something went wrong. Please try again.';
}
