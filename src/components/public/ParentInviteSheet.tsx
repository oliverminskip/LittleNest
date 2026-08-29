import { useState, type FormEvent } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ErrorNote, Field, TextInput } from '@/components/ui/Primitives';
import { friendlyAuthError, redeemInvite, signIn, signUp } from '@/services/firebase/auth';
import { auth } from '@/services/firebase/config';
import { paths } from '@/services/firebase/paths';
import { getDoc } from 'firebase/firestore';

/**
 * The parent's whole onboarding, in one sheet.
 *
 * Parents arrive from a text message with a code, on a phone, usually in a
 * hurry. The code is validated *before* an account is created, so a mistyped
 * code never leaves an orphaned auth user behind — and the child's name comes
 * back as confirmation that they typed the right one.
 */
export function ParentInviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'code' | 'account'>('code');
  const [code, setCode] = useState('');
  const [childName, setChildName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setStep('code');
    setCode('');
    setError(null);
    onClose();
  };

  const checkCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const snap = await getDoc(paths.invite(code));
      if (!snap.exists()) {
        setError("We couldn't find that code — please check it with your childminder.");
        return;
      }
      const invite = snap.data();
      if (invite.status === 'used') {
        setError('That code has already been used. Ask your childminder for a new one.');
        return;
      }
      setChildName(invite.childName ?? 'your child');
      setStep('account');
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const createAndLink = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = hasAccount ? await signIn(email, password) : await signUp(email, password, name);
      await redeemInvite(user, code);
      // <AuthProvider> re-hydrates from the auth listener and routes to the
      // parent view; nothing else to do here.
      close();
    } catch (err) {
      setError(friendlyAuthError(err));
      // Sign the half-created user back out so a retry starts clean.
      if (!hasAccount && auth.currentUser) await auth.signOut().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={step === 'code' ? 'Join with your invite code' : `Connect to ${childName}`}
    >
      {step === 'code' ? (
        <form onSubmit={checkCode}>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-sub">
            Your childminder will have sent you a code that looks like{' '}
            <span className="font-mono font-bold text-brand-600">LN-X4A2</span>. Pop it in below to
            see your child's daily diary, photos and learning journey.
          </p>

          {error ? <ErrorNote>{error}</ErrorNote> : null}

          <Field label="Invite code">
            <TextInput
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="LN-X4A2"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              className="text-center font-mono text-[22px] tracking-[3px]"
              required
            />
          </Field>

          <Button type="submit" size="lg" fullWidth loading={busy}>
            Check my code
          </Button>
          <div className="h-4" />
        </form>
      ) : (
        <form onSubmit={createAndLink}>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-moss/15 bg-moss-bg px-3.5 py-3">
            <span className="text-[20px]">✅</span>
            <p className="text-[13.5px] font-extrabold leading-snug text-moss">
              Code accepted — this will connect you to {childName}.
            </p>
          </div>

          {error ? <ErrorNote>{error}</ErrorNote> : null}

          {!hasAccount ? (
            <Field label="Your name">
              <TextInput
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Sophie Harper"
                autoComplete="name"
              />
            </Field>
          ) : null}

          <Field label="Email address">
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={hasAccount ? 'Your password' : 'At least 6 characters'}
              autoComplete={hasAccount ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </Field>

          <Button type="submit" size="lg" fullWidth loading={busy}>
            {hasAccount ? 'Sign in & connect' : 'Create account & connect'}
          </Button>

          <button
            type="button"
            onClick={() => setHasAccount((previous) => !previous)}
            className="mt-3 text-[13.5px] font-extrabold text-brand-600 underline underline-offset-2"
          >
            {hasAccount ? 'I need to create an account' : 'I already have a LittleNest account'}
          </button>
          <div className="h-4" />
        </form>
      )}
    </Sheet>
  );
}
