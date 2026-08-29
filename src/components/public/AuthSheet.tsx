import { useState, type FormEvent } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { ErrorNote, Field, TextInput } from '@/components/ui/Primitives';
import { friendlyAuthError, resetPassword, signIn, signUp } from '@/services/firebase/auth';

export type AuthMode = 'sign-in' | 'sign-up';

interface AuthSheetProps {
  mode: AuthMode | null;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
}

/**
 * Sign in / create account.
 *
 * Deliberately does not know about roles: a brand-new account lands in
 * onboarding, where they pick childminder or parent. That keeps this sheet
 * usable from every entry point on the landing page.
 */
export function AuthSheet({ mode, onClose, onSwitch }: AuthSheetProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'sign-up';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      // The auth listener in <AuthProvider> takes it from here and routes the
      // user to onboarding or straight to their dashboard.
      if (isSignUp) await signUp(email, password, name);
      else await signIn(email, password);
      onClose();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Pop your email address in first and we’ll send a reset link.');
      return;
    }
    try {
      await resetPassword(email);
      setError(null);
      setNotice('Reset link sent — check your inbox (and your spam folder).');
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  };

  return (
    <Sheet
      open={mode !== null}
      onClose={onClose}
      title={isSignUp ? 'Create your account' : 'Welcome back'}
    >
      <form onSubmit={submit}>
        <p className="mb-4 text-[14px] leading-relaxed text-ink-sub">
          {isSignUp
            ? 'One account for your whole setting. You’ll name it on the next step.'
            : 'Sign in to pick up exactly where you left off.'}
        </p>

        {error ? <ErrorNote>{error}</ErrorNote> : null}
        {notice ? (
          <p className="my-2 rounded-xl bg-moss-bg px-3.5 py-2.5 text-[13.5px] font-extrabold text-moss">
            {notice}
          </p>
        ) : null}

        {isSignUp ? (
          <Field label="Your name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Francesca Hill"
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
            placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={busy}>
          {isSignUp ? 'Create account' : 'Sign in'}
        </Button>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSwitch(isSignUp ? 'sign-in' : 'sign-up')}
            className="text-[13.5px] font-extrabold text-brand-600 underline underline-offset-2"
          >
            {isSignUp ? 'I already have an account' : 'Create an account'}
          </button>
          {!isSignUp ? (
            <button type="button" onClick={forgot} className="text-[13.5px] font-bold text-ink-sub underline">
              Forgot password?
            </button>
          ) : null}
        </div>
        <div className="h-4" />
      </form>
    </Sheet>
  );
}
